import * as Haptics from "expo-haptics";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Alert, Platform } from "react-native";
import { ConfettiAnimation } from "@/components/ConfettiAnimation";
import { DetectionResultModal } from "@/components/DetectionResultModal";
import { ScanningOverlay } from "@/components/ScanningOverlay";
import { useCollection } from "@/context/CollectionContext";
import { useDetectDogBreed, useGetDogBreeds } from "@workspace/api-client-react";
import type { DetectBreedResult, DogBreed } from "@workspace/api-client-react";

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

// Detect HEIC by magic bytes — "ftyp" at byte offset 4.
// Works in both RN and web environments (atob is available in both).
function isHeicBase64(b64: string): boolean {
  try {
    // Each base64 char = 6 bits; 12 chars = 9 bytes (more than enough for offset 4-8)
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

  const [detecting, setDetecting] = useState(false);
  const [imageUri, setImageUri] = useState("");
  const [result, setResult] = useState<DetectBreedResult | null>(null);
  const [matchedBreed, setMatchedBreed] = useState<DogBreed | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const [xpMessage, setXpMessage] = useState("");
  const confettiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show an error inside the result modal — works on all platforms.
  const showError = useCallback((message: string, uri = "") => {
    setResult({ ...ERROR_RESULT, description: message });
    setMatchedBreed(null);
    setImageUri(uri);
    setModalVisible(true);
  }, []);

  function openScan() {
    if (Platform.OS === "web") {
      // Alert callbacks don't fire reliably on web — go straight to gallery.
      pickAndDetect(false);
      return;
    }
    Alert.alert("Scan a Dog", "How would you like to identify a breed?", [
      { text: "📷  Take Photo", onPress: () => pickAndDetect(true) },
      { text: "🖼️  Choose from Library", onPress: () => pickAndDetect(false) },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function pickAndDetect(fromCamera: boolean) {
    let pickedUri = "";
    try {
      let asset: ImagePicker.ImagePickerAsset | null = null;

      // On web, allowsEditing:true prevents asset.base64 from being populated,
      // so we disable it on web and rely on ImageManipulator for cropping/resizing.
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
          mediaTypes: "Images" as any,
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
        const picked = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: "Images" as any,
          quality: 0.85,
          base64: true,
          ...editOptions,
        });
        if (picked.canceled || !picked.assets?.[0]) return;
        asset = picked.assets[0];
      }

      pickedUri = asset.uri;

      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {}

      // --- Convert to JPEG first, then show overlay ---
      // On web, Chrome cannot decode HEIC in <img> or Canvas, so we must attempt
      // JPEG conversion before opening the overlay. If conversion fails (HEIC on web),
      // the overlay opens with the 🐕 placeholder — the server handles HEIC via heic-convert.
      let base64Data: string;
      let displayUri = ""; // empty = show placeholder in overlay
      try {
        const manip = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1024 } }],
          { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true },
        );
        if (!manip.base64) throw new Error("no base64");
        base64Data = manip.base64;
        displayUri = `data:image/jpeg;base64,${manip.base64}`;
      } catch {
        // ImageManipulator failed — likely HEIC on web (Chrome Canvas can't decode HEIC).
        // Try heic2any to convert in the browser before falling back to placeholder.
        if (Platform.OS === "web") {
          try {
            const heic2any = (await import("heic2any")).default;
            const resp = await fetch(asset.uri);
            const heicBlob = await resp.blob();
            const converted = await (heic2any as (opts: unknown) => Promise<Blob | Blob[]>)({
              blob: heicBlob,
              toType: "image/jpeg",
              quality: 0.82,
            });
            const jpegBlob = Array.isArray(converted) ? converted[0] : converted;
            // Read as data URL for overlay display
            displayUri = await new Promise<string>((res, rej) => {
              const fr = new FileReader();
              fr.onload = () => res(fr.result as string);
              fr.onerror = rej;
              fr.readAsDataURL(jpegBlob);
            });
            // Extract base64 for the API (strip the data:image/jpeg;base64, prefix)
            base64Data = displayUri.split(",")[1] ?? "";
            if (!base64Data) throw new Error("empty base64 after heic2any");
          } catch {
            // heic2any also failed — send raw bytes to server, show placeholder
            if (!asset.base64) {
              showError("Could not read this image. Please try a different photo.", pickedUri);
              return;
            }
            base64Data = asset.base64;
            // displayUri stays "" → overlay shows 🐕 placeholder
          }
        } else {
          if (!asset.base64) {
            showError("Could not read this image. Please try a different photo.", pickedUri);
            return;
          }
          base64Data = asset.base64;
        }
      }

      setImageUri(displayUri);
      setDetecting(true);

      // --- Send to API ---
      let res: DetectBreedResult;
      try {
        res = await detectMutation.mutateAsync({
          data: { imageBase64: base64Data, mimeType: "image/jpeg" },
        });
      } catch (apiErr: unknown) {
        // Extract message from API error response if available.
        let msg = "Could not analyze the image. Please try again.";
        if (apiErr && typeof apiErr === "object") {
          const anyErr = apiErr as Record<string, unknown>;
          // Axios / fetch error shapes
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

      setResult(res);

      const found =
        res.breedId && allBreeds
          ? (allBreeds.find((b) => b.id === res.breedId) ?? null)
          : null;
      setMatchedBreed(found);

      if (res.isDog && res.confidence >= 0.7 && res.breedId && found) {
        const { isNew, xpGained } = await addDog({
          breedId: res.breedId,
          breedName: res.breedName,
          imageUri: asset.uri,
          collectedAt: new Date().toISOString(),
          confidence: res.confidence,
          description: res.description,
          rarity: found.rarity,
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
        } else {
          setXpMessage("Already in your DogDex!");
          setTimeout(() => setXpMessage(""), 2500);
        }
      }

      setModalVisible(true);
    } catch (err) {
      // Unexpected error — show in modal, not alert.
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      showError(msg, pickedUri);
    } finally {
      setDetecting(false);
    }
  }

  return (
    <ScanContext.Provider value={{ openScan, isScanning: detecting, xpMessage, confettiActive }}>
      {children}
      <ScanningOverlay visible={detecting} imageUri={imageUri} />
      <ConfettiAnimation active={confettiActive} />
      <DetectionResultModal
        visible={modalVisible}
        result={result}
        breed={matchedBreed}
        imageUri={imageUri}
        alreadyCollected={result ? isCollected(result.breedId ?? "") : false}
        onCollect={() => setModalVisible(false)}
        onClose={() => setModalVisible(false)}
      />
    </ScanContext.Provider>
  );
}
