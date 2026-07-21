import { Feather, Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";
import { useCollection } from "@/context/CollectionContext";

interface Props {
  id: string;
  name: string;
  imageUrl: string;
  userPhotoUri?: string;
  rarity: "common" | "uncommon" | "rare" | "legendary";
  group: string;
  collected: boolean;
  onPress?: () => void;
}

const RARITY_COLORS = {
  common:    "#34D399",
  uncommon:  "#60A5FA",
  rare:      "#A78BFA",
  legendary: "#FBBF24",
};

const RARITY_LABELS = {
  common:    "Common",
  uncommon:  "Uncommon",
  rare:      "Rare",
  legendary: "Legendary",
};

export function DogCard({ id, name, imageUrl, userPhotoUri, rarity, group, collected, onPress }: Props) {
  const colors = useColors();
  const { getEntry } = useCollection();
  const scale = useSharedValue(1);
  const rarityColor = RARITY_COLORS[rarity];
  const entry = getEntry(id);
  const spotted = entry?.timesSpotted ?? 0;

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <TouchableOpacity
      activeOpacity={1}
      style={styles.touchable}
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.96, { damping: 16 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 16 }); }}
    >
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderRadius: 16,
            borderColor: collected ? `${rarityColor}40` : "#E2E8F0",
            borderWidth: 1,
          },
          animStyle,
        ]}
      >
        {/* Image area */}
        <View style={[styles.imgWrap, { borderRadius: 14 }]}>
          {collected ? (
            <Image
              source={{ uri: userPhotoUri || imageUrl }}
              style={styles.img}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <>
              <Image
                source={{ uri: imageUrl }}
                style={[styles.img, styles.silhouetteImg]}
                contentFit="cover"
                transition={200}
              />
              <View style={styles.silhouetteOverlay} />
            </>
          )}

          {/* Top-left collected badge */}
          {collected && (
            <View style={[styles.collectedBadge, { backgroundColor: rarityColor }]}>
              <Feather name="check" size={10} color="#fff" />
            </View>
          )}

          {/* Top-right heart (collected = filled) */}
          <View style={styles.heartBadge}>
            <Ionicons
              name={collected ? "heart" : "heart-outline"}
              size={16}
              color={collected ? "#EF4444" : "rgba(255,255,255,0.7)"}
            />
          </View>
        </View>

        {/* Text info */}
        <View style={styles.info}>
          <Text
            style={[styles.name, { color: collected ? "#1E293B" : "#94A3B8" }]}
            numberOfLines={1}
          >
            {collected ? name : "???"}
          </Text>
          <View style={styles.rarityRow}>
            <View style={[styles.rarityDot, { backgroundColor: rarityColor }]} />
            <Text style={[styles.rarityLabel, { color: rarityColor }]}>
              {RARITY_LABELS[rarity]}
            </Text>
          </View>
        </View>

        {/* Bottom spotted progress */}
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min((spotted / 4) * 100, 100)}%`, backgroundColor: rarityColor },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: rarityColor }]}>
            {spotted}/4
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    flex: 1,
    marginHorizontal: 6,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    padding: 8,
    paddingBottom: 10,
  },
  imgWrap: {
    height: 120,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#F1F5F9",
  },
  img: { width: "100%", height: "100%" },
  silhouetteImg: { opacity: 0.25 },
  silhouetteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(180,185,195,0.5)",
  },

  /* Badges */
  collectedBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  heartBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Info */
  info: { paddingTop: 10, paddingHorizontal: 4, gap: 4 },
  name: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    lineHeight: 18,
  },
  rarityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  rarityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  rarityLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },

  /* Bottom progress */
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    minWidth: 20,
    textAlign: "right",
  },
});
