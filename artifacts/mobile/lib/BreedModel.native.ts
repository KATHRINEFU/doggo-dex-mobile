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
 *   expo-image-picker (quality 0.5)  ~0 ms extra (base64 returned by picker)
 *   atob base64 decode               ~5–15 ms
 *   jpeg-js JPEG decode (full-res)  ~50–200 ms  (pure JS; scales with file size)
 *   Nearest-neighbour JS resize     ~5–20 ms   (INPUT_SIZE² iterations)
 *   Float32Array RGB copy           ~3–8 ms
 *   TFLite Core ML inference       ~80–200 ms  (float32; float16 would be faster)
 *   ─────────────────────────────────────────
 *   Total (warm)                  ~150–450 ms  → well under 2 s
 *
 * Key: ScanContext no longer calls expo-image-manipulator on native (was 10+ s).
 * Instead it passes picker base64 directly; decodeJpegToRgbFloat32 resizes here.
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

      const preferredDelegates: TensorflowModelDelegate[] =
        Platform.OS === "ios"
          ? ["core-ml"]
          : Platform.OS === "android"
            ? ["android-gpu"]
            : [];

      // Try preferred delegate first, fall back to CPU if unavailable
      try {
        model = await loadTensorflowModel(
          require("../assets/ml/dog_breed_classifier.tflite"),
          preferredDelegates,
        );
        console.log(`[BreedModel] model loaded in ${Date.now() - t0} ms (delegates: ${preferredDelegates.join(",") || "none"})`);
      } catch (delegateErr) {
        console.warn(`[BreedModel] delegate load failed, retrying with CPU:`, delegateErr);
        model = await loadTensorflowModel(
          require("../assets/ml/dog_breed_classifier.tflite"),
          [],
        );
        console.log(`[BreedModel] model loaded in ${Date.now() - t0} ms (delegates: cpu-fallback)`);
      }

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
 * Extract the EXIF orientation tag (1–8) from raw JPEG bytes. Returns 1
 * (normal) if not found. jpeg-js ignores EXIF, so we must apply it ourselves —
 * iPhone photos are frequently stored rotated with orientation 3/6/8, and the
 * server path (PIL) auto-applies it, so on-device must match.
 */
function getExifOrientation(bytes: Uint8Array): number {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return 1;
  let offset = 2;
  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1];
    const size = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (marker === 0xe1 && offset + 10 < bytes.length) {
      // APP1 — check for "Exif\0\0"
      if (
        bytes[offset + 4] === 0x45 && bytes[offset + 5] === 0x78 &&
        bytes[offset + 6] === 0x69 && bytes[offset + 7] === 0x66 &&
        bytes[offset + 8] === 0x00 && bytes[offset + 9] === 0x00
      ) {
        const tiff = offset + 10;
        const little = bytes[tiff] === 0x49 && bytes[tiff + 1] === 0x49;
        const read16 = (p: number) =>
          little ? bytes[p] | (bytes[p + 1] << 8) : (bytes[p] << 8) | bytes[p + 1];
        const read32 = (p: number) =>
          little
            ? bytes[p] | (bytes[p + 1] << 8) | (bytes[p + 2] << 16) | (bytes[p + 3] << 24)
            : (bytes[p] << 24) | (bytes[p + 1] << 16) | (bytes[p + 2] << 8) | bytes[p + 3];
        const ifd0 = tiff + read32(tiff + 4);
        if (ifd0 + 2 > bytes.length) return 1;
        const numEntries = read16(ifd0);
        for (let i = 0; i < numEntries; i++) {
          const entry = ifd0 + 2 + i * 12;
          if (entry + 12 > bytes.length) return 1;
          if (read16(entry) === 0x0112) {
            const v = read16(entry + 8);
            return v >= 1 && v <= 8 ? v : 1;
          }
        }
      }
      return 1;
    }
    if (marker === 0xda || marker === 0xd9) break; // start of scan / EOI
    offset += 2 + size;
  }
  return 1;
}

/**
 * Decode a JPEG (base64 string) to a 384×384 raw RGB Float32Array [0, 255].
 *
 * Preprocessing must match the server path (PIL: EXIF auto-orient + LANCZOS
 * stretch to 384×384). We approximate LANCZOS with box-average (area)
 * downsampling — nearest-neighbour caused severe aliasing that produced
 * "wiry-hair" artifacts and gross misclassifications (e.g. corgi → silky
 * terrier). Uses atob (available in Hermes; Buffer is not).
 */
function decodeJpegToRgbFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const orientation = getExifOrientation(bytes);

  const decoded = jpeg.decode(bytes, {
    useTArray: true,
    formatAsRGBA: true,
  });

  const { width, height, data } = decoded;
  const out = new Float32Array(INPUT_SIZE * INPUT_SIZE * 3);

  // Oriented (display) dimensions — orientations 5–8 swap width/height.
  const swapped = orientation >= 5;
  const oW = swapped ? height : width;
  const oH = swapped ? width : height;

  // Map oriented (x, y) → raw pixel index. Standard EXIF transforms.
  const rawIndex = (ox: number, oy: number): number => {
    let rx: number, ry: number;
    switch (orientation) {
      case 2: rx = width - 1 - ox; ry = oy; break;               // mirror H
      case 3: rx = width - 1 - ox; ry = height - 1 - oy; break;  // rotate 180
      case 4: rx = ox; ry = height - 1 - oy; break;              // mirror V
      case 5: rx = oy; ry = ox; break;                           // transpose
      case 6: rx = oy; ry = height - 1 - ox; break;              // rotate 90 CW
      case 7: rx = width - 1 - oy; ry = height - 1 - ox; break;  // transverse
      case 8: rx = width - 1 - oy; ry = ox; break;               // rotate 90 CCW
      default: rx = ox; ry = oy;
    }
    return (ry * width + rx) * 4;
  };

  // Box-average (area) stretch resize oriented image → 384×384.
  const xRatio = oW / INPUT_SIZE;
  const yRatio = oH / INPUT_SIZE;
  let outIdx = 0;
  for (let y = 0; y < INPUT_SIZE; y++) {
    const sy0 = Math.floor(y * yRatio);
    const sy1 = Math.max(sy0 + 1, Math.min(Math.ceil((y + 1) * yRatio), oH));
    for (let x = 0; x < INPUT_SIZE; x++) {
      const sx0 = Math.floor(x * xRatio);
      const sx1 = Math.max(sx0 + 1, Math.min(Math.ceil((x + 1) * xRatio), oW));
      let r = 0, g = 0, b = 0, n = 0;
      if (orientation === 1) {
        // Fast path: no coordinate remap — inline index math.
        for (let sy = sy0; sy < sy1; sy++) {
          let idx = (sy * width + sx0) * 4;
          for (let sx = sx0; sx < sx1; sx++, idx += 4) {
            r += data[idx];
            g += data[idx + 1];
            b += data[idx + 2];
            n++;
          }
        }
      } else {
        for (let sy = sy0; sy < sy1; sy++) {
          for (let sx = sx0; sx < sx1; sx++) {
            const idx = rawIndex(sx, sy);
            r += data[idx];
            g += data[idx + 1];
            b += data[idx + 2];
            n++;
          }
        }
      }
      out[outIdx++] = r / n;
      out[outIdx++] = g / n;
      out[outIdx++] = b / n;
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

    // --- TFLite inference with test-time augmentation (horizontal flip) ---
    // The model was trained with random_flip_left_right augmentation, so
    // averaging predictions over the image and its mirror measurably improves
    // accuracy and confidence calibration at the cost of one extra pass.
    const tInfer = Date.now();
    const outputs = await model.run([input.buffer as ArrayBuffer]);

    const flipped = new Float32Array(input.length);
    for (let y = 0; y < INPUT_SIZE; y++) {
      const row = y * INPUT_SIZE * 3;
      for (let x = 0; x < INPUT_SIZE; x++) {
        const src = row + x * 3;
        const dst = row + (INPUT_SIZE - 1 - x) * 3;
        flipped[dst] = input[src];
        flipped[dst + 1] = input[src + 1];
        flipped[dst + 2] = input[src + 2];
      }
    }
    const outputsFlip = await model.run([flipped.buffer as ArrayBuffer]);
    const inferMs = Date.now() - tInfer;

    // --- Average probabilities, then argmax over 120 breeds ---
    const probsA = new Float32Array(outputs[0]);
    const probsB = new Float32Array(outputsFlip[0]);
    const probs = new Float32Array(NUM_CLASSES);
    for (let i = 0; i < NUM_CLASSES; i++) {
      probs[i] = (probsA[i] + probsB[i]) / 2;
    }
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
