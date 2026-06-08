import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { Medal } from "@/context/CollectionContext";

interface Props {
  medal: Medal;
  currentCount: number;
}

export function MedalCard({ medal, currentCount }: Props) {
  const colors = useColors();
  const progress = Math.min(currentCount / medal.required, 1);

  const iconName =
    medal.icon === "paw"
      ? "paw"
      : medal.icon === "search"
      ? "search"
      : medal.icon === "star"
      ? "star"
      : "trophy";

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          borderColor: medal.unlocked ? colors.primary : colors.border,
          borderWidth: medal.unlocked ? 1.5 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: medal.unlocked ? `${colors.primary}22` : colors.secondary,
            borderColor: medal.unlocked ? `${colors.primary}55` : colors.border,
          },
        ]}
      >
        <Ionicons
          name={iconName}
          size={26}
          color={medal.unlocked ? colors.primary : colors.mutedForeground}
        />
      </View>
      <View style={styles.content}>
        <Text
          style={[
            styles.name,
            { color: medal.unlocked ? colors.primary : colors.mutedForeground },
          ]}
        >
          {medal.name}
        </Text>
        <Text style={[styles.description, { color: colors.mutedForeground }]}>
          {medal.description}
        </Text>
        <View style={[styles.progressBg, { backgroundColor: colors.secondary }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: medal.unlocked ? colors.primary : colors.accent,
                width: `${progress * 100}%`,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
          {Math.min(currentCount, medal.required)}/{medal.required} breeds
          {medal.unlocked ? " — Earned!" : ""}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    borderWidth: 1,
  },
  content: { flex: 1 },
  name: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 8,
  },
  progressBg: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
