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

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: medal.unlocked ? colors.card : colors.muted,
          borderRadius: colors.radius,
          borderColor: medal.unlocked ? colors.legendary : colors.border,
          borderWidth: medal.unlocked ? 2 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: medal.unlocked ? colors.legendary : colors.border,
          },
        ]}
      >
        <Ionicons
          name={
            medal.icon === "paw"
              ? "paw"
              : medal.icon === "search"
              ? "search"
              : medal.icon === "star"
              ? "star"
              : "trophy"
          }
          size={28}
          color={medal.unlocked ? "#fff" : colors.mutedForeground}
        />
      </View>
      <View style={styles.content}>
        <Text
          style={[
            styles.name,
            { color: medal.unlocked ? colors.foreground : colors.mutedForeground },
          ]}
        >
          {medal.name}
        </Text>
        <Text style={[styles.description, { color: colors.mutedForeground }]}>
          {medal.description}
        </Text>
        {/* Progress bar */}
        <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: medal.unlocked ? colors.legendary : colors.primary,
                width: `${progress * 100}%`,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
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
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 8,
  },
  progressBg: {
    height: 6,
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
