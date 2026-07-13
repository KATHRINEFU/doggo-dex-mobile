import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Medal } from "@/context/CollectionContext";

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

const EMOJI_MAP: Record<string, string> = {
  b10: "🐾",
  b20: "🔍",
  b30: "🐺",
  b40: "🎙️",
  b50: "🎀",
  b60: "🏠",
  b70: "⭐",
  b80: "🏅",
  b90: "🔥",
  b100: "🏆",
};

export function MedalCard({ medal, currentCount }: Props) {
  const progress = Math.min(currentCount / medal.required, 1);
  const gradColors = TIER_GRADIENTS[medal.id] ?? ["#5AC8FA", "#007AFF"];
  const emoji = EMOJI_MAP[medal.id] ?? "🏅";

  return (
    <View style={[styles.card, medal.unlocked && styles.cardUnlocked]}>
      {/* Glow behind unlocked badges */}
      {medal.unlocked && (
        <View style={[styles.glow, { backgroundColor: gradColors[0] + "30" }]} />
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
            <Text style={styles.iconEmoji}>{emoji}</Text>
          </LinearGradient>
        ) : (
          <View style={styles.iconLocked}>
            <Text style={[styles.iconEmoji, { opacity: 0.35 }]}>{emoji}</Text>
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
              <Text style={[styles.earnedText, { color: gradColors[0] }]}>Earned ✓</Text>
            </View>
          )}
        </View>

        <Text style={styles.desc}>{medal.description}</Text>

        {/* Progress bar */}
        <View style={styles.track}>
          {medal.unlocked ? (
            <LinearGradient
              colors={gradColors}
              style={styles.fillFull}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          ) : (
            <View
              style={[
                styles.fillPartial,
                { width: `${progress * 100}%` },
              ]}
            />
          )}
        </View>

        <Text style={styles.countLabel}>
          {Math.min(currentCount, medal.required)}/{medal.required} breeds
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(15, 50, 120, 0.72)",
    marginBottom: 10,
    overflow: "hidden",
  },
  cardUnlocked: {
    borderColor: "rgba(255,255,255,0.30)",
    backgroundColor: "rgba(20, 60, 140, 0.80)",
  },
  glow: {
    position: "absolute",
    top: -20,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
  },

  iconOuter: {
    width: 54,
    height: 54,
    borderRadius: 27,
    overflow: "hidden",
    flexShrink: 0,
  },
  iconGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  iconLocked: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: 27,
  },
  iconEmoji: { fontSize: 26 },

  body: { flex: 1, gap: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#FFFFFF", flex: 1 },
  nameLocked: { color: "rgba(255,255,255,0.45)" },

  earnedPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  earnedText: { fontFamily: "Inter_600SemiBold", fontSize: 10 },

  desc: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.55)" },

  track: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.15)",
    marginTop: 2,
  },
  fillFull: { height: "100%", borderRadius: 3, width: "100%" },
  fillPartial: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.4)",
  },

  countLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
  },
});
