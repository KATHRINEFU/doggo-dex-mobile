import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useCollection } from "@/context/CollectionContext";
import { useGetDogBreeds } from "@workspace/api-client-react";

const REGION_BREEDS: { region: string; flag: string; breeds: string[] }[] = [
  { region: "United Kingdom", flag: "🇬🇧", breeds: ["labrador-retriever", "bulldog", "border-collie", "english-setter", "airedale-terrier", "bull-terrier", "west-highland-white-terrier", "scottish-terrier", "cairn-terrier", "whippet", "greyhound", "bloodhound", "bullmastiff", "irish-wolfhound"] },
  { region: "Germany", flag: "🇩🇪", breeds: ["german-shepherd", "dachshund", "boxer", "doberman-pinscher", "rottweiler", "poodle", "weimaraner", "miniature-schnauzer", "standard-schnauzer", "giant-schnauzer", "german-shorthaired-pointer"] },
  { region: "France", flag: "🇫🇷", breeds: ["french-bulldog", "papillon"] },
  { region: "Japan", flag: "🇯🇵", breeds: ["shiba-inu", "akita"] },
  { region: "United States", flag: "🇺🇸", breeds: ["cocker-spaniel", "english-springer-spaniel", "boston-terrier", "portuguese-water-dog", "catahoula-leopard-dog", "alaskan-klee-kai", "american-foxhound", "treeing-walker-coonhound", "american-hairless-terrier", "carolina-dog", "chesapeake-bay-retriever", "nova-scotia-duck-tolling-retriever"] },
  { region: "Switzerland", flag: "🇨🇭", breeds: ["bernese-mountain-dog", "saint-bernard"] },
  { region: "China / Tibet", flag: "🇨🇳", breeds: ["shih-tzu", "chow-chow", "pug", "tibetan-mastiff"] },
  { region: "Russia / Siberia", flag: "🇷🇺", breeds: ["siberian-husky", "samoyed"] },
  { region: "Scotland", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", breeds: ["golden-retriever", "shetland-sheepdog", "collie", "welsh-corgi-pembroke", "welsh-corgi-cardigan", "gordon-setter"] },
  { region: "Middle East / Africa", flag: "🌍", breeds: ["saluki", "azawakh", "basenji", "canaan-dog", "pharaoh-hound", "ibizan-hound"] },
  { region: "Italy", flag: "🇮🇹", breeds: ["cane-corso", "lagotto-romagnolo", "spinone-italiano", "cirneco-dell-etna"] },
  { region: "Belgium", flag: "🇧🇪", breeds: ["belgian-malinois", "bouvier-des-flandres", "bichon-frise"] },
  { region: "Asia", flag: "🌏", breeds: ["korean-jindo", "thai-ridgeback", "xoloitzcuintli", "peruvian-inca-orchid"] },
];

export default function MapScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isCollected, collectionCount } = useCollection();

  const regionStats = REGION_BREEDS.map((r) => {
    const total = r.breeds.length;
    const collected = r.breeds.filter((id) => isCollected(id)).length;
    return { ...r, total, collected, pct: total > 0 ? collected / total : 0 };
  }).sort((a, b) => b.pct - a.pct);

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
        <Text style={styles.title}>Breed Origins</Text>
        <Text style={styles.subtitle}>Dogs come from all over the world</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Globe card */}
        <View style={styles.card}>
          <Text style={styles.globe}>🌍</Text>
          <Text style={styles.cardTitle}>World Collection</Text>
          <Text style={styles.cardSub}>You've discovered dogs from around the globe</Text>
          <Text style={styles.cardCount}>{collectionCount} breeds found</Text>
        </View>

        <Text style={styles.sectionLabel}>BY REGION</Text>

        {regionStats.map((r) => (
          <View key={r.region} style={styles.regionRow}>
            <Text style={styles.flag}>{r.flag}</Text>
            <View style={styles.regionInfo}>
              <View style={styles.regionTopRow}>
                <Text style={styles.regionName}>{r.region}</Text>
                <Text style={[styles.regionCount, { color: r.collected > 0 ? "#5AC8FA" : "rgba(255,255,255,0.45)" }]}>
                  {r.collected}/{r.total}
                </Text>
              </View>
              <View style={styles.bar}>
                <LinearGradient
                  colors={["#5AC8FA", "#007AFF"]}
                  style={[styles.barFill, { width: `${r.pct * 100}%` }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
            </View>
          </View>
        ))}

        <View style={styles.comingSoon}>
          <Text style={{ fontSize: 28 }}>🗺️</Text>
          <Text style={styles.comingSoonTitle}>Interactive Map Coming Soon</Text>
          <Text style={styles.comingSoonSub}>See every breed pinned on a world map</Text>
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
  title: { fontFamily: "Georgia", fontSize: 32, color: "#FFFFFF", marginBottom: 2 },
  subtitle: { fontFamily: "Inter_400Regular", fontStyle: "italic", fontSize: 14, color: "rgba(255,255,255,0.75)" },
  content: { padding: 20, gap: 10 },

  card: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  globe: { fontSize: 52 },
  cardTitle: { fontFamily: "Georgia", fontSize: 22, color: "#FFFFFF" },
  cardSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.75)", textAlign: "center" },
  cardCount: { fontFamily: "Inter_700Bold", fontSize: 18, marginTop: 4, color: "#5AC8FA" },

  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.5,
    marginTop: 4,
    marginBottom: 2,
    color: "rgba(255,255,255,0.6)",
  },

  regionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 16,
    padding: 14,
  },
  flag: { fontSize: 28, width: 36 },
  regionInfo: { flex: 1, gap: 6 },
  regionTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  regionName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#FFFFFF" },
  regionCount: { fontFamily: "Inter_700Bold", fontSize: 13 },
  bar: { height: 5, borderRadius: 3, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.2)" },
  barFill: { height: "100%", borderRadius: 3 },

  comingSoon: {
    borderWidth: 1,
    borderColor: "rgba(90,200,250,0.35)",
    backgroundColor: "rgba(90,200,250,0.1)",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  comingSoonTitle: { fontFamily: "Georgia", fontSize: 17, color: "#5AC8FA" },
  comingSoonSub: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", color: "rgba(255,255,255,0.65)" },
});
