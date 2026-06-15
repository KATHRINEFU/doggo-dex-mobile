import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useCollection } from "@/context/CollectionContext";
import { DogCard } from "@/components/DogCard";
import { useGetDogBreeds } from "@workspace/api-client-react";

type FilterType = "all" | "common" | "uncommon" | "rare" | "legendary";
type SortType = "default" | "newest" | "name";

export default function CollectionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { collectedDogs, isCollected, collectionCount } = useCollection();
  const { data: allBreeds, isLoading } = useGetDogBreeds();

  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortType>("default");
  const [search, setSearch] = useState("");

  const filteredBreeds = useMemo(() => {
    if (!allBreeds) return [];
    let list = allBreeds;

    // Filter by rarity
    if (filter !== "all") list = list.filter((b) => b.rarity === filter);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((b) => isCollected(b.id) && b.name.toLowerCase().includes(q));
    }

    // Sort
    if (sort === "newest") {
      const collectedMap = Object.fromEntries(collectedDogs.map((d) => [d.breedId, d.collectedAt]));
      list = [...list].sort((a, b) => {
        const aDate = collectedMap[a.id] ?? "";
        const bDate = collectedMap[b.id] ?? "";
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return bDate.localeCompare(aDate);
      });
    } else if (sort === "name") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [allBreeds, filter, sort, search, isCollected, collectedDogs]);

  const totalBreeds = allBreeds?.length ?? 100;
  const progressPct = Math.min((collectionCount / totalBreeds) * 100, 100);

  const rarityStats = useMemo(() => {
    if (!allBreeds) return [];
    const rarities = ["common", "uncommon", "rare", "legendary"] as const;
    return rarities.map((r) => ({
      rarity: r,
      label: r.charAt(0).toUpperCase() + r.slice(1),
      total: allBreeds.filter((b) => b.rarity === r).length,
      collected: collectedDogs.filter((d) => {
        const breed = allBreeds.find((b) => b.id === d.breedId);
        return breed?.rarity === r;
      }).length,
      color: { common: colors.common, uncommon: colors.uncommon, rare: colors.rare, legendary: colors.legendary }[r],
    }));
  }, [allBreeds, collectedDogs, colors]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={["#0B1626", "#0d2040"]} style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.primary }]}>DogDex</Text>
          <View style={[styles.countPill, { backgroundColor: colors.primary }]}>
            <Text style={[styles.countPillText, { color: colors.primaryForeground }]}>{collectionCount}/{totalBreeds}</Text>
          </View>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.secondary }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${progressPct}%` }]} />
        </View>

        {/* Rarity filter pills */}
        <View style={styles.rarityRow}>
          <TouchableOpacity
            style={[styles.rarityPill, { backgroundColor: filter === "all" ? colors.primary : colors.secondary, borderColor: filter === "all" ? colors.primary : colors.border }]}
            onPress={() => setFilter("all")}
          >
            <Text style={[styles.rarityPillText, { color: filter === "all" ? colors.primaryForeground : colors.mutedForeground }]}>All</Text>
          </TouchableOpacity>
          {rarityStats.map((s) => (
            <TouchableOpacity
              key={s.rarity}
              style={[styles.rarityPill, { backgroundColor: filter === s.rarity ? `${s.color}33` : colors.secondary, borderColor: filter === s.rarity ? s.color : colors.border }]}
              onPress={() => setFilter(s.rarity as FilterType)}
            >
              <View style={[styles.rarityDot, { backgroundColor: s.color }]} />
              <Text style={[styles.rarityPillText, { color: filter === s.rarity ? s.color : colors.mutedForeground }]}>
                {s.collected}/{s.total}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {/* Search + sort toolbar */}
      <View style={[styles.toolbar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search collected breeds…"
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.sortBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
          onPress={() => setSort((s) => s === "default" ? "newest" : s === "newest" ? "name" : "default")}
        >
          <Ionicons name={sort === "newest" ? "time-outline" : sort === "name" ? "text-outline" : "apps-outline"} size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="paw" size={40} color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading breeds…</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBreeds}
          numColumns={2}
          keyExtractor={(item) => item.id}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100 }]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="paw-outline" size={56} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No breeds found</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                {search ? "Try a different search term." : "Go scan some dogs!"}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <DogCard
              id={item.id}
              name={item.name}
              imageUrl={item.imageUrl}
              rarity={item.rarity}
              group={item.group}
              collected={isCollected(item.id)}
              onPress={() => router.push(`/breed/${item.id}` as any)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12, gap: 10 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  countPill: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  countPillText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  rarityRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  rarityPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  rarityDot: { width: 7, height: 7, borderRadius: 4 },
  rarityPillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  toolbar: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderBottomWidth: 1 },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", padding: 0 },
  sortBtn: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  grid: { padding: 12, gap: 12 },
  row: { gap: 12, justifyContent: "space-between" },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 32 },
});
