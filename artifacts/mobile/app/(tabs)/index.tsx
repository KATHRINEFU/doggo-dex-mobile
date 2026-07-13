import { Feather, Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ConfettiAnimation } from "@/components/ConfettiAnimation";
import { DetectionResultModal } from "@/components/DetectionResultModal";
import { PokeBall } from "@/components/PokeBall";
import { useCollection } from "@/context/CollectionContext";
import { useDetectDogBreed, useGetDogBreeds } from "@workspace/api-client-react";
import type { DetectBreedResult, DogBreed } from "@workspace/api-client-react";

const { width: W, height: H } = Dimensions.get("window");

const DOG_EMOJIS = ["🐕", "🐶", "🐩", "🦮", "🐕‍🦺", "🐾"];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addDog, isCollected, collectionCount, collectedDogs } = useCollection();

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const [detecting, setDetecting] = useState(false);
  const [imageUri, setImageUri] = useState("");
  const [result, setResult] = useState<DetectBreedResult | null>(null);
  const [matchedBreed, setMatchedBreed] = useState<DogBreed | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const [xpMsg, setXpMsg] = useState("");
  const confettiTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: allBreeds } = useGetDogBreeds();
  const detectMutation = useDetectDogBreed();
  const totalBreeds = allBreeds?.length ?? 100;
  const progress = Math.min(collectionCount / totalBreeds, 1);

  const dogY = useSharedValue(0);
  const dogScale = useSharedValue(1);
  const ballScale = useSharedValue(1);
  const xpOpacity = useSharedValue(0);
  const xpTranslate = useSharedValue(0);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.6);

  useEffect(() => {
    dogY.value = withRepeat(
      withSequence(
        withTiming(-18, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
    dogScale.value = withRepeat(
      withSequence(withTiming(1.06, { duration: 1400 }), withTiming(1, { duration: 1400 })),
      -1,
    );
    ringScale.value = withRepeat(
      withSequence(withTiming(1.35, { duration: 2000, easing: Easing.out(Easing.ease) }), withTiming(1, { duration: 0 })),
      -1,
    );
    ringOpacity.value = withRepeat(
      withSequence(withTiming(0, { duration: 2000 }), withTiming(0.6, { duration: 0 })),
      -1,
    );
  }, []);

  const dogAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dogY.value }, { scale: dogScale.value }],
  }));
  const ballAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ballScale.value }],
  }));
  const xpAnimStyle = useAnimatedStyle(() => ({
    opacity: xpOpacity.value,
    transform: [{ translateY: xpTranslate.value }],
  }));
  const ringAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  function showXp(msg: string) {
    setXpMsg(msg);
    xpOpacity.value = 1;
    xpTranslate.value = 0;
    xpTranslate.value = withTiming(-70, { duration: 1400 });
    xpOpacity.value = withSequence(withTiming(1, { duration: 80 }), withTiming(0, { duration: 700 }));
  }

  function triggerConfetti() {
    setConfettiActive(true);
    if (confettiTimeout.current) clearTimeout(confettiTimeout.current);
    confettiTimeout.current = setTimeout(() => setConfettiActive(false), 3000);
  }

  async function pickAndDetect(fromCamera: boolean) {
    let asset: ImagePicker.ImagePickerAsset | null = null;
    try {
      let picked: ImagePicker.ImagePickerResult;
      if (fromCamera) {
        const { granted } = await ImagePicker.requestCameraPermissionsAsync();
        if (!granted) { Alert.alert("Permission needed", "Camera access is required."); return; }
        picked = await ImagePicker.launchCameraAsync({ mediaTypes: "Images" as any, quality: 0.82, base64: true, allowsEditing: true, aspect: [1, 1] });
      } else {
        const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!granted) { Alert.alert("Permission needed", "Photo library access is required."); return; }
        picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "Images" as any, quality: 0.82, base64: true, allowsEditing: true, aspect: [1, 1] });
      }

      if (picked.canceled || !picked.assets?.[0]) return;
      asset = picked.assets[0];
      setImageUri(asset.uri);
      setDetecting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      ballScale.value = withSequence(withSpring(0.85, { damping: 12 }), withSpring(1, { damping: 12 }));

      let base64Data: string;
      try {
        const manip = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1024 } }],
          { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG, base64: true },
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
        res.breedId && allBreeds ? (allBreeds.find((b) => b.id === res.breedId) ?? null) : null;
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
          triggerConfetti();
          showXp(`+${xpGained} XP · New breed!`);
        } else {
          showXp("Already in your DogDex!");
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

  const dogEmoji = DOG_EMOJIS[collectionCount % DOG_EMOJIS.length];
  const trainerLevel = Math.floor(collectionCount / 5) + 1;
  const showCamera = Platform.OS !== "web" && cameraPermission?.granted;

  return (
    <View style={styles.root}>
      <ConfettiAnimation active={confettiActive} />

      {/* ── Background ────────────────────────────────── */}
      {showCamera ? (
        <CameraView style={StyleSheet.absoluteFill} facing="back" />
      ) : (
        <LinearGradient
          colors={["#062020", "#0A3D35", "#0E5C4A", "#16816A"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
        />
      )}

      {/* Vignette */}
      <LinearGradient
        colors={["rgba(0,0,0,0.55)", "transparent", "transparent", "rgba(0,0,0,0.7)"]}
        locations={[0, 0.18, 0.55, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* ── Top HUD ───────────────────────────────────── */}
      <View style={[styles.topHud, { paddingTop: insets.top + 8 }]}>
        <BlurView intensity={50} tint="dark" style={styles.trainerBadge}>
          <View style={styles.trainerAvatar}>
            <Text style={{ fontSize: 18 }}>🧑‍🦱</Text>
          </View>
          <View>
            <Text style={styles.trainerLevel}>Lv. {trainerLevel}</Text>
            <Text style={styles.trainerName}>DogDex Trainer</Text>
          </View>
        </BlurView>

        <Text style={styles.appTitle}>DogDex</Text>

        <Pressable onPress={() => router.push("/medals" as any)}>
          <BlurView intensity={50} tint="dark" style={styles.settingsCircle}>
            <Feather name="settings" size={17} color="rgba(255,255,255,0.9)" />
          </BlurView>
        </Pressable>
      </View>

      {/* ── Dog Encounter Area ────────────────────────── */}
      <View style={styles.encounterArea} pointerEvents="none">
        <Animated.View style={[styles.dogWrap, dogAnimStyle]}>
          <Animated.View style={[styles.glowRing, ringAnimStyle]} />
          <Text style={styles.dogEmoji}>{dogEmoji}</Text>
          <View style={styles.shadowPuddle} />
        </Animated.View>

        {!showCamera && Platform.OS !== "web" && (
          <Pressable
            style={styles.permissionPill}
            onPress={requestCameraPermission}
            pointerEvents="auto"
          >
            <BlurView intensity={60} tint="dark" style={styles.permissionBlur}>
              <Ionicons name="camera-outline" size={16} color="#fff" />
              <Text style={styles.permissionText}>Enable camera</Text>
            </BlurView>
          </Pressable>
        )}
      </View>

      {/* ── Bottom HUD ────────────────────────────────── */}
      <View style={[styles.bottomHud, { paddingBottom: insets.bottom + 108 }]}>
        {/* XP popup */}
        {xpMsg ? (
          <Animated.View style={[styles.xpPop, xpAnimStyle]}>
            <Text style={styles.xpText}>{xpMsg}</Text>
          </Animated.View>
        ) : null}

        {/* Glass collection card */}
        <BlurView intensity={90} tint="light" style={styles.card}>
          {/* Progress row */}
          <View style={styles.cardRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>COLLECTION PROGRESS</Text>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 2 }}>
                <Text style={styles.cardCount}>{collectionCount}</Text>
                <Text style={styles.cardTotal}> / {totalBreeds}</Text>
              </View>
              <Text style={styles.cardSub}>Breeds Collected</Text>
              <View style={styles.progressTrack}>
                <LinearGradient
                  colors={["#16C8A0", "#0EA882"]}
                  style={[styles.progressFill, { width: `${progress * 100}%` }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
            </View>
            <View style={styles.pawCircle}>
              <Text style={{ fontSize: 30 }}>🐾</Text>
            </View>
          </View>

          {/* Scan button */}
          <Pressable
            style={[styles.scanBtn, detecting && styles.scanBtnDisabled]}
            onPress={() => pickAndDetect(true)}
            disabled={detecting}
          >
            <LinearGradient
              colors={detecting ? ["#9CA3AF", "#9CA3AF"] : ["#16C8A0", "#0BA37E"]}
              style={styles.scanGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {detecting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Animated.View style={[styles.ballBtnWrap, ballAnimStyle]}>
                  <PokeBall size={26} />
                </Animated.View>
              )}
              <Text style={styles.scanText}>
                {detecting ? "Identifying…" : "SCAN DOG"}
              </Text>
            </LinearGradient>
          </Pressable>

          {/* Gallery link */}
          <Pressable
            style={styles.galleryRow}
            onPress={() => pickAndDetect(false)}
            disabled={detecting}
          >
            <Feather name="image" size={13} color="#6B7280" />
            <Text style={styles.galleryText}>Upload from gallery instead</Text>
          </Pressable>
        </BlurView>
      </View>

      <DetectionResultModal
        visible={modalVisible}
        result={result}
        breed={matchedBreed}
        imageUri={imageUri}
        alreadyCollected={result ? isCollected(result.breedId) : false}
        onCollect={() => setModalVisible(false)}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#062020" },

  topHud: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  trainerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 22,
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: "hidden",
  },
  trainerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#0E5C4A",
    borderWidth: 2,
    borderColor: "#16C8A0",
    alignItems: "center",
    justifyContent: "center",
  },
  trainerLevel: {
    color: "#16C8A0",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    lineHeight: 14,
  },
  trainerName: { color: "rgba(255,255,255,0.8)", fontSize: 9, fontFamily: "Inter_400Regular" },
  appTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontFamily: "Georgia",
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    letterSpacing: 0.5,
  },
  settingsCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },

  encounterArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  dogWrap: { alignItems: "center" },
  glowRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: "#16C8A0",
    top: -15,
  },
  dogEmoji: {
    fontSize: 96,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 6 },
    textShadowRadius: 16,
  },
  shadowPuddle: {
    marginTop: 6,
    width: 72,
    height: 16,
    borderRadius: 36,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  permissionPill: { marginTop: 28, borderRadius: 20, overflow: "hidden" },
  permissionBlur: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  permissionText: { color: "#fff", fontFamily: "Inter_500Medium", fontSize: 13 },

  bottomHud: {
    paddingHorizontal: 14,
    zIndex: 10,
  },
  xpPop: {
    position: "absolute",
    alignSelf: "center",
    bottom: "100%",
    marginBottom: 12,
    backgroundColor: "#16C8A0",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  xpText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 },

  card: {
    borderRadius: 26,
    overflow: "hidden",
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.65)",
    gap: 14,
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#6B7280",
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  cardCount: { fontSize: 52, fontFamily: "Georgia", color: "#16C8A0", lineHeight: 56 },
  cardTotal: { fontSize: 22, fontFamily: "Georgia", color: "#9CA3AF" },
  cardSub: { fontSize: 12, color: "#9CA3AF", fontFamily: "Inter_400Regular", marginTop: -2 },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: "#E5E7EB",
    marginTop: 10,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 4 },
  pawCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#F0FDF8",
    borderWidth: 1,
    borderColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },

  scanBtn: { borderRadius: 16, overflow: "hidden" },
  scanBtnDisabled: { opacity: 0.65 },
  scanGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 17,
    gap: 10,
    borderRadius: 16,
  },
  ballBtnWrap: {},
  scanText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    letterSpacing: 1.8,
  },

  galleryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 2,
  },
  galleryText: { color: "#6B7280", fontFamily: "Inter_400Regular", fontSize: 12 },
});
