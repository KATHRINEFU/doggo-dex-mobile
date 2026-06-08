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
        colors={["#3396D3", "#1a7ab5"]}
        style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}
      >
        <Text style={styles.headerTitle}>Medals</Text>
        <Text style={styles.headerSub}>
          {unlocked}/{medals.length} earned
        </Text>

        {nextMedal && (
          <View style={styles.nextMedalBanner}>
            <Ionicons name="ribbon" size={18} color="#FFF0CE" />
            <Text style={styles.nextMedalText}>
              Next: {nextMedal.name} — {nextMedal.required - collectionCount} more to go!
            </Text>
          </View>
        )}
        {!nextMedal && (
          <View style={styles.nextMedalBanner}>
            <Ionicons name="trophy" size={18} color="#FFF0CE" />
            <Text style={styles.nextMedalText}>All medals earned! You're a DogDex legend!</Text>
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
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your Achievements</Text>
        {medals.map((medal) => (
          <MedalCard key={medal.id} medal={medal} currentCount={collectionCount} />
        ))}

        {/* Tips section */}
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 8 }]}>
          Tips for Collectors
        </Text>
        <View style={[styles.tipsCard, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          {[
            "Legendary breeds are the rarest — keep your eyes peeled!",
            "Visit dog parks, shelters, and shows to spot uncommon breeds.",
            "Try photos from different angles for better detection accuracy.",
            "Some rare breeds only appear in specific countries.",
          ].map((tip, i) => (
            <View key={i} style={[styles.tip, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <Ionicons name="paw" size={16} color={colors.primary} />
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
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
    marginBottom: 12,
  },
  nextMedalBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  nextMedalText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#FFF0CE",
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
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
