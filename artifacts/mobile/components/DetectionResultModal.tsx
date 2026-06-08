import { Ionicons } from "@expo/vector-icons";
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
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 16 });
      opacity.value = withDelay(50, withSpring(1));
      if (result?.isDog) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } else {
      scale.value = 0.85;
      opacity.value = 0;
    }
  }, [visible, result?.isDog, scale, opacity]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!result) return null;

  const rarityColor = breed
    ? ({
        common: colors.common,
        uncommon: colors.uncommon,
        rare: colors.rare,
        legendary: colors.legendary,
      }[breed.rarity] ?? colors.primary)
    : colors.primary;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderRadius: colors.radius + 4,
              paddingBottom: insets.bottom + 16,
              borderColor: rarityColor,
              borderWidth: breed ? 1.5 : 0,
            },
            cardStyle,
          ]}
        >
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close-circle" size={28} color={colors.mutedForeground} />
          </TouchableOpacity>

          {!result.isDog ? (
            <View style={styles.noDogContainer}>
              <Ionicons name="paw-outline" size={56} color={colors.mutedForeground} />
              <Text style={[styles.noDogTitle, { color: colors.foreground }]}>No Dog Found</Text>
              <Text style={[styles.noDogSub, { color: colors.mutedForeground }]}>
                {result.description}
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Captured photo */}
              <View style={[styles.photoContainer, { borderRadius: colors.radius }]}>
                <Image source={{ uri: imageUri }} style={styles.photo} contentFit="cover" />
                {breed && (
                  <View style={[styles.rarityBanner, { backgroundColor: rarityColor }]}>
                    <Text style={styles.rarityBannerText}>{breed.rarity.toUpperCase()}</Text>
                  </View>
                )}
              </View>

              {/* Header */}
              <View style={styles.breedHeader}>
                <Text style={[styles.breedName, { color: colors.foreground }]}>
                  {result.breedName}
                </Text>
                <View style={[styles.confidenceBadge, { backgroundColor: `${colors.primary}22`, borderColor: `${colors.primary}44` }]}>
                  <Text style={[styles.confidenceText, { color: colors.primary }]}>
                    {Math.round(result.confidence * 100)}% match
                  </Text>
                </View>
              </View>

              <Text style={[styles.description, { color: colors.mutedForeground }]}>
                {result.description}
              </Text>

              {breed && (
                <View style={[styles.statsGrid, { borderColor: colors.border }]}>
                  <StatItem label="Origin" value={breed.origin} colors={colors} />
                  <StatItem label="Size" value={breed.size} colors={colors} />
                  <StatItem label="Lifespan" value={breed.lifespan} colors={colors} />
                  <StatItem label="Temperament" value={breed.temperament} colors={colors} />
                </View>
              )}

              {!result.breedId || alreadyCollected ? (
                <View
                  style={[
                    styles.collectedBanner,
                    {
                      backgroundColor: alreadyCollected
                        ? `${colors.common}22`
                        : colors.secondary,
                      borderRadius: colors.radius,
                      borderWidth: 1,
                      borderColor: alreadyCollected ? `${colors.common}44` : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={alreadyCollected ? "checkmark-circle" : "alert-circle"}
                    size={20}
                    color={alreadyCollected ? colors.common : colors.mutedForeground}
                  />
                  <Text style={[styles.collectedText, { color: colors.foreground }]}>
                    {alreadyCollected
                      ? "Already in your DogDex!"
                      : "Breed not in our database yet"}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.collectBtn,
                    { backgroundColor: rarityColor, borderRadius: colors.radius },
                  ]}
                  onPress={onCollect}
                >
                  <Ionicons name="add-circle" size={22} color={colors.primaryForeground} />
                  <Text style={[styles.collectBtnText, { color: colors.primaryForeground }]}>
                    Add to DogDex!
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

interface StatItemColors {
  border: string;
  mutedForeground: string;
  foreground: string;
}

function StatItem({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: StatItemColors;
}) {
  return (
    <View style={[styles.statItem, { borderColor: colors.border }]}>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  card: {
    maxHeight: "88%",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  closeBtn: { alignSelf: "flex-end", marginBottom: 8 },
  noDogContainer: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  noDogTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  noDogSub: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  photoContainer: {
    height: 200,
    overflow: "hidden",
    marginBottom: 16,
  },
  photo: { width: "100%", height: "100%" },
  rarityBanner: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rarityBannerText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#0B1626",
    letterSpacing: 1,
  },
  breedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  breedName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    flex: 1,
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
    borderWidth: 1,
  },
  confidenceText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  description: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    marginBottom: 16,
  },
  statsGrid: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  statItem: {
    width: "50%",
    padding: 12,
    borderBottomWidth: 1,
    borderRightWidth: 1,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize",
  },
  collectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    marginTop: 4,
  },
  collectBtnText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  collectedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    marginTop: 4,
  },
  collectedText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
});
