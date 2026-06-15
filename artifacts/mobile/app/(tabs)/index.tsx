import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useCollection } from "@/context/CollectionContext";
import { DetectionResultModal } from "@/components/DetectionResultModal";
import { ConfettiAnimation } from "@/components/ConfettiAnimation";
import { useDetectDogBreed, useGetDogBreeds } from "@workspace/api-client-react";
import type { DetectBreedResult, DogBreed } from "@workspace/api-client-react";

const { width: W } = Dimensions.get("window");

const HERO_DOG =
  "https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=300&q=80";

const RARITY_DOT: Record<string, string> = {
  common: "#6B9E4A",
  uncommon: "#5B7A9E",
  rare: "#9B6FA8",
  legendary: "#C8943A",
};

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addDog, isCollected, collectionCount, collectedDogs } = useCollection();

  const [detecting, setDetecting] = useState(false);
  const [imageUri, setImageUri] = useState("");
  const [result, setResult] = useState<DetectBreedResult | null>(null);
  const [matchedBreed, setMatchedBreed] = useState<DogBreed | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const confettiTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const btnScale = useSharedValue(1);
  const xpPopupY = useSharedValue(0);
  const xpPopupOpacity = useSharedValue(0);
  const [xpMsg, setXpMsg] = useState("");

  const { data: allBreeds } = useGetDogBreeds();
  const detectMutation = useDetectDogBreed();

  const totalBreeds = allBreeds?.length ?? 100;
  const progress = Math.min(collectionCount / totalBreeds, 1);

  const recentDogs = [...collectedDogs]
    .sort((a, b) => b.collectedAt.localeCompare(a.collectedAt))
    .slice(0, 8);

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const xpStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: xpPopupY.value }],
    opacity: xpPopupOpacity.value,
  }));

  function showXp(msg: string) {
    setXpMsg(msg);
    xpPopupY.value = 0;
    xpPopupOpacity.value = 1;
    xpPopupY.value = withTiming(-50, { duration: 1000 });
    xpPopupOpacity.value = withDelay(700, withTiming(0, { duration: 300 }));
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
        picked = await ImagePicker.launchCameraAsync({ mediaTypes: "Images" as any, quality: 0.7, base64: true, allowsEditing: true, aspect: [1, 1] });
      } else {
        const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!granted) { Alert.alert("Permission needed", "Photo library access is required."); return; }
        picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "Images" as any, quality: 0.7, base64: true, allowsEditing: true, aspect: [1, 1] });
      }

      if (picked.canceled || !picked.assets?.[0]) return;
      const asset = picked.assets[0];

      setImageUri(asset.uri);
      setDetecting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Re-encode to JPEG via canvas/native — fixes HEIC, WebP, PNG variants
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      if (!manipulated.base64) { Alert.alert("Error", "Could not process image."); setDetecting(false); return; }

      const res = await detectMutation.mutateAsync({
        data: { imageBase64: manipulated.base64, mimeType: "image/jpeg" },
      });

      setResult(res);
      const found = res.breedId && allBreeds ? allBreeds.find((b) => b.id === res.breedId) ?? null : null;
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
        if (isNew) {
          triggerConfetti();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showXp(`+${xpGained} XP · New breed!`);
        } else {
          showXp("Already in your DogDex!");
        }
      }

      setModalVisible(true);
    } catch {
      Alert.alert("Detection failed", "Could not analyze the image. Please try again.");
    } finally {
      setDetecting(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ConfettiAnimation active={confettiActive} />

      {/* XP popup */}
      {xpMsg ? (
        <Animated.View style={[styles.xpPop, { backgroundColor: colors.primary }, xpStyle]}>
          <Text style={[styles.xpPopText, { color: colors.primaryForeground }]}>{xpMsg}</Text>
        </Animated.View>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 90 + (Platform.OS === "web" ? 34 : 0) }}
      >
        {/* ── Header ──────────────────────────────────── */}
        <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 70 : 16) }]}>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push("/medals" as any)}>
            <Feather name="settings" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>

          <View style={styles.titleBlock}>
            {/* Paw watermark above */}
            <Text style={[styles.pawWatermark, { color: `${colors.primary}55` }]}>🐾</Text>

            <View style={styles.titleRow}>
              <Text style={[styles.leafL, { color: `${colors.primary}77` }]}>🌿</Text>
              <Text style={[styles.title, { color: colors.foreground }]}>DogDex</Text>
              <Text style={[styles.leafR, { color: `${colors.primary}77` }]}>🌿</Text>
            </View>

            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Collect every dog. Share every story.
            </Text>
          </View>
        </View>

        {/* ── Collection Progress Card ─────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 20, borderRadius: colors.radius }]}>
          {/* Watercolour dog illustration */}
          <Image
            source={{ uri: HERO_DOG }}
            style={styles.heroDog}
            contentFit="cover"
          />

          <View style={styles.cardTop}>
            <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
              COLLECTION PROGRESS
            </Text>
            <Text style={[styles.progressCount, { color: colors.foreground }]}>
              <Text style={{ fontFamily: "Georgia", fontSize: 48 }}>{collectionCount}</Text>
              <Text style={{ fontSize: 22, color: colors.mutedForeground }}> / {totalBreeds}</Text>
            </Text>

            {/* Progress bar */}
            <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
              <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${progress * 100}%` }]} />
            </View>
          </View>

          {/* Camera button */}
          <View style={styles.cameraArea}>
            <View style={[styles.cameraRing, { borderColor: `${colors.primary}30` }]}>
              <Animated.View style={btnStyle}>
                <Pressable
                  style={[styles.cameraBtn, { backgroundColor: colors.primary }]}
                  onPressIn={() => { btnScale.value = withSpring(0.91, { damping: 14 }); }}
                  onPressOut={() => { btnScale.value = withSpring(1, { damping: 14 }); }}
                  onPress={() => pickAndDetect(true)}
                  disabled={detecting}
                >
                  {detecting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="camera" size={32} color="#fff" />
                  )}
                </Pressable>
              </Animated.View>
            </View>

            <Text style={[styles.findLabel, { color: colors.mutedForeground }]}>
              {detecting ? "Identifying breed…" : "Find a dog"}
            </Text>
            <Text style={[styles.findSub, { color: colors.mutedForeground }]}>
              {detecting ? "" : "and add to your collection"}
            </Text>
          </View>
        </View>

        {/* Upload hint */}
        <TouchableOpacity
          style={[styles.uploadRow, { borderColor: colors.border }]}
          onPress={() => pickAndDetect(false)}
          disabled={detecting}
        >
          <Feather name="image" size={15} color={colors.primary} />
          <Text style={[styles.uploadText, { color: colors.primary }]}>Upload from gallery</Text>
        </TouchableOpacity>

        {/* ── Recent Discoveries ───────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>RECENT DISCOVERIES</Text>
          <TouchableOpacity onPress={() => router.push("/collection" as any)}>
            <Text style={[styles.viewAll, { color: colors.primary }]}>View All &gt;</Text>
          </TouchableOpacity>
        </View>

        {recentDogs.length === 0 ? (
          <View style={[styles.emptyRecent, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 20, borderRadius: colors.radius }]}>
            <Text style={{ fontSize: 36 }}>🐕</Text>
            <Text style={[styles.emptyRecentText, { color: colors.mutedForeground }]}>
              No discoveries yet — go scan a dog!
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentScroll}>
            {recentDogs.map((dog) => {
              const breed = allBreeds?.find((b) => b.id === dog.breedId);
              const rarityColor = RARITY_DOT[breed?.rarity ?? "common"];
              const dateStr = new Date(dog.collectedAt).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              });
              return (
                <TouchableOpacity
                  key={dog.breedId}
                  style={[styles.recentCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16 }]}
                  onPress={() => router.push(`/breed/${dog.breedId}` as any)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: dog.imageUri }} style={styles.recentImg} contentFit="cover" />
                  <View style={styles.recentInfo}>
                    <Text style={[styles.recentName, { color: colors.foreground }]} numberOfLines={1}>
                      {dog.breedName}
                    </Text>
                    <View style={styles.recentDateRow}>
                      <View style={[styles.rarityDot, { backgroundColor: rarityColor }]} />
                      <Text style={[styles.recentDate, { color: colors.mutedForeground }]}>{dateStr}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </ScrollView>

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
  root: { flex: 1 },
  header: { alignItems: "center", paddingHorizontal: 20, paddingBottom: 20, position: "relative" },
  settingsBtn: { position: "absolute", right: 20, top: Platform.OS === "web" ? 82 : 56, padding: 8 },
  titleBlock: { alignItems: "center", gap: 4 },
  pawWatermark: { fontSize: 22, marginBottom: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  leafL: { fontSize: 20 },
  leafR: { fontSize: 20 },
  title: { fontFamily: "Georgia", fontSize: 42, letterSpacing: -1 },
  subtitle: { fontStyle: "italic", fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 2 },

  card: { borderWidth: 1, overflow: "hidden", marginBottom: 8 },
  heroDog: { position: "absolute", right: -10, top: -10, width: 130, height: 130, opacity: 0.85, borderRadius: 12 },
  cardTop: { padding: 20, paddingBottom: 0, paddingRight: 130 },
  progressLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5 },
  progressCount: { marginTop: 2 },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden", marginTop: 10, marginBottom: 0 },
  progressFill: { height: "100%", borderRadius: 4 },

  cameraArea: { alignItems: "center", paddingVertical: 24, gap: 6 },
  cameraRing: { width: 96, height: 96, borderRadius: 48, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  cameraBtn: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", shadowColor: "#5B7A3A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  findLabel: { fontFamily: "Georgia", fontSize: 16, fontStyle: "italic" },
  findSub: { fontFamily: "Georgia", fontSize: 14, fontStyle: "italic" },

  uploadRow: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center", paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1, borderRadius: 20, marginBottom: 24 },
  uploadText: { fontFamily: "Inter_500Medium", fontSize: 13 },

  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 1.5 },
  viewAll: { fontFamily: "Inter_500Medium", fontSize: 13 },

  recentScroll: { paddingHorizontal: 20, gap: 12 },
  recentCard: { width: 140, borderWidth: 1, overflow: "hidden" },
  recentImg: { width: "100%", height: 120 },
  recentInfo: { padding: 10, gap: 4 },
  recentName: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  recentDateRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  rarityDot: { width: 7, height: 7, borderRadius: 4 },
  recentDate: { fontFamily: "Inter_400Regular", fontSize: 11 },

  emptyRecent: { padding: 28, alignItems: "center", gap: 10, marginBottom: 16 },
  emptyRecentText: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },

  xpPop: { position: "absolute", top: "38%", alignSelf: "center", zIndex: 100, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20 },
  xpPopText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
