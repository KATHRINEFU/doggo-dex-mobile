import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useCollection, XP_LEVELS } from "@/context/CollectionContext";
import { MedalCard } from "@/components/MedalCard";

const RARITY_COLORS: Record<string, string> = {
  common: "#34D399",
  uncommon: "#60A5FA",
  rare: "#A78BFA",
  legendary: "#FBBF24",
};

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { medals, collectionCount, xp, xpLevel, streak, collectedDogs } = useCollection();

  const nextLevel = XP_LEVELS[XP_LEVELS.indexOf(xpLevel) + 1];
  const xpProgress = nextLevel ? (xp - xpLevel.min) / (nextLevel.min - xpLevel.min) : 1;
  const unlockedMedals = medals.filter((m) => m.unlocked).length;

  const rarityBreakdown = (["legendary", "rare", "uncommon", "common"] as const).map((r) => ({
    rarity: r,
    count: collectedDogs.filter((d) => d.rarity === r).length,
    color: RARITY_COLORS[r],
    label: { common: "Common", uncommon: "Uncommon", rare: "Rare", legendary: "Legendary" }[r],
  }));

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#4BB8FA", "#3A8FDC", "#2C5EAD"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      />

      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 70 : 16) }]}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Field Journal</Text>
            <Text style={styles.subtitle}>Your DogDex adventure log</Text>
          </View>
          <Pressable
            style={styles.settingsBtn}
            onPress={() => router.push("/profile")}
            hitSlop={8}
          >
            <Feather name="settings" size={20} color="rgba(255,255,255,0.85)" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* XP card */}
        <View style={styles.card}>
          <View style={styles.xpTop}>
            <View>
              <Text style={styles.xpLevelName}>{xpLevel.name}</Text>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
                <Text style={styles.xpValue}>{xp}</Text>
                <Text style={styles.xpUnit}>XP total</Text>
              </View>
            </View>
            <View style={[styles.streakBadge, { borderColor: streak > 0 ? "rgba(251,146,60,0.5)" : "rgba(255,255,255,0.25)" }]}>
              <Feather name={"sun" as any} size={18} color={streak > 0 ? "#FB923C" : "rgba(255,255,255,0.5)"} />
              <Text style={[styles.streakNum, { color: streak > 0 ? "#FB923C" : "rgba(255,255,255,0.5)" }]}>{streak}</Text>
              <Text style={styles.streakLabel}>day streak</Text>
            </View>
          </View>
          <View style={styles.xpTrack}>
            <LinearGradient
              colors={["#5AC8FA", "#007AFF"]}
              style={[styles.xpFill, { width: `${xpProgress * 100}%` }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
          {nextLevel && (
            <Text style={styles.xpNext}>{nextLevel.min - xp} XP to {nextLevel.name}</Text>
          )}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { icon: "hash", value: String(collectionCount), label: "Breeds found" },
            { icon: "award", value: String(unlockedMedals), label: "Badges earned" },
            { icon: "map-pin", value: rarityBreakdown[0].count > 0 ? "Yes!" : "Not yet", label: "Legendary found" },
          ].map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Rarity breakdown */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>RARITY BREAKDOWN</Text>
          {rarityBreakdown.map((r) => (
            <View key={r.rarity} style={styles.rarityRow}>
              <View style={[styles.rarityDot, { backgroundColor: r.color }]} />
              <Text style={styles.rarityName}>{r.label}</Text>
              <Text style={[styles.rarityCount, { color: r.count > 0 ? r.color : "rgba(255,255,255,0.4)" }]}>
                {r.count}
              </Text>
            </View>
          ))}
        </View>

        {/* Badges */}
        <Text style={[styles.sectionLabel, { marginTop: 8 }]}>BADGES</Text>
        <Text style={styles.badgeHint}>Earn a badge every 10 breeds</Text>
        {medals.map((medal) => (
          <MedalCard key={medal.id} medal={medal} currentCount={collectionCount} />
        ))}

        {/* Tips */}
        <Text style={[styles.sectionLabel, { marginTop: 8 }]}>FIELD NOTES</Text>
        <View style={styles.card}>
          {[
            "Photos with 70%+ confidence are auto-added to your DogDex.",
            "Legendary breeds need dedicated hunting — try dog shows!",
            "Snap one dog a day to build your discovery streak.",
            "Clear, bright photos give the best breed detection.",
          ].map((tip, i, arr) => (
            <View
              key={i}
              style={[
                styles.tip,
                i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.2)" },
              ]}
            >
              <Feather name="info" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const CARD_BG = "rgba(255,255,255,0.14)";
const CARD_BORDER = "rgba(255,255,255,0.28)";

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  titleRow: { flexDirection: "row", alignItems: "center" },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: "Georgia", fontSize: 32, color: "#FFFFFF", marginBottom: 2 },
  subtitle: { fontFamily: "Inter_400Regular", fontStyle: "italic", fontSize: 14, color: "rgba(255,255,255,0.72)" },
  content: { padding: 20, gap: 12 },
  sectionLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 1.5, color: "rgba(255,255,255,0.65)" },
  badgeHint: { fontFamily: "Inter_400Regular", fontStyle: "italic", fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: -6 },

  card: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },

  xpTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  xpLevelName: { fontFamily: "Inter_600SemiBold", fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2, color: "#5AC8FA" },
  xpValue: { fontFamily: "Georgia", fontSize: 32, color: "#FFFFFF" },
  xpUnit: { fontSize: 14, color: "rgba(255,255,255,0.6)", fontFamily: "Inter_400Regular" },
  streakBadge: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, alignItems: "center", gap: 2, backgroundColor: "rgba(255,255,255,0.08)" },
  streakNum: { fontFamily: "Inter_700Bold", fontSize: 22 },
  streakLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: "rgba(255,255,255,0.55)" },
  xpTrack: { height: 7, borderRadius: 4, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.2)" },
  xpFill: { height: "100%", borderRadius: 4 },
  xpNext: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.6)" },

  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  statIcon: { fontSize: 24 },
  statValue: { fontFamily: "Georgia", fontSize: 20, color: "#FFFFFF" },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "center", color: "rgba(255,255,255,0.65)" },

  rarityRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  rarityDot: { width: 10, height: 10, borderRadius: 5 },
  rarityName: { fontFamily: "Inter_500Medium", fontSize: 14, flex: 1, color: "#FFFFFF" },
  rarityCount: { fontFamily: "Inter_700Bold", fontSize: 16 },

  tip: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 12 },
  tipText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20, flex: 1, color: "rgba(255,255,255,0.85)" },
});
