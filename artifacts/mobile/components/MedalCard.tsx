import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as FileSystem from "expo-file-system/legacy";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  NativeModules,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "@clerk/expo";
import type { Medal } from "@/context/CollectionContext";
import { useBadgeShare } from "@/context/BadgeShareContext";
import { useCollection } from "@/context/CollectionContext";
import Constants from "expo-constants";

interface Props {
  medal: Medal;
  currentCount: number;
}

const TIER_GRADIENTS: Record<string, [string, string]> = {
  b10:  ["#A8EDEA", "#66BB6A"],
  b20:  ["#84FAB0", "#08AEEA"],
  b30:  ["#A18CD1", "#FBC2EB"],
  b40:  ["#FDDB92", "#D1FDFF"],
  b50:  ["#5EE7DF", "#B490CA"],
  b60:  ["#F6D365", "#FDA085"],
  b70:  ["#F093FB", "#F5576C"],
  b80:  ["#4FACFE", "#00F2FE"],
  b90:  ["#43E97B", "#38F9D7"],
  b100: ["#FFD700", "#FFA500"],
};

const ICON_MAP: Record<string, string> = {
  b10: "maximize",
  b20: "search",
  b30: "heart",
  b40: "mic",
  b50: "gift",
  b60: "home",
  b70: "star",
  b80: "award",
  b90: "sun",
  b100: "star",
};

// Older development builds do not contain expo-sharing's native module. Load
// it only when the binary has it, then fall back to React Native's text share.
const Sharing =
  Platform.OS !== "web" && NativeModules.ExpoSharing
    ? require("expo-sharing")
    : null;

export function MedalCard({ medal, currentCount }: Props) {
  const progress = Math.min(currentCount / medal.required, 1);
  const gradColors = TIER_GRADIENTS[medal.id] ?? ["#5AC8FA", "#007AFF"];
  const icon = ICON_MAP[medal.id] ?? "award";

  const { getStatus, requestImage } = useBadgeShare();
  const { collectedDogs } = useCollection();
  const { getToken } = useAuth();
  const [isBusy, setIsBusy] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  const status = getStatus(medal.id);

  /**
   * The prompt features the 10 most recently collected breeds, newest first.
   * `collectedDogs` is stored oldest-first, so take from the end.
   */
  const recentBreeds = collectedDogs
    .slice()
    .reverse()
    .map((dog) => dog.breedName)
    .slice(0, 10);

  const startGeneration = async (regenerate = false) => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      const next = await requestImage(
        medal.id,
        recentBreeds,
        collectedDogs.length,
        regenerate,
      );
      if (next === "failed") {
        Alert.alert(
          "Could not start",
          "We couldn't start your badge image. Please try again.",
        );
        return;
      }
      Alert.alert(
        "Generating your badge with the doggos!",
        "Please come back in a few minutes.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  /** Fetches the finished image into the app cache for private preview. */
  const loadPreviewImage = async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      const domain = Constants.expoConfig?.extra?.domain || process.env.EXPO_PUBLIC_DOMAIN;
      if (!domain) throw new Error("API domain is unavailable");
      const token = await getToken();

      const target = `${FileSystem.cacheDirectory}doggodex-${medal.id}.png`;
      const result = await FileSystem.downloadAsync(
        `https://${domain}/api/badge-image/${medal.id}/file`,
        target,
        { headers: token ? { Authorization: `Bearer ${token}` } : undefined },
      );
      if (result.status !== 200) throw new Error(`status ${result.status}`);

      setPreviewUri(result.uri);
      setIsPreviewVisible(true);
    } catch {
      Alert.alert(
        "Could not open badge",
        "We couldn't open your badge image. Please try again.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  /** Opens the native save/share sheet only after the preview is open. */
  const downloadImage = async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      let imageUri = previewUri;
      if (!imageUri) {
        const domain = Constants.expoConfig?.extra?.domain || process.env.EXPO_PUBLIC_DOMAIN;
        if (!domain) throw new Error("API domain is unavailable");
        const token = await getToken();
        const target = `${FileSystem.cacheDirectory}doggodex-${medal.id}.png`;
        const result = await FileSystem.downloadAsync(
          `https://${domain}/api/badge-image/${medal.id}/file`,
          target,
          { headers: token ? { Authorization: `Bearer ${token}` } : undefined },
        );
        if (result.status !== 200) throw new Error(`status ${result.status}`);
        imageUri = result.uri;
        setPreviewUri(result.uri);
      }

      if (Sharing && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(imageUri, {
          mimeType: "image/png",
          dialogTitle: "Your DoggoDex badge",
          UTI: "public.png",
        });
        return;
      }
      Alert.alert("Saved", "Your badge image was downloaded.");
    } catch {
      Alert.alert(
        "Download failed",
        "We couldn't download your badge image. Please try again.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleShare = async () => {
    if (status === "ready") {
      await loadPreviewImage();
      return;
    }
    if (status === "pending") {
      Alert.alert(
        "Image production in progress!",
        "Your doggos are posing…Come back in a few minutes.",
      );
      return;
    }
    if (status === "failed") {
      await startGeneration(true);
      return;
    }
    await startGeneration();
  };

  const shareIcon = status === "ready" ? "eye" : "share-2";
  const shareLabel =
    status === "ready"
      ? "Open badge image"
      : status === "pending"
        ? "Badge image in progress"
        : "Create badge image";

  return (
    <View style={[styles.card, medal.unlocked && styles.cardUnlocked]}>
      {medal.unlocked && (
        <View style={[styles.glow, { backgroundColor: gradColors[0] + "30" }]} />
      )}

      {/* Share button — top-right, unlocked badges only */}
      {medal.unlocked && (
        <Pressable
          style={[styles.shareBtn, isBusy && styles.shareBtnBusy]}
          onPress={handleShare}
          hitSlop={8}
          disabled={isBusy}
          accessibilityLabel={shareLabel}
        >
          {isBusy || status === "pending" ? (
            <ActivityIndicator size="small" color="rgba(255,255,255,0.8)" />
          ) : (
            <Feather name={shareIcon} size={14} color="rgba(255,255,255,0.8)" />
          )}
        </Pressable>
      )}

      {/* Icon */}
      <View style={styles.iconOuter}>
        {medal.unlocked ? (
          <LinearGradient
            colors={gradColors}
            style={styles.iconGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Feather name={icon as any} size={26} color="#F59E0B" />
          </LinearGradient>
        ) : (
          <View style={styles.iconLocked}>
            <Feather name={icon as any} size={26} color="#94A3B8" style={{ opacity: 0.35 }} />
          </View>
        )}
      </View>

      {/* Body */}
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, !medal.unlocked && styles.nameLocked]}>
            {medal.name}
          </Text>
          {medal.unlocked && (
            <View style={[styles.earnedPill, { backgroundColor: gradColors[0] + "30", borderColor: gradColors[0] + "60" }]}>
              <Text style={[styles.earnedText, { color: gradColors[0] }]}>Earned</Text>
            </View>
          )}
        </View>

        <Text style={styles.desc}>{medal.description}</Text>

        <View style={styles.track}>
          {medal.unlocked ? (
            <LinearGradient
              colors={gradColors}
              style={styles.fillFull}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          ) : (
            <View style={[styles.fillPartial, { width: `${progress * 100}%` }]} />
          )}
        </View>

        <Text style={styles.countLabel}>
          {Math.min(currentCount, medal.required)}/{medal.required} breeds
        </Text>
      </View>
      <Modal
        visible={isPreviewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPreviewVisible(false)}
      >
        <View style={styles.previewBackdrop}>
          <View style={styles.previewSheet}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Your DoggoDex badge</Text>
              <Pressable
                onPress={() => setIsPreviewVisible(false)}
                hitSlop={10}
                accessibilityLabel="Close badge preview"
              >
                <Feather name="x" size={24} color="#FFFFFF" />
              </Pressable>
            </View>

            {previewUri ? (
              <Image
                source={{ uri: previewUri }}
                style={styles.previewImage}
                resizeMode="contain"
                accessibilityLabel={`${medal.name} badge image`}
              />
            ) : (
              <View style={styles.previewLoading}>
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            )}

            <View style={styles.previewActions}>
              <Pressable
                style={styles.previewSecondaryButton}
                onPress={() => setIsPreviewVisible(false)}
                disabled={isBusy}
              >
                <Text style={styles.previewSecondaryText}>Close</Text>
              </Pressable>
              <Pressable
                style={[styles.previewPrimaryButton, isBusy && styles.shareBtnBusy]}
                onPress={downloadImage}
                disabled={isBusy}
              >
                {isBusy ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="download" size={16} color="#FFFFFF" />
                    <Text style={styles.previewPrimaryText}>Download / Share</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row", alignItems: "center",
    gap: 14, padding: 14, borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(15, 50, 120, 0.72)",
    marginBottom: 10, overflow: "hidden",
    position: "relative",
  },
  cardUnlocked: {
    borderColor: "rgba(255,255,255,0.30)",
    backgroundColor: "rgba(20, 60, 140, 0.80)",
  },
  glow: {
    position: "absolute", top: -20, left: -20,
    width: 100, height: 100, borderRadius: 50,
  },
  shareBtn: {
    position: "absolute", top: 10, right: 10,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
    zIndex: 1,
  },
  shareBtnBusy: { opacity: 0.7 },

  previewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(4, 12, 35, 0.92)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  previewSheet: {
    width: "100%",
    maxWidth: 430,
    maxHeight: "92%",
    borderRadius: 24,
    padding: 16,
    backgroundColor: "#102C68",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  previewTitle: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    color: "#FFFFFF",
  },
  previewImage: {
    width: "100%",
    aspectRatio: 2 / 3,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  previewLoading: {
    width: "100%",
    aspectRatio: 2 / 3,
    alignItems: "center",
    justifyContent: "center",
  },
  previewActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  previewSecondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewSecondaryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "rgba(255,255,255,0.82)",
  },
  previewPrimaryButton: {
    flex: 1.5,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: "#2F80ED",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  previewPrimaryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
  },

  iconOuter: {
    width: 54, height: 54, borderRadius: 27,
    overflow: "hidden", flexShrink: 0,
  },
  iconGradient: {
    width: "100%", height: "100%",
    alignItems: "center", justifyContent: "center",
  },
  iconLocked: {
    width: "100%", height: "100%",
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.4)",
    borderRadius: 27,
  },
  iconHolder: { alignItems: "center", justifyContent: "center" },

  body: { flex: 1, gap: 4, paddingRight: 20 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#FFFFFF", flex: 1 },
  nameLocked: { color: "rgba(255,255,255,0.45)" },

  earnedPill: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 10, borderWidth: 1,
  },
  earnedText: { fontFamily: "Inter_600SemiBold", fontSize: 10 },

  desc: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.55)" },

  track: {
    height: 5, borderRadius: 3, overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.15)", marginTop: 2,
  },
  fillFull: { height: "100%", borderRadius: 3, width: "100%" },
  fillPartial: { height: "100%", borderRadius: 3, backgroundColor: "rgba(255,255,255,0.4)" },

  countLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.45)" },
});
