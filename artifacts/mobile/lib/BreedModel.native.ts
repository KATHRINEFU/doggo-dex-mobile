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
 */

import { Platform } from "react-native";
import * as jpeg from "jpeg-js";
import {
  loadTensorflowModel,
  type TfliteModel,
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
}

/**
 * Load the TFLite model once and warm it with a dummy input.
 * Call this at app startup (e.g. from _layout.tsx useEffect).
 */
export async function initBreedModel(): Promise<void> {
  if (modelLoadPromise) return modelLoadPromise;
  if (Platform.OS === "web") return; // server-only on web

  modelLoadPromise = (async () => {
    try {
      const delegates =
        Platform.OS === "ios"
          ? (["core-ml"] as const)
          : Platform.OS === "android"
            ? (["android-gpu"] as const)
            : ([] as const);

      model = await loadTensorflowModel(
        require("../assets/ml/dog_breed_classifier.tflite"),
        delegates as unknown as ("core-ml" | "android-gpu")[]
      );

      // Warm-up: first Core ML compile is slow; do it here so real scans feel instant
      const dummy = new Float32Array(INPUT_SIZE * INPUT_SIZE * 3);
      dummy.fill(128.0);
      await model.run([dummy.buffer]);
    } catch (err) {
      console.error("[BreedModel] load failed:", err);
      model = null;
    }
  })();

  return modelLoadPromise;
}

/**
 * Decode a JPEG (base64 string) to raw RGB Float32Array [0,255].
 */
function decodeJpegToRgbFloat32(base64: string): Float32Array {
  // Base64 → Uint8Array
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const decoded = jpeg.decode(bytes, {
    useTArray: true,
    formatAsRGBA: true,
  });

  const { width, height, data } = decoded;
  const targetSize = INPUT_SIZE * INPUT_SIZE * 3;
  const out = new Float32Array(targetSize);

  // If already 384x384, copy RGB directly (skip alpha)
  if (width === INPUT_SIZE && height === INPUT_SIZE) {
    let j = 0;
    for (let i = 0; i < data.length; i += 4) {
      out[j++] = data[i];     // R
      out[j++] = data[i + 1]; // G
      out[j++] = data[i + 2]; // B
    }
    return out;
  }

  // Stretch resize (bilinear-ish) to exactly 384x384
  const xRatio = width / INPUT_SIZE;
  const yRatio = height / INPUT_SIZE;
  let outIdx = 0;
  for (let y = 0; y < INPUT_SIZE; y++) {
    const srcY = Math.min(Math.floor(y * yRatio), height - 1);
    for (let x = 0; x < INPUT_SIZE; x++) {
      const srcX = Math.min(Math.floor(x * xRatio), width - 1);
      const srcIdx = (srcY * width + srcX) * 4;
      out[outIdx++] = data[srcIdx];     // R
      out[outIdx++] = data[srcIdx + 1]; // G
      out[outIdx++] = data[srcIdx + 2]; // B
    }
  }
  return out;
}

/**
 * Run on-device inference on a JPEG base64 string.
 * Returns null if model unavailable or inference fails.
 */
export async function detectBreedOnDevice(
  jpegBase64: string
): Promise<BreedPrediction | null> {
  if (!model) return null;

  try {
    const input = decodeJpegToRgbFloat32(jpegBase64);
    const outputs = await model.run([input.buffer as ArrayBuffer]);
    const probs = new Float32Array(outputs[0]);

    // argmax
    let bestIdx = 0;
    let bestScore = probs[0];
    for (let i = 1; i < NUM_CLASSES; i++) {
      if (probs[i] > bestScore) {
        bestScore = probs[i];
        bestIdx = i;
      }
    }

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
