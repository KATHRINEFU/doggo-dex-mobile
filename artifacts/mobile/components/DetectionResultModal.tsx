import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import React, { useEffect } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { LiquidGlass } from "@/components/LiquidGlass";
import type { DogBreed, DetectBreedResult } from "@workspace/api-client-react";

interface Props {
  visible: boolean;
  result: DetectBreedResult | null;
  breed: DogBreed | null;
  imageUri: string;
  alreadyCollected: boolean;
  onCollect: () => void;
  onClose: () => void;
}

const RARITY_COLORS: Record<string, string> = {
  common: "#6B9E4A",
  uncommon: "#5B7A9E",
  rare: "#9B6FA8",
  legendary: "#C8943A",
};

const RARITY_LABELS: Record<string, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  legendary: "Legendary",
};

function RatingPips({ value, color }: { value: number; color: string }) {
  return (
    <View style={pipStyles.row}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View
          key={i}
          style={[
            pipStyles.pip,
            {
              backgroundColor: i <= value ? color : "rgba(0,0,0,0.08)",
              borderColor: i <= value ? color : "rgba(0,0,0,0.06)",
            },
          ]}
        />
      ))}
    </View>
  );
}

export function DetectionResultModal({
  visible,
  result,
  breed,
  imageUri,
  alreadyCollected,
  onCollect,
  onClose,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 16 });
      opacity.value = withDelay(30, withSpring(1));
      if (result?.isDog) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      scale.value = 0.9;
      opacity.value = 0;
    }
  }, [visible, result?.isDog]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!result) return null;

  const rarityColor = breed ? (RARITY_COLORS[breed.rarity] ?? colors.primary) : colors.primary;
  const isNewBreed = result.isDog && !!result.breedId && !!breed && !alreadyCollected;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderRadius: 28,
              paddingBottom: insets.bottom + 16,
              borderTopColor: isNewBreed ? rarityColor : colors.border,
              borderTopWidth: isNewBreed ? 3 : 1,
              borderLeftColor: colors.border,
              borderRightColor: colors.border,
              borderBottomColor: colors.border,
              borderWidth: 1,
            },
            cardStyle,
          ]}
        >
          {/* Close */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <View style={[styles.closeCircle, { backgroundColor: colors.muted }]}>
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </View>
          </TouchableOpacity>

          {!result.isDog ? (
            <View style={styles.noDogContainer}>
              <Feather name="search" size={48} color={colors.mutedForeground} />
              <Text style={[styles.noDogTitle, { color: colors.foreground }]}>No Dog Found</Text>
              <Text style={[styles.noDogSub, { color: colors.mutedForeground }]}>
                {result.description}
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Photo */}
              <View style={[styles.photoWrap, { borderRadius: 20 }]}>
                <Image source={{ uri: imageUri }} style={styles.photo} contentFit="cover" />
                {breed && (
                  <View style={[styles.rarityTag, { backgroundColor: rarityColor }]}>
                    <Text style={styles.rarityTagText}>{RARITY_LABELS[breed.rarity]}</Text>
                  </View>
                )}
                {isNewBreed && (
                  <View style={[styles.newBadge, { backgroundColor: rarityColor }]}>
                    <Text style={styles.newBadgeText}>First Discovery!</Text>
                  </View>
                )}
              </View>

              {/* Name + confidence */}
              <View style={styles.nameRow}>
                <Text style={[styles.breedName, { color: colors.foreground }]}>
                  {result.breedName}
                </Text>
                <View
                  style={[
                    styles.confPill,
                    {
                      backgroundColor: `${colors.primary}18`,
                      borderColor: `${colors.primary}40`,
                    },
                  ]}
                >
                  <Text style={[styles.confText, { color: colors.primary }]}>
                    {Math.round(result.confidence * 100)}%
                  </Text>
                </View>
              </View>

              {/* ── Dex entry cards (Liquid Glass) ───────────── */}
              {breed && (
                <View style={styles.dexRow}>
                  <GlassDexCard
                    icon="heart"
                    label="Character"
                    value={breed.temperament}
                    accentColor={rarityColor}
                    mutedColor={colors.mutedForeground}
                    fgColor={colors.foreground}
                  />
                  <GlassDexCard
                    icon="smile"
                    label="Personality"
                    value={breed.personality}
                    accentColor={rarityColor}
                    mutedColor={colors.mutedForeground}
                    fgColor={colors.foreground}
                  />
                  <GlassDexCard
                    icon="briefcase"
                    label="HUMAN JOB"
                    value={breed.humanJob}
                    accentColor={rarityColor}
                    mutedColor={colors.mutedForeground}
                    fgColor={colors.foreground}
                  />
                </View>
              )}

              {/* ── Ratings chips ─────────────────────────────── */}
              {breed && (
                <View style={styles.ratingChipsRow}>
                  <StatChip
                    icon="battery"
                    label="Energy"
                    value={breed.energyLevel}
                    color="#F59E0B"
                    mutedColor={colors.mutedForeground}
                  />
                  <StatChip
                    icon="home"
                    label="Space Fit"
                    value={breed.apartmentFriendly}
                    color="#34D399"
                    mutedColor={colors.mutedForeground}
                  />
                  <StatChip
                    icon="wind"
                    label="Chaos"
                    value={breed.chaosLevel}
                    color="#F87171"
                    mutedColor={colors.mutedForeground}
                  />
                </View>
              )}

              {/* ── Fun fact ─────────────────────────────────── */}
              {breed && (
                <View
                  style={[
                    styles.funFactCard,
                    {
                      backgroundColor: `${rarityColor}0E`,
                      borderColor: `${rarityColor}30`,
                    },
                  ]}
                >
                  <Feather name="star" size={18} color={rarityColor} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.funFactLabel, { color: rarityColor }]}>Fun Fact</Text>
                    <Text style={[styles.funFactText, { color: colors.foreground }]}>
                      {breed.funFact}
                    </Text>
                  </View>
                </View>
              )}

              {/* ── Action button / status ────────────────────── */}
              {!result.breedId ? (
                <View
                  style={[
                    styles.bannerRow,
                    { backgroundColor: colors.muted, borderRadius: 14 },
                  ]}
                >
                  <Feather name="help-circle" size={20} color={colors.mutedForeground} />
                  <Text style={[styles.bannerText, { color: colors.foreground }]}>
                    Breed not in our database yet
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.collectBtn,
                    { backgroundColor: rarityColor, borderRadius: 16 },
                  ]}
                  onPress={onCollect}
                >
                  <Text style={styles.collectBtnText}>
                    {alreadyCollected ? "Add Photo to Entry" : "Save to PawDex"}
                  </Text>
                  <Feather name={alreadyCollected ? "camera" : "chevron-right"} size={20} color="#fff" />
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

/* ── Helpers ─────────────────────────────────────────────────── */

function GlassDexCard({
  icon,
  label,
  value,
  accentColor,
  mutedColor,
  fgColor,
}: {
  icon: string;
  label: string;
  value: string;
  accentColor: string;
  mutedColor: string;
  fgColor: string;
}) {
  return (
    <LiquidGlass
      borderRadius={12}
      intensity={Platform.OS === "ios" ? 60 : 0}
      tint="light"
      highlightOpacity={0.5}
      style={glassCard.wrap}
    >
      {/* Rarity color tint overlay */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: `${accentColor}18`, borderRadius: 12 },
        ]}
        pointerEvents="none"
      />
      <Feather name={icon as any} size={20} color={accentColor} style={{ marginBottom: 6 }} />
      <Text style={[glassCard.label, { color: mutedColor }]}>{label}</Text>
      <Text style={[glassCard.value, { color: fgColor }]}>{value}</Text>
    </LiquidGlass>
  );
}

function StatChip({
  icon,
  label,
  value,
  color,
  mutedColor,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
  mutedColor: string;
}) {
  return (
    <View style={[chipStyles.chip, { backgroundColor: `${color}12` }]}>
      <Feather name={icon as any} size={16} color={color} style={chipStyles.icon} />
      <Text style={[chipStyles.label, { color: mutedColor }]}>{label}</Text>
      <RatingPips value={value} color={color} />
    </View>
  );
}

/* ── StyleSheets ─────────────────────────────────────────────── */

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(61,53,41,0.55)",
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  sheet: {
    maxHeight: "90%",
    padding: 20,
    shadowColor: "#3D3529",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  closeBtn: { alignSelf: "flex-end", marginBottom: 12 },
  closeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  noDogContainer: { alignItems: "center", paddingVertical: 32, gap: 12 },
  noDogTitle: { fontFamily: "Georgia", fontSize: 24 },
  noDogSub: { fontFamily: "Inter_400Regular", fontSize: 15, textAlign: "center" },
  photoWrap: { height: 200, overflow: "hidden", marginBottom: 16 },
  photo: { width: "100%", height: "100%" },
  rarityTag: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rarityTagText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: "#fff",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  newBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  newBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: "#fff",
    letterSpacing: 0.3,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  breedName: { fontFamily: "Georgia", fontSize: 24, flex: 1 },
  confPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 8,
    borderWidth: 1,
  },
  confText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  dexRow: { flexDirection: "row", gap: 7, marginBottom: 10 },
  ratingChipsRow: {
    flexDirection: "row",
    gap: 7,
    marginBottom: 12,
  },
  funFactCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  funFactEmoji: { fontSize: 20, marginTop: 1 },
  funFactLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  funFactText: {
    fontFamily: "Georgia",
    fontSize: 14,
    lineHeight: 22,
    fontStyle: "italic",
  },
  bannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    marginTop: 2,
  },
  bannerText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  bannerSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  collectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    marginTop: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  collectBtnText: { fontFamily: "Inter_700Bold", fontSize: 17, color: "#fff" },
});

const glassCard = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: 10,
    gap: 3,
    alignItems: "center",
    minHeight: 80,
    justifyContent: "center",
  },
  icon: { marginBottom: 4 },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    textAlign: "center",
  },
  value: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 15,
  },
});

const chipStyles = StyleSheet.create({
  chip: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    gap: 5,
  },
  icon: { marginBottom: 2 },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    textAlign: "center",
  },
});

const pipStyles = StyleSheet.create({
  row: { flexDirection: "row", gap: 3 },
  pip: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    borderWidth: 1,
  },
});
