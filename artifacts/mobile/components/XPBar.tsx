import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { XP_LEVELS } from "@/context/CollectionContext";

interface Props {
  xp: number;
  levelName: string;
  compact?: boolean;
}

export function XPBar({ xp, levelName, compact }: Props) {
  const colors = useColors();

  const currentLevel = XP_LEVELS.findLast((l) => xp >= l.min) ?? XP_LEVELS[0];
  const nextLevel = XP_LEVELS[XP_LEVELS.indexOf(currentLevel) + 1];

  const progress = nextLevel
    ? (xp - currentLevel.min) / (nextLevel.min - currentLevel.min)
    : 1;

  if (compact) {
    return (
      <View style={styles.compactRow}>
        <Text style={[styles.compactLevel, { color: colors.primary }]}>{levelName}</Text>
        <View style={[styles.compactTrack, { backgroundColor: colors.secondary }]}>
          <View
            style={[
              styles.compactFill,
              { backgroundColor: colors.primary, width: `${progress * 100}%` },
            ]}
          />
        </View>
        <Text style={[styles.compactXP, { color: colors.mutedForeground }]}>{xp} XP</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <View style={[styles.levelBadge, { backgroundColor: `${colors.primary}22`, borderColor: `${colors.primary}44` }]}>
          <Text style={[styles.levelText, { color: colors.primary }]}>{levelName}</Text>
        </View>
        <Text style={[styles.xpText, { color: colors.mutedForeground }]}>
          {xp} XP{nextLevel ? ` / ${nextLevel.min}` : ""}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.secondary }]}>
        <View
          style={[styles.fill, { backgroundColor: colors.primary, width: `${progress * 100}%` }]}
        />
      </View>
      {nextLevel && (
        <Text style={[styles.nextLabel, { color: colors.mutedForeground }]}>
          Next: {nextLevel.name} ({nextLevel.min - xp} XP to go)
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  levelBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  levelText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  xpText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
  nextLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  compactRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  compactLevel: { fontSize: 11, fontFamily: "Inter_700Bold", width: 46 },
  compactTrack: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  compactFill: { height: "100%", borderRadius: 2 },
  compactXP: { fontSize: 10, fontFamily: "Inter_400Regular", width: 44, textAlign: "right" },
});
