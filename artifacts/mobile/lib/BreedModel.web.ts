/**
 * Web stub — on-device TFLite is native-only.
 * The web preview always falls back to the server API (/api/dogs/detect).
 */

export interface BreedPrediction {
  isDog: boolean;
  breedId: string;
  breedName: string;
  confidence: number;
  description: string;
}

export async function initBreedModel(): Promise<void> {
  // no-op on web
}

export async function detectBreedOnDevice(
  _jpegBase64: string,
): Promise<BreedPrediction | null> {
  return null; // always use server on web
}

export function isOnDeviceAvailable(): boolean {
  return false;
}
