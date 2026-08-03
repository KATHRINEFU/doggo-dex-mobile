import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { CollectedDog, Medal } from "@/context/CollectionContext";

export const SHARE_CARD_WIDTH = 360;
export const SHARE_CARD_HEIGHT = 520;

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

interface Props {
  medal: Medal;
  dogs: CollectedDog[];
  /** Called once per image when it finishes loading (or fails). */
  onImageSettled?: () => void;
}

/**
 * The pre-rendered share card for an unlocked badge.
 * Rendered off-screen and captured to a PNG by BadgeShareProvider.
 */
export function BadgeShareCard({ medal, dogs, onImageSettled }: Props) {
  const gradColors = TIER_GRADIENTS[medal.id] ?? ["#5AC8FA", "#007AFF"];
  const icon = ICON_MAP[medal.id] ?? "award";

  // Show up to the badge requirement, capped at 20 thumbnails (4 cols)
  const photos = dogs.slice(0, Math.min(medal.required, 20));
  const COLS = 4;
  const GRID_GAP = 8;
  const GRID_W = SHARE_CARD_WIDTH - 48;
  const CELL = (GRID_W - GRID_GAP * (COLS - 1)) / COLS;

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={["#4BB8FA", "#2C5EAD", "#1A3A6E"]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      />

      {/* Header */}
      <Text style={styles.appName}>DOGGO DEX</Text>

      {/* Badge icon */}
      <View style={styles.iconOuter}>
        <LinearGradient
          colors={gradColors}
          style={styles.iconGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Feather name={icon as any} size={34} color="#F59E0B" />
        </LinearGradient>
      </View>

      <Text style={styles.badgeName}>{medal.name}</Text>
      <Text style={styles.badgeDesc}>
        {medal.required} dog breeds discovered
      </Text>

      {/* Collected dogs grid */}
      <View style={[styles.grid, { width: GRID_W, gap: GRID_GAP }]}>
        {photos.map((d) => (
          <Image
            key={d.breedId}
            source={{ uri: d.imageUri }}
            style={{
              width: CELL,
              height: CELL,
              borderRadius: 10,
              borderWidth: 1.5,
              borderColor: "rgba(255,255,255,0.5)",
              backgroundColor: "rgba(255,255,255,0.15)",
            }}
            contentFit="cover"
            cachePolicy="disk"
            onLoad={onImageSettled}
            onError={onImageSettled}
          />
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Feather name="camera" size={13} color="rgba(255,255,255,0.75)" />
        <Text style={styles.footerText}>Can you beat me? Scan dogs & collect breeds!</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    borderRadius: 0,
    overflow: "hidden",
    alignItems: "center",
    paddingTop: 28,
    paddingHorizontal: 24,
  },
  appName: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 4,
    color: "rgba(255,255,255,0.85)",
    marginBottom: 18,
  },
  iconOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
  },
  iconGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeName: {
    fontFamily: "Georgia",
    fontSize: 26,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  badgeDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    marginBottom: 18,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
  },
});
