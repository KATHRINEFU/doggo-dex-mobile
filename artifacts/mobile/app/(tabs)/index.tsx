import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useCollection } from "@/context/CollectionContext";
import { DetectionResultModal } from "@/components/DetectionResultModal";
import { ConfettiAnimation } from "@/components/ConfettiAnimation";
import { XPBar } from "@/components/XPBar";
import { useDetectDogBreed, useGetDogBreeds } from "@workspace/api-client-react";
import type { DetectBreedResult, DogBreed } from "@workspace/api-client-react";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const RADAR_SIZE = Math.min(SCREEN_WIDTH * 0.72, 300);

function PulseRing({ delay, size, color }: { delay: number; size: number; color: string }) {
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0.8);

  useEffect(() => {
    scale.value = withDelay(delay, withRepeat(withTiming(1.0, { duration: 2200, easing: Easing.out(Easing.ease) }), -1, false));
    opacity.value = withDelay(delay, withRepeat(withTiming(0, { duration: 2200, easing: Easing.out(Easing.ease) }), -1, false));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[{ position: "absolute", width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: color }, style]}
    />
  );
}

function RadarSweep({ color }: { color: string }) {
  const rotate = useSharedValue(0);
  useEffect(() => {
    rotate.value = withRepeat(withTiming(360, { duration: 3000, easing: Easing.linear }), -1, false);
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotate.value}deg` }] }));

  return (
    <Animated.View
      style={[{ position: "absolute", width: RADAR_SIZE, height: RADAR_SIZE, borderRadius: RADAR_SIZE / 2, overflow: "hidden" }, style]}
      pointerEvents="none"
    >
      <View style={{ position: "absolute", top: "50%", left: "50%", width: RADAR_SIZE / 2, height: RADAR_SIZE / 2, transformOrigin: "0% 100%", backgroundColor: `${color}22`, borderTopLeftRadius: RADAR_SIZE / 2 }} />
    </Animated.View>
  );
}

function DetectingAnimation({ color }: { color: string }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(withSequence(withTiming(1.15, { duration: 500 }), withTiming(1.0, { duration: 500 })), -1, false);
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[styles.radarCenter, { backgroundColor: `${color}22` }, style]}>
      <ActivityIndicator size="large" color={color} />
    </Animated.View>
  );
}

export default function ScanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addDog, isCollected, collectionCount, xp, xpLevel, streak } = useCollection();

  const [detecting, setDetecting] = useState(false);
  const [imageUri, setImageUri] = useState("");
  const [result, setResult] = useState<DetectBreedResult | null>(null);
  const [matchedBreed, setMatchedBreed] = useState<DogBreed | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const [xpPopup, setXpPopup] = useState<{ amount: number; isNew: boolean } | null>(null);
  const confettiTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scanBtnScale = useSharedValue(1);
  const xpPopupY = useSharedValue(0);
  const xpPopupOpacity = useSharedValue(0);

  const { data: allBreeds } = useGetDogBreeds();
  const detectMutation = useDetectDogBreed();

  const scanBtnStyle = useAnimatedStyle(() => ({ transform: [{ scale: scanBtnScale.value }] }));
  const xpPopupStyle = useAnimatedStyle(() => ({ transform: [{ translateY: xpPopupY.value }], opacity: xpPopupOpacity.value }));

  function showXpPopup(amount: number, isNew: boolean) {
    setXpPopup({ amount, isNew });
    xpPopupY.value = 0;
    xpPopupOpacity.value = 1;
    xpPopupY.value = withTiming(-60, { duration: 1200 });
    xpPopupOpacity.value = withDelay(800, withTiming(0, { duration: 400 }));
    setTimeout(() => setXpPopup(null), 1400);
  }

  function triggerConfetti() {
    setConfettiActive(true);
    if (confettiTimeout.current) clearTimeout(confettiTimeout.current);
    confettiTimeout.current = setTimeout(() => setConfettiActive(false), 3000);
  }

  async function pickAndDetect(fromCamera: boolean) {
    try {
      let picked: ImagePicker.ImagePickerResult;
      if (fromCamera) {
        const { granted } = await ImagePicker.requestCameraPermissionsAsync();
        if (!granted) { Alert.alert("Permission needed", "Camera access is required."); return; }
        picked = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, base64: true, allowsEditing: true, aspect: [1, 1] });
      } else {
        const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!granted) { Alert.alert("Permission needed", "Photo library access is required."); return; }
        picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, base64: true, allowsEditing: true, aspect: [1, 1] });
      }

      if (picked.canceled || !picked.assets?.[0]) return;
      const asset = picked.assets[0];
      if (!asset.base64) { Alert.alert("Error", "Could not read image data."); return; }

      setImageUri(asset.uri);
      setDetecting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      const res = await detectMutation.mutateAsync({
        data: { imageBase64: asset.base64, mimeType: asset.mimeType ?? "image/jpeg" },
      });

      setResult(res);

      const found = res.breedId && allBreeds ? allBreeds.find((b) => b.id === res.breedId) ?? null : null;
      setMatchedBreed(found);

      // Auto-add if confidence > 70%
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

        if (isNew) {
          triggerConfetti();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
        showXpPopup(xpGained, isNew);
      }

      setModalVisible(true);
    } catch {
      Alert.alert("Detection failed", "Could not analyze the image. Please try again.");
    } finally {
      setDetecting(false);
    }
  }

  const totalBreeds = allBreeds?.length ?? 100;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ConfettiAnimation active={confettiActive} />

      {/* XP popup */}
      {xpPopup && (
        <Animated.View style={[styles.xpPopup, { backgroundColor: colors.primary }, xpPopupStyle]}>
          <Text style={[styles.xpPopupText, { color: colors.primaryForeground }]}>
            {xpPopup.isNew ? `+${xpPopup.amount} XP` : "Already caught!"}
          </Text>
        </Animated.View>
      )}

      {/* Header */}
      <LinearGradient colors={["#0B1626", "#0d2040"]} style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.primary }]}>DogDex</Text>
            <XPBar xp={xp} levelName={xpLevel.name} compact />
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.countText, { color: colors.primaryForeground }]}>{collectionCount}/{totalBreeds}</Text>
              <Text style={[styles.countLabel, { color: colors.primaryForeground }]}>caught</Text>
            </View>
            {streak > 1 && (
              <View style={[styles.streakBadge, { backgroundColor: "#FF6B35" }]}>
                <Ionicons name="flame" size={12} color="#fff" />
                <Text style={styles.streakText}>{streak}</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Radar area */}
      <View style={styles.scanArea}>
        <View style={styles.gridOverlay} pointerEvents="none">
          {[...Array(6)].map((_, i) => (
            <View key={i} style={[styles.gridLine, { borderColor: `${colors.accent}18` }]} />
          ))}
        </View>

        <View style={styles.radarWrapper}>
          {[0.35, 0.6, 0.85, 1.0].map((r, i) => (
            <View key={i} style={{ position: "absolute", width: RADAR_SIZE * r, height: RADAR_SIZE * r, borderRadius: (RADAR_SIZE * r) / 2, borderWidth: 1, borderColor: `${colors.accent}30` }} />
          ))}
          <PulseRing delay={0} size={RADAR_SIZE * 0.6} color={colors.primary} />
          <PulseRing delay={730} size={RADAR_SIZE * 0.8} color={colors.primary} />
          <PulseRing delay={1460} size={RADAR_SIZE} color={colors.primary} />
          {!detecting && <RadarSweep color={colors.primary} />}
          <View style={[styles.crossH, { backgroundColor: `${colors.accent}40` }]} />
          <View style={[styles.crossV, { backgroundColor: `${colors.accent}40` }]} />

          {detecting ? (
            <DetectingAnimation color={colors.primary} />
          ) : (
            <TouchableOpacity
              activeOpacity={1}
              onPressIn={() => { scanBtnScale.value = withSpring(0.92, { damping: 12 }); }}
              onPressOut={() => { scanBtnScale.value = withSpring(1, { damping: 12 }); }}
              onPress={() => pickAndDetect(true)}
            >
              <Animated.View style={[styles.radarCenter, { backgroundColor: colors.primary, shadowColor: colors.primary }, scanBtnStyle]}>
                <Ionicons name="camera" size={40} color={colors.primaryForeground} />
                <Text style={[styles.centerLabel, { color: colors.primaryForeground }]}>SCAN</Text>
              </Animated.View>
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
          {detecting ? "Analyzing breed with AI..." : "Point at a dog and tap SCAN"}
        </Text>

        <Text style={[styles.autoAddNote, { color: `${colors.primary}99` }]}>
          Breeds with 70%+ confidence are auto-added!
        </Text>
      </View>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 70 }]}>
        <TouchableOpacity
          style={[styles.sideBtn, { backgroundColor: colors.secondary, borderRadius: colors.radius }]}
          onPress={() => pickAndDetect(false)}
          disabled={detecting}
        >
          <Ionicons name="images-outline" size={22} color={colors.primary} />
          <Text style={[styles.sideBtnText, { color: colors.foreground }]}>Upload</Text>
        </TouchableOpacity>
        <View style={styles.centerSpacer}>
          <Text style={[styles.tipText, { color: colors.mutedForeground }]}>or upload from gallery</Text>
        </View>
        <View style={[styles.sideBtn, { backgroundColor: colors.secondary, borderRadius: colors.radius }]}>
          <Ionicons name="paw-outline" size={22} color={colors.accent} />
          <Text style={[styles.sideBtnText, { color: colors.foreground }]}>{totalBreeds - collectionCount} left</Text>
        </View>
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
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginBottom: 4 },
  headerRight: { alignItems: "center", gap: 4 },
  countBadge: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, alignItems: "center" },
  countText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  countLabel: { fontSize: 9, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5, opacity: 0.75 },
  streakBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  streakText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff" },
  scanArea: { flex: 1, alignItems: "center", justifyContent: "center" },
  gridOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, flexDirection: "column", justifyContent: "space-around" },
  gridLine: { flex: 1, borderBottomWidth: 1 },
  radarWrapper: { width: RADAR_SIZE, height: RADAR_SIZE, alignItems: "center", justifyContent: "center", position: "relative" },
  crossH: { position: "absolute", width: RADAR_SIZE, height: 1 },
  crossV: { position: "absolute", width: 1, height: RADAR_SIZE },
  radarCenter: { width: 110, height: 110, borderRadius: 55, alignItems: "center", justifyContent: "center", gap: 4, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 20, elevation: 10 },
  centerLabel: { fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  statusText: { marginTop: 32, fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center" },
  autoAddNote: { marginTop: 6, fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  bottomBar: { flexDirection: "row", alignItems: "center", paddingTop: 16, paddingHorizontal: 24, borderTopWidth: 1, gap: 12 },
  sideBtn: { alignItems: "center", justifyContent: "center", paddingVertical: 12, paddingHorizontal: 16, gap: 4, minWidth: 80 },
  sideBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  centerSpacer: { flex: 1, alignItems: "center" },
  tipText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  xpPopup: { position: "absolute", top: "40%", alignSelf: "center", zIndex: 100, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  xpPopupText: { fontSize: 18, fontFamily: "Inter_700Bold" },
});
