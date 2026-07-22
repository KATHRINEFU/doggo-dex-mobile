import * as Haptics from "expo-haptics";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Alert, Platform } from "react-native";
import { ConfettiAnimation } from "@/components/ConfettiAnimation";
import { DetectionResultModal } from "@/components/DetectionResultModal";
import { ScanningOverlay } from "@/components/ScanningOverlay";
import { useCollection } from "@/context/CollectionContext";
import {
  useDetectDogBreed,
  useGetDogBreeds,
  useRecordCollection,
} from "@workspace/api-client-react";
import type { DetectBreedResult, DogBreed } from "@workspace/api-client-react";
import { detectBreedOnDevice } from "@/lib/BreedModel";

interface ScanContextValue {
  openScan: () => void;
  isScanning: boolean;
  xpMessage: string;
  confettiActive: boolean;
}

const ScanContext = createContext<ScanContextValue>({
  openScan: () => {},
  isScanning: false,
  xpMessage: "",
  confettiActive: false,
});

export function useScan() {
  return useContext(ScanContext);
}

function isHeicBase64(b64: string): boolean {
  try {
    const bytes = atob(b64.slice(0, 12));
    return bytes.slice(4, 8) === "ftyp";
  } catch {
    return false;
  }
}

const ERROR_RESULT: DetectBreedResult = {
  isDog: false,
  breedId: "",
  breedName: "",
  confidence: 0,
  description: "",
};

export function ScanProvider({ children }: { children: React.ReactNode }) {
  const { addDog, isCollected } = useCollection();
  const { data: allBreeds } = useGetDogBreeds();
  const detectMutation = useDetectDogBreed();
  const recordCollection = useRecordCollection();

  const [detecting, setDetecting] = useState(false);
  const [imageUri, setImageUri] = useState("");
  const [originalUri, setOriginalUri] = useState("");
  const [result, setResult] = useState<DetectBreedResult | null>(null);
  const [matchedBreed, setMatchedBreed] = useState<DogBreed | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const [xpMessage, setXpMessage] = useState("");
  const confettiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showError = useCallback((message: string, uri = "") => {
    setResult({ ...ERROR_RESULT, description: message });
    setMatchedBreed(null);
    setImageUri(uri);
    setModalVisible(true);
  }, []);

  const handleCollect = useCallback(async () => {
    if (!result || !matchedBreed || !result.breedId) return;
    const { isNew, xpGained } = await addDog({
      breedId: result.breedId,
      breedName: result.breedName,
      imageUri: originalUri || imageUri,
      collectedAt: new Date().toISOString(),
      confidence: result.confidence,
      description: result.description,
      rarity: matchedBreed.rarity,
    });
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    if (isNew) {
      setXpMessage(`+${xpGained} XP · New breed!`);
      setConfettiActive(true);
      if (confettiTimer.current) clearTimeout(confettiTimer.current);
      confettiTimer.current = setTimeout(() => {
        setConfettiActive(false);
        setXpMessage("");
      }, 3500);
      // Sync to leaderboard backend
      try {
        await recordCollection.mutateAsync({ data: { xpDelta: xpGained } });
      } catch (e) {
        console.error("Leaderboard sync failed:", e);
      }
    }
    setModalVisible(false);
  }, [result, matchedBreed, imageUri, originalUri, addDog, recordCollection]);

  function openScan() {
    if (Platform.OS === "web") {
      pickAndDetect(false);
      return;
    }
    Alert.alert("Scan a Dog", "How would you like to identify a breed?", [
      { text: "Take Photo", onPress: () => pickAndDetect(true) },
      { text: "Choose from Library", onPress: () => pickAndDetect(false) },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function pickAndDetect(fromCamera: boolean) {
    let pickedUri = "";
    const clientStart = Date.now();
    let phase: string | null = null;
    const logTiming = (label: string) => {
      const ms = Date.now() - clientStart;
      // eslint-disable-next-line no-console
      console.log(`[PawDex] ${label}: ${ms}ms`);
    };
    try {
      let asset: ImagePicker.ImagePickerAsset | null = null;

      const editOptions = Platform.OS === "web"
        ? {}
        : { allowsEditing: true as const, aspect: [1, 1] as [number, number] };

      phase = "permission";
      if (fromCamera) {
        const { granted } = await ImagePicker.requestCameraPermissionsAsync();
        if (!granted) {
          showError("Camera access is required to scan dogs. Please enable it in Settings.");
          return;
        }
        phase = "camera";
        const picked = await ImagePicker.launchCameraAsync({
          mediaTypes: "images",
          quality: 0.85,
          base64: true,
          ...editOptions,
        });
        if (picked.canceled || !picked.assets?.[0]) return;
        asset = picked.assets[0];
      } else {
        const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!granted) {
          showError("Photo library access is required. Please enable it in Settings.");
          return;
        }
        phase = "picker";
        const picked = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: "images",
          quality: 0.85,
          base64: true,
          ...editOptions,
        });
        if (picked.canceled || !picked.assets?.[0]) return;
        asset = picked.assets[0];
      }

      pickedUri = asset.uri;
      logTiming(`${phase} done`);
      setOriginalUri(asset.uri);

      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {}

      let base64Data: string;
      let displayUri = "";
      try {
        phase = "manip";
        // Native: resize to 384x384 (model input). Web: 1024 for server API.
        const targetSize = Platform.OS === "web" ? 1024 : 384;
        const manip = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: targetSize, height: targetSize } }],
          { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true },
        );
        if (!manip.base64) throw new Error("no base64");
        base64Data = manip.base64;
        displayUri = `data:image/jpeg;base64,${manip.base64}`;
      } catch {
        if (Platform.OS === "web") {
          try {
            phase = "heic";
            const heic2any = (await import("heic2any")).default;
            const resp = await fetch(asset.uri);
            const heicBlob = await resp.blob();
            const converted = await (heic2any as (opts: unknown) => Promise<Blob | Blob[]>)({
              blob: heicBlob,
              toType: "image/jpeg",
              quality: 0.82,
            });
            const jpegBlob = Array.isArray(converted) ? converted[0] : converted;
            displayUri = await new Promise<string>((res, rej) => {
              const fr = new FileReader();
              fr.onload = () => res(fr.result as string);
              fr.onerror = rej;
              fr.readAsDataURL(jpegBlob);
            });
            base64Data = displayUri.split(",")[1] ?? "";
            if (!base64Data) throw new Error("empty base64 after heic2any");
          } catch {
            if (!asset.base64) {
              showError("Could not read this image. Please try a different photo.", pickedUri);
              return;
            }
            base64Data = asset.base64;
          }
        } else {
          if (!asset.base64) {
            showError("Could not read this image. Please try a different photo.", pickedUri);
            return;
          }
          base64Data = asset.base64;
        }
      }

      logTiming(`${phase} done`);
      setImageUri(displayUri);
      setDetecting(true);

      let res: DetectBreedResult;
      try {
        // Native: try on-device TFLite first (instant, no network)
        if (Platform.OS !== "web") {
          phase = "device-detect";
          const deviceRes = await detectBreedOnDevice(base64Data);
          if (deviceRes && deviceRes.isDog && deviceRes.confidence >= 0.35) {
            res = deviceRes as unknown as DetectBreedResult;
            logTiming("detect done (on-device)");
          } else {
            throw new Error("on-device low confidence or no dog");
          }
        } else {
          // Web: always use server
          phase = "detect";
          res = await detectMutation.mutateAsync({
            data: { imageBase64: base64Data, mimeType: "image/jpeg" },
          });
          logTiming("detect done");
        }
      } catch (apiErr: unknown) {
        // If on-device failed on native, fall back to server
        if (Platform.OS !== "web") {
          try {
            phase = "detect";
            res = await detectMutation.mutateAsync({
              data: { imageBase64: base64Data, mimeType: "image/jpeg" },
            });
            logTiming("detect done (server fallback)");
          } catch (serverErr: unknown) {
            let msg = "Could not analyze the image. Please try again.";
            if (serverErr && typeof serverErr === "object") {
              const anyErr = serverErr as Record<string, unknown>;
              const responseData =
                (anyErr["response"] as Record<string, unknown> | undefined)?.["data"] ??
                (anyErr["data"] as unknown);
              if (
                responseData &&
                typeof responseData === "object" &&
                typeof (responseData as Record<string, unknown>)["message"] === "string"
              ) {
                msg = (responseData as Record<string, unknown>)["message"] as string;
              } else if (typeof anyErr["message"] === "string") {
                msg = anyErr["message"] as string;
              }
            }
            showError(msg, pickedUri);
            setDetecting(false);
            return;
          }
        } else {
          let msg = "Could not analyze the image. Please try again.";
          if (apiErr && typeof apiErr === "object") {
            const anyErr = apiErr as Record<string, unknown>;
            const responseData =
              (anyErr["response"] as Record<string, unknown> | undefined)?.["data"] ??
              (anyErr["data"] as unknown);
            if (
              responseData &&
              typeof responseData === "object" &&
              typeof (responseData as Record<string, unknown>)["message"] === "string"
            ) {
              msg = (responseData as Record<string, unknown>)["message"] as string;
            } else if (typeof anyErr["message"] === "string") {
              msg = anyErr["message"] as string;
            }
          }
          showError(msg, pickedUri);
          setDetecting(false);
          return;
        }
      }

      setResult(res);

      const found =
        res.breedId && allBreeds
          ? (allBreeds.find((b) => b.id === res.breedId) ?? null)
          : null;
      setMatchedBreed(found);
      logTiming("result ready");

      // Breed is NOT auto-collected — user taps "Save to PawDex" in the modal.

      setModalVisible(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      showError(msg, pickedUri);
    } finally {
      setDetecting(false);
    }
  }

  return (
    <ScanContext.Provider
      value={{
        openScan,
        isScanning: detecting,
        xpMessage,
        confettiActive,
      }}
    >
      {children}
      <ScanningOverlay visible={detecting} imageUri={imageUri} />
      <ConfettiAnimation active={confettiActive} />
      <DetectionResultModal
        visible={modalVisible}
        result={result}
        breed={matchedBreed}
        imageUri={imageUri}
        alreadyCollected={result ? isCollected(result.breedId ?? "") : false}
        onCollect={handleCollect}
        onClose={() => setModalVisible(false)}
      />
    </ScanContext.Provider>
  );
}
