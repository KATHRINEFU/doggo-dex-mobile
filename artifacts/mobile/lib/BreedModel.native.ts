/**
 * On-device TFLite breed detection.
 *
 * - Runs the EfficientNetV2-S model locally via react-native-fast-tflite.
 * - Core ML delegate on iOS (ANE), Android GPU delegate on Android.
 * - Web preview falls back to server-side /api/dogs/detect.
 *
 * Model contract (confirmed from training notebook):
 *   Input : [1, 384, 384, 3] float32, pixel range [0, 255] (NO normalization).
 *   Output: [1, 120] float32, already softmax probabilities.
 *   Resize: stretch to exactly 384x384 (not aspect-ratio preserved).
 *
 * On-device timing budget (warm model, iPhone 13+):
 *   expo-image-manipulator resize   ~30–50 ms  (done in ScanContext before this)
 *   Buffer.from base64 decode        ~2–5 ms
 *   jpeg-js JPEG decode (384×384)   ~30–80 ms  (pure JS, main bottleneck here)
 *   Float32Array RGB copy           ~3–8 ms
 *   TFLite Core ML inference       ~80–200 ms  (float32; float16 would be faster)
 *   ─────────────────────────────────────────
 *   Total (warm)                  ~150–350 ms  → well under 1 s
 *
 * Note: float16 model (~43 MB) gives better ANE utilisation; current model is
 * float32 (78 MB) which Core ML still accelerates but some ops may fall to CPU.
 */

import { Platform } from "react-native";
import * as jpeg from "jpeg-js";
import {
  loadTensorflowModel,
  type TfliteModel,
  type TensorflowModelDelegate,
} from "react-native-fast-tflite";

// Breed metadata loaded from bundled JSON
const LABELS: string[] = require("../assets/ml/labels.json");
const INDEX_TO_ID: (string | null)[] = require("../assets/ml/breed_index_to_id.json");

let model: TfliteModel | null = null;
let modelLoadPromise: Promise<void> | null = null;

const TFLITE_CONFIDENCE_THRESHOLD = 0.35;
const INPUT_SIZE = 384;
const NUM_CLASSES = 120;

export interface BreedPrediction {
  isDog: boolean;
  breedId: string;
  breedName: string;
  confidence: number;
  description: string;
  timingMs?: {
    decode: number;
    inference: number;
    total: number;
  };
}

/**
 * Load the TFLite model once and warm it with a dummy input.
 * Call this at app startup (e.g. from _layout.tsx useEffect).
 */
export async function initBreedModel(): Promise<void> {
  if (modelLoadPromise) return modelLoadPromise;
  if (Platform.OS === "web") return;

  modelLoadPromise = (async () => {
    try {
      const t0 = Date.now();

      const delegates: TensorflowModelDelegate[] =
        Platform.OS === "ios"
          ? ["core-ml"]
          : Platform.OS === "android"
            ? ["android-gpu"]
            : [];

      model = await loadTensorflowModel(
        require("../assets/ml/dog_breed_classifier.tflite"),
        delegates,
      );

      console.log(`[BreedModel] model loaded in ${Date.now() - t0} ms (delegates: ${delegates.join(",") || "none"})`);

      // Warm-up: Core ML compiles a Metal shader on first run — do it at startup
      // so the first real scan is fast.
      const dummy = new Float32Array(INPUT_SIZE * INPUT_SIZE * 3).fill(128);
      const tw = Date.now();
      await model.run([dummy.buffer as ArrayBuffer]);
      console.log(`[BreedModel] warm-up done in ${Date.now() - tw} ms`);
    } catch (err) {
      console.error("[BreedModel] load failed:", err);
      model = null;
    }
  })();

  return modelLoadPromise;
}

/**
 * Decode a JPEG (base64 string) to raw RGB Float32Array [0, 255].
 * Uses Buffer.from for fast native base64 decode (no charCodeAt loop).
 */
function decodeJpegToRgbFloat32(base64: string): Float32Array {
  // Native Buffer.from is ~10× faster than atob + charCodeAt loop
  const bytes: Uint8Array = Buffer.from(base64, "base64");

  const decoded = jpeg.decode(bytes, {
    useTArray: true,
    formatAsRGBA: true,
  });

  const { width, height, data } = decoded;
  const out = new Float32Array(INPUT_SIZE * INPUT_SIZE * 3);

  // Fast path: image was already resized to 384×384 by expo-image-manipulator
  if (width === INPUT_SIZE && height === INPUT_SIZE) {
    let j = 0;
    for (let i = 0; i < data.length; i += 4) {
      out[j++] = data[i];       // R
      out[j++] = data[i + 1];   // G
      out[j++] = data[i + 2];   // B
      // skip A
    }
    return out;
  }

  // Slow path: fallback nearest-neighbour stretch resize to 384×384
  // (should rarely trigger — ScanContext already resizes via manipulator)
  const xRatio = width / INPUT_SIZE;
  const yRatio = height / INPUT_SIZE;
  let outIdx = 0;
  for (let y = 0; y < INPUT_SIZE; y++) {
    const srcY = Math.min(Math.floor(y * yRatio), height - 1);
    for (let x = 0; x < INPUT_SIZE; x++) {
      const srcX = Math.min(Math.floor(x * xRatio), width - 1);
      const srcIdx = (srcY * width + srcX) * 4;
      out[outIdx++] = data[srcIdx];       // R
      out[outIdx++] = data[srcIdx + 1];   // G
      out[outIdx++] = data[srcIdx + 2];   // B
    }
  }
  return out;
}

/**
 * Run on-device inference on a JPEG base64 string.
 * Returns null if model unavailable or inference fails (caller falls back to server).
 */
export async function detectBreedOnDevice(
  jpegBase64: string,
): Promise<BreedPrediction | null> {
  if (!model) return null;

  try {
    const tTotal = Date.now();

    // --- Decode JPEG → Float32Array ---
    const tDecode = Date.now();
    const input = decodeJpegToRgbFloat32(jpegBase64);
    const decodeMs = Date.now() - tDecode;

    // --- TFLite inference ---
    const tInfer = Date.now();
    const outputs = await model.run([input.buffer as ArrayBuffer]);
    const inferMs = Date.now() - tInfer;

    // --- Argmax over 120 breed probabilities ---
    const probs = new Float32Array(outputs[0]);
    let bestIdx = 0;
    let bestScore = probs[0];
    for (let i = 1; i < NUM_CLASSES; i++) {
      if (probs[i] > bestScore) {
        bestScore = probs[i];
        bestIdx = i;
      }
    }

    const totalMs = Date.now() - tTotal;
    console.log(
      `[BreedModel] decode=${decodeMs}ms  infer=${inferMs}ms  total=${totalMs}ms` +
      `  top1=${LABELS[bestIdx]}  conf=${(bestScore * 100).toFixed(1)}%`,
    );

    const confidence = bestScore;
    const isDog = confidence > TFLITE_CONFIDENCE_THRESHOLD;
    const breedId = INDEX_TO_ID[bestIdx] ?? "";
    const breedName = LABELS[bestIdx] ?? "Unknown";

    return {
      isDog,
      breedId,
      breedName,
      confidence,
      description: isDog
        ? `Looks like a ${breedName.replace(/_/g, " ")}!`
        : "No dog detected in this image.",
      timingMs: { decode: decodeMs, inference: inferMs, total: totalMs },
    };
  } catch (err) {
    console.error("[BreedModel] inference failed:", err);
    return null;
  }
}

/**
 * Whether on-device inference is available on this platform.
 */
export function isOnDeviceAvailable(): boolean {
  return Platform.OS !== "web" && model !== null;
}
