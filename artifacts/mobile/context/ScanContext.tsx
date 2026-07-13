import * as Haptics from "expo-haptics";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import React, { createContext, useContext, useRef, useState } from "react";
import { Alert, Platform } from "react-native";
import { ConfettiAnimation } from "@/components/ConfettiAnimation";
import { DetectionResultModal } from "@/components/DetectionResultModal";
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

  function openScan() {
    if (Platform.OS === "web") {
      // Alert callbacks don't fire on web — go straight to gallery
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
    let asset: ImagePicker.ImagePickerAsset | null = null;
    try {
      let picked: ImagePicker.ImagePickerResult;
      if (fromCamera) {
        const { granted } = await ImagePicker.requestCameraPermissionsAsync();
        if (!granted) { Alert.alert("Permission needed", "Camera access is required to scan dogs."); return; }
        picked = await ImagePicker.launchCameraAsync({
          mediaTypes: "Images" as any,
          quality: 0.85,
          base64: true,
          allowsEditing: true,
          aspect: [1, 1],
        });
      } else {
        const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!granted) { Alert.alert("Permission needed", "Photo library access is required."); return; }
        picked = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: "Images" as any,
          quality: 0.85,
          base64: true,
          allowsEditing: true,
          aspect: [1, 1],
        });
      }

      if (picked.canceled || !picked.assets?.[0]) return;
      asset = picked.assets[0];
      setImageUri(asset.uri);
      setDetecting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      let base64Data: string;
      try {
        const manip = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1024 } }],
          { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true },
        );
        if (!manip.base64) throw new Error("no base64");
        base64Data = manip.base64;
      } catch {
        if (asset.base64) {
          base64Data = asset.base64;
        } else {
          Alert.alert("Image error", "Could not read image. Try again.");
          setDetecting(false);
          return;
        }
      }

      const res = await detectMutation.mutateAsync({
        data: { imageBase64: base64Data, mimeType: "image/jpeg" },
      });
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert("Detection failed", msg || "Could not analyze image. Try again.");
    } finally {
      setDetecting(false);
    }
  }

  return (
    <ScanContext.Provider
      value={{ openScan, isScanning: detecting, xpMessage, confettiActive }}
    >
      {children}
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
