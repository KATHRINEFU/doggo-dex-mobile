import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useCollection, XP_LEVELS } from "@/context/CollectionContext";
import { MedalCard } from "@/components/MedalCard";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { medals, collectionCount, xp, xpLevel, streak, collectedDogs } = useCollection();

  const nextLevel = XP_LEVELS[XP_LEVELS.indexOf(xpLevel) + 1];
  const xpProgress = nextLevel
    ? (xp - xpLevel.min) / (nextLevel.min - xpLevel.min)
    : 1;

  const unlockedMedals = medals.filter((m) => m.unlocked).length;

  const rarityBreakdown = (["legendary", "rare", "uncommon", "common"] as const).map((r) => ({
    rarity: r,
    count: collectedDogs.filter((d) => d.rarity === r).length,
    color: { common: "#6B9E4A", uncommon: "#5B7A9E", rare: "#9B6FA8", legendary: "#C8943A" }[r],
    label: { common: "Common", uncommon: "Uncommon", rare: "Rare", legendary: "Legendary" }[r],
  }));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 70 : 16) }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Field Journal</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Your DogDex adventure log</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>

        {/* XP card */}
        <View style={[styles.xpCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={styles.xpTop}>
            <View>
              <Text style={[styles.xpLevelName, { color: colors.primary }]}>{xpLevel.name}</Text>
              <Text style={[styles.xpValue, { color: colors.foreground }]}>{xp} <Text style={{ fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>XP total</Text></Text>
            </View>
            <View style={[styles.streakBadge, { backgroundColor: streak > 0 ? "#FF6B3520" : colors.muted, borderColor: streak > 0 ? "#FF6B3560" : colors.border }]}>
              <Text style={{ fontSize: 18 }}>🔥</Text>
              <Text style={[styles.streakNum, { color: streak > 0 ? "#FF6B35" : colors.mutedForeground }]}>{streak}</Text>
              <Text style={[styles.streakLabel, { color: colors.mutedForeground }]}>day streak</Text>
            </View>
          </View>
          <View style={[styles.xpTrack, { backgroundColor: colors.muted }]}>
            <View style={[styles.xpFill, { backgroundColor: colors.primary, width: `${xpProgress * 100}%` }]} />
          </View>
          {nextLevel && (
            <Text style={[styles.xpNext, { color: colors.mutedForeground }]}>
              {nextLevel.min - xp} XP to {nextLevel.name}
            </Text>
          )}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { icon: "🐕", value: String(collectionCount), label: "Breeds found" },
            { icon: "🏅", value: String(unlockedMedals), label: "Badges earned" },
            { icon: "📍", value: rarityBreakdown[0].count > 0 ? "Yes!" : "Not yet", label: "Legendary found" },
          ].map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14 }]}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Rarity breakdown */}
        <View style={[styles.rarityCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>RARITY BREAKDOWN</Text>
          {rarityBreakdown.map((r) => (
            <View key={r.rarity} style={styles.rarityRow}>
              <View style={[styles.rarityDot, { backgroundColor: r.color }]} />
              <Text style={[styles.rarityName, { color: colors.foreground }]}>{r.label}</Text>
              <Text style={[styles.rarityCount, { color: r.count > 0 ? r.color : colors.mutedForeground }]}>{r.count}</Text>
            </View>
          ))}
        </View>

        {/* Badges */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 8 }]}>BADGES</Text>
        <Text style={[styles.badgeHint, { color: colors.mutedForeground }]}>Earn a badge every 10 breeds</Text>
        {medals.map((medal) => (
          <MedalCard key={medal.id} medal={medal} currentCount={collectionCount} />
        ))}

        {/* Tips */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 8 }]}>FIELD NOTES</Text>
        <View style={[styles.tipsCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          {[
            "Photos with 70%+ confidence are auto-added to your DogDex.",
            "Legendary breeds need dedicated hunting — try dog shows!",
            "Snap one dog a day to build your discovery streak.",
            "Clear, bright photos give the best breed detection.",
          ].map((tip, i, arr) => (
            <View key={i} style={[styles.tip, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <Text style={{ fontSize: 14 }}>🌿</Text>
              <Text style={[styles.tipText, { color: colors.foreground }]}>{tip}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontFamily: "Georgia", fontSize: 32, marginBottom: 2 },
  subtitle: { fontFamily: "Inter_400Regular", fontStyle: "italic", fontSize: 14 },
  content: { padding: 20, gap: 12 },

  xpCard: { borderWidth: 1, padding: 18, gap: 12 },
  xpTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  xpLevelName: { fontFamily: "Inter_600SemiBold", fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 },
  xpValue: { fontFamily: "Georgia", fontSize: 32 },
  streakBadge: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, alignItems: "center", gap: 2 },
  streakNum: { fontFamily: "Inter_700Bold", fontSize: 22 },
  streakLabel: { fontFamily: "Inter_400Regular", fontSize: 10 },
  xpTrack: { height: 7, borderRadius: 4, overflow: "hidden" },
  xpFill: { height: "100%", borderRadius: 4 },
  xpNext: { fontFamily: "Inter_400Regular", fontSize: 12 },

  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, borderWidth: 1, padding: 14, alignItems: "center", gap: 4 },
  statIcon: { fontSize: 24 },
  statValue: { fontFamily: "Georgia", fontSize: 20 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "center" },

  rarityCard: { borderWidth: 1, padding: 16, gap: 10 },
  sectionLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 1.5 },
  badgeHint: { fontFamily: "Inter_400Regular", fontStyle: "italic", fontSize: 13, marginTop: -6 },
  rarityRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  rarityDot: { width: 10, height: 10, borderRadius: 5 },
  rarityName: { fontFamily: "Inter_500Medium", fontSize: 14, flex: 1 },
  rarityCount: { fontFamily: "Inter_700Bold", fontSize: 16 },

  tipsCard: { borderWidth: 1, overflow: "hidden" },
  tip: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14 },
  tipText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20, flex: 1 },
});
