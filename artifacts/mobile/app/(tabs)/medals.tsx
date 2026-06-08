import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useCollection } from "@/context/CollectionContext";
import { MedalCard } from "@/components/MedalCard";

export default function MedalsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { medals, collectionCount } = useCollection();

  const unlocked = medals.filter((m) => m.unlocked).length;
  const nextMedal = medals.find((m) => !m.unlocked);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#0B1626", "#0d2040"]}
        style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.primary }]}>Medals</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              {unlocked}/{medals.length} earned
            </Text>
          </View>
          <View style={[styles.trophyBadge, { backgroundColor: `${colors.primary}22`, borderColor: `${colors.primary}44` }]}>
            <Ionicons name="trophy" size={28} color={colors.primary} />
          </View>
        </View>

        {nextMedal ? (
          <View style={[styles.nextBanner, { backgroundColor: colors.secondary, borderColor: `${colors.primary}44` }]}>
            <Ionicons name="ribbon" size={16} color={colors.primary} />
            <Text style={[styles.nextText, { color: colors.foreground }]}>
              <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold" }}>{nextMedal.name}</Text>
              {" — "}{nextMedal.required - collectionCount} more breeds to go!
            </Text>
          </View>
        ) : (
          <View style={[styles.nextBanner, { backgroundColor: `${colors.primary}22`, borderColor: `${colors.primary}55` }]}>
            <Ionicons name="trophy" size={16} color={colors.primary} />
            <Text style={[styles.nextText, { color: colors.primary }]}>
              All medals earned! Legendary DogDex Master!
            </Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Achievements</Text>
        {medals.map((medal) => (
          <MedalCard key={medal.id} medal={medal} currentCount={collectionCount} />
        ))}

        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 8 }]}>
          Pro Tips
        </Text>
        <View style={[styles.tipsCard, { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border }]}>
          {[
            "Legendary breeds are ultra-rare — stay on the lookout!",
            "Dog parks and shows are great spots for uncommon breeds.",
            "Clear, well-lit photos give the best detection accuracy.",
            "Each breed can only be added once to your DogDex.",
          ].map((tip, i) => (
            <View
              key={i}
              style={[
                styles.tip,
                i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
              ]}
            >
              <Ionicons name="paw" size={14} color={colors.primary} />
              <Text style={[styles.tipText, { color: colors.foreground }]}>{tip}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  trophyBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  nextBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  nextText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  tipsCard: {
    borderWidth: 1,
    overflow: "hidden",
  },
  tip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
  },
  tipText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    flex: 1,
  },
});
