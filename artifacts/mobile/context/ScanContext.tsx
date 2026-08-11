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

export interface LiveCameraPhoto {
  uri: string;
  base64?: string;
}

interface ScanContextValue {
  openScan: () => void;
  openCameraScan: () => void;
  registerCameraCapture: (capture: () => Promise<LiveCameraPhoto | undefined>) => () => void;
  isScanning: boolean;
  xpMessage: string;
  confettiActive: boolean;
}

const ScanContext = createContext<ScanContextValue>({
  openScan: () => {},
  openCameraScan: () => {},
  registerCameraCapture: () => () => {},
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
  const [usingGptFallback, setUsingGptFallback] = useState(false);
  const [imageUri, setImageUri] = useState("");
  const [originalUri, setOriginalUri] = useState("");
  const [result, setResult] = useState<DetectBreedResult | null>(null);
  const [matchedBreed, setMatchedBreed] = useState<DogBreed | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const [xpMessage, setXpMessage] = useState("");
  const confettiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraCaptureRef = useRef<(() => Promise<LiveCameraPhoto | undefined>) | null>(null);
  const scanIdRef = useRef(0);

  const showError = useCallback((message: string, uri = "") => {
    setResult({ ...ERROR_RESULT, description: message });
    setMatchedBreed(null);
    setImageUri(uri);
    setDetecting(false);
    setUsingGptFallback(false);
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

  const registerCameraCapture = useCallback(
    (capture: () => Promise<LiveCameraPhoto | undefined>) => {
      cameraCaptureRef.current = capture;
      return () => {
        if (cameraCaptureRef.current === capture) {
          cameraCaptureRef.current = null;
        }
      };
    },
    [],
  );

  async function processImage(asset: LiveCameraPhoto) {
    const scanId = ++scanIdRef.current;
    const isActiveScan = () => scanIdRef.current === scanId;
    let pickedUri = asset.uri;
    const clientStart = Date.now();
    let phase: string | null = null;
    const logTiming = (label: string) => {
      const ms = Date.now() - clientStart;
      // eslint-disable-next-line no-console
      console.log(`[DoggoDex] ${label}: ${ms}ms`);
    };
    try {
      const editOptions = Platform.OS === "web"
        ? {}
        : { allowsEditing: true as const, aspect: [1, 1] as [number, number] };
      setOriginalUri(asset.uri);
      logTiming("photo captured");

      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {}

      let base64Data: string;
      let displayUri = asset.uri;

      // On native, skip expo-image-manipulator — it can take 10+ seconds on
      // high-resolution camera photos. Send the picker's base64 directly to the
      // server, which handles orientation and resizing properly.
      // Use the file URI for display — NOT the base64 string. Passing a 50MB+
      // base64 data URI as a React prop chokes the JS bridge and freezes the app.
      if (Platform.OS !== "web" && asset.base64) {
        phase = "native-b64";
        base64Data = asset.base64;
        displayUri = asset.uri; // file:// URI — lightweight, renders fine on native
        logTiming("native-b64 done (skip manipulator)");
      } else {
        // Web: resize to 1024 via manipulator for the server API.
        try {
          phase = "manip";
          const manip = await ImageManipulator.manipulateAsync(
            asset.uri,
            [{ resize: { width: 1024, height: 1024 } }],
            { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true },
          );
          if (!manip.base64) throw new Error("no base64");
          base64Data = manip.base64;
          displayUri = `data:image/jpeg;base64,${manip.base64}`;
        } catch {
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
        }
        logTiming(`${phase} done`);
      }
      if (!isActiveScan()) return;
      setImageUri(displayUri);
      setDetecting(true);
      setUsingGptFallback(false);

      let res: DetectBreedResult | null = null;

      // Native: try the on-device TFLite model first, but accuracy-first —
      // only trust it when highly confident; otherwise defer to the server.
      if (Platform.OS !== "web") {
        try {
          phase = "device-detect";
          const deviceRes = await detectBreedOnDevice(base64Data);
          if (!isActiveScan()) return;
          // TTA-averaged confidence is better calibrated — accept at 60%+.
          if (deviceRes && deviceRes.isDog && deviceRes.confidence >= 0.6) {
            res = deviceRes as unknown as DetectBreedResult;
            logTiming("detect done (on-device)");
          }
        } catch {
          // fall through to server
        }
      }

      try {
        if (!res) {
          // Server pipeline: proper image handling + GPT Vision fallback.
          phase = "detect";
          setUsingGptFallback(true);
          res = await detectMutation.mutateAsync({
            data: { imageBase64: base64Data, mimeType: "image/jpeg" },
          });
          if (!isActiveScan()) return;
          logTiming("detect done (server)");
        }
      } catch (apiErr: unknown) {
        if (!isActiveScan()) return;
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
        return;
      }

      if (!isActiveScan()) return;
      setResult(res);

      const found =
        res.breedId && allBreeds
          ? (allBreeds.find((b) => b.id === res.breedId) ?? null)
          : null;
      setMatchedBreed(found);
      logTiming("result ready");

      setDetecting(false);
      setUsingGptFallback(false);
      setModalVisible(true);
    } catch (err) {
      if (!isActiveScan()) return;
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      showError(msg, pickedUri);
    }
  }

  const cancelAnalysis = useCallback(() => {
    // Invalidate the request immediately. The underlying fetch may finish in
    // the background, but its response can no longer update this scan UI.
    scanIdRef.current += 1;
    setDetecting(false);
    setUsingGptFallback(false);
  }, []);

  async function pickAndDetect(fromCamera: boolean) {
    let pickedUri = "";
    try {
      const editOptions = Platform.OS === "web"
        ? {}
        : { allowsEditing: true as const, aspect: [1, 1] as [number, number] };

      if (fromCamera) {
        const { granted } = await ImagePicker.requestCameraPermissionsAsync();
        if (!granted) {
          showError("Camera access is required to scan dogs. Please enable it in Settings.");
          return;
        }
        const picked = await ImagePicker.launchCameraAsync({
          mediaTypes: "images",
          quality: 0.85,
          base64: true,
          ...editOptions,
        });
        if (picked.canceled || !picked.assets?.[0]) return;
        pickedUri = picked.assets[0].uri;
        await processImage({
          uri: picked.assets[0].uri,
          base64: picked.assets[0].base64 ?? undefined,
        });
      } else {
        const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!granted) {
          showError("Photo library access is required. Please enable it in Settings.");
          return;
        }
        const picked = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: "images",
          quality: 0.85,
          base64: true,
          ...editOptions,
        });
        if (picked.canceled || !picked.assets?.[0]) return;
        pickedUri = picked.assets[0].uri;
        await processImage({
          uri: picked.assets[0].uri,
          base64: picked.assets[0].base64 ?? undefined,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      showError(msg, pickedUri);
    }
  }

  async function openCameraScan() {
    if (Platform.OS === "web") {
      await pickAndDetect(false);
      return;
    }

    const capture = cameraCaptureRef.current;
    if (capture) {
      try {
        const photo = await capture();
        if (photo) {
          await processImage(photo);
          return;
        }
      } catch (err) {
        console.warn("[DoggoDex] live camera capture failed; opening camera picker", err);
      }
    }

    // Fallback for a camera preview that has not mounted yet or an older build.
    await pickAndDetect(true);
  }

  return (
    <ScanContext.Provider
      value={{
        openScan,
        openCameraScan,
        registerCameraCapture,
        isScanning: detecting,
        xpMessage,
        confettiActive,
      }}
    >
      {children}
      <ScanningOverlay
        visible={detecting}
        imageUri={imageUri}
        usingGptFallback={usingGptFallback}
        onCancel={cancelAnalysis}
      />
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
