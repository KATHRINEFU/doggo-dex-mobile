import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { Medal } from "@/context/CollectionContext";

interface Props {
  medal: Medal;
  currentCount: number;
}

const ICON_MAP: Record<string, string> = {
  paw: "award", search: "search", people: "users", ear: "radio",
  ribbon: "award", home: "home", star: "star", medal: "award", flame: "zap", trophy: "award",
};

export function MedalCard({ medal, currentCount }: Props) {
  const colors = useColors();
  const progress = Math.min(currentCount / medal.required, 1);
  const iconName = ICON_MAP[medal.icon] ?? "award";

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          borderColor: medal.unlocked ? `${colors.primary}55` : colors.border,
          borderWidth: 1,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: medal.unlocked ? `${colors.primary}18` : colors.muted,
            borderColor: medal.unlocked ? `${colors.primary}40` : colors.border,
          },
        ]}
      >
        <Feather name={iconName as any} size={22} color={medal.unlocked ? colors.primary : colors.mutedForeground} />
      </View>

      <View style={styles.body}>
        <Text style={[styles.name, { color: medal.unlocked ? colors.primary : colors.mutedForeground }]}>
          {medal.name}
        </Text>
        <Text style={[styles.desc, { color: colors.mutedForeground }]}>{medal.description}</Text>
        <View style={[styles.track, { backgroundColor: colors.muted }]}>
          <View style={[styles.fill, { backgroundColor: medal.unlocked ? colors.primary : colors.secondary, width: `${progress * 100}%` }]} />
        </View>
        <Text style={[styles.countLabel, { color: colors.mutedForeground }]}>
          {Math.min(currentCount, medal.required)}/{medal.required}
          {medal.unlocked ? " — Earned! 🎉" : ""}
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
    gap: 14,
    shadowColor: "#8B7355",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 8,
  },
  iconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  body: { flex: 1, gap: 4 },
  name: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  desc: { fontFamily: "Inter_400Regular", fontSize: 12 },
  track: { height: 5, borderRadius: 3, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
  countLabel: { fontFamily: "Inter_400Regular", fontSize: 11 },
});
