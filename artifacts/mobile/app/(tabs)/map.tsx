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
  const { data: allBreeds } = useGetDogBreeds();

  const regionStats = REGION_BREEDS.map((r) => {
    const total = r.breeds.length;
    const collected = r.breeds.filter((id) => isCollected(id)).length;
    return { ...r, total, collected, pct: total > 0 ? collected / total : 0 };
  }).sort((a, b) => b.pct - a.pct);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 70 : 16) }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Breed Origins</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Dogs come from all over the world
        </Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>
        {/* Globe card */}
        <View style={[styles.globeCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={styles.globe}>🌍</Text>
          <Text style={[styles.globeTitle, { color: colors.foreground }]}>World Collection</Text>
          <Text style={[styles.globeSub, { color: colors.mutedForeground }]}>
            You've discovered dogs from around the globe
          </Text>
          <Text style={[styles.globeCount, { color: colors.primary }]}>{collectionCount} breeds found</Text>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>BY REGION</Text>

        {regionStats.map((r) => (
          <View
            key={r.region}
            style={[styles.regionRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
          >
            <Text style={styles.flag}>{r.flag}</Text>
            <View style={styles.regionInfo}>
              <View style={styles.regionTopRow}>
                <Text style={[styles.regionName, { color: colors.foreground }]}>{r.region}</Text>
                <Text style={[styles.regionCount, { color: r.collected > 0 ? colors.primary : colors.mutedForeground }]}>
                  {r.collected}/{r.total}
                </Text>
              </View>
              <View style={[styles.bar, { backgroundColor: colors.muted }]}>
                <View style={[styles.barFill, { backgroundColor: colors.primary, width: `${r.pct * 100}%` }]} />
              </View>
            </View>
          </View>
        ))}

        <View style={[styles.comingSoon, { backgroundColor: `${colors.primary}11`, borderColor: `${colors.primary}33`, borderRadius: colors.radius }]}>
          <Text style={{ fontSize: 28 }}>🗺️</Text>
          <Text style={[styles.comingSoonTitle, { color: colors.primary }]}>Interactive Map Coming Soon</Text>
          <Text style={[styles.comingSoonSub, { color: colors.mutedForeground }]}>
            See every breed pinned on a world map
          </Text>
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
  content: { padding: 20, gap: 10 },
  globeCard: { borderWidth: 1, padding: 24, alignItems: "center", gap: 6, marginBottom: 8 },
  globe: { fontSize: 52 },
  globeTitle: { fontFamily: "Georgia", fontSize: 22 },
  globeSub: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" },
  globeCount: { fontFamily: "Inter_700Bold", fontSize: 18, marginTop: 4 },
  sectionLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 1.5, marginTop: 4, marginBottom: 2 },
  regionRow: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, padding: 14 },
  flag: { fontSize: 28, width: 36 },
  regionInfo: { flex: 1, gap: 6 },
  regionTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  regionName: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  regionCount: { fontFamily: "Inter_700Bold", fontSize: 13 },
  bar: { height: 5, borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },
  comingSoon: { borderWidth: 1, padding: 24, alignItems: "center", gap: 8, marginTop: 8 },
  comingSoonTitle: { fontFamily: "Georgia", fontSize: 17 },
  comingSoonSub: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" },
});
