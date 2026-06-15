import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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

type RarityFilter = "all" | "common" | "uncommon" | "rare" | "legendary";
type SortType = "default" | "newest" | "name";

const RARITY_LABELS: Record<RarityFilter, string> = {
  all: "All",
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  legendary: "Legendary",
};

const RARITY_COLORS: Record<string, string> = {
  common: "#6B9E4A",
  uncommon: "#5B7A9E",
  rare: "#9B6FA8",
  legendary: "#C8943A",
};

export default function CollectionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { collectedDogs, isCollected, collectionCount } = useCollection();
  const { data: allBreeds, isLoading } = useGetDogBreeds();

  const [filter, setFilter] = useState<RarityFilter>("all");
  const [sort, setSort] = useState<SortType>("default");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!allBreeds) return [];
    let list = filter === "all" ? allBreeds : allBreeds.filter((b) => b.rarity === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((b) => isCollected(b.id) && b.name.toLowerCase().includes(q));
    }
    if (sort === "newest") {
      const map = Object.fromEntries(collectedDogs.map((d) => [d.breedId, d.collectedAt]));
      list = [...list].sort((a, b) => {
        const aD = map[a.id] ?? ""; const bD = map[b.id] ?? "";
        if (!aD && !bD) return 0; if (!aD) return 1; if (!bD) return -1;
        return bD.localeCompare(aD);
      });
    } else if (sort === "name") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [allBreeds, filter, sort, search, isCollected, collectedDogs]);

  const total = allBreeds?.length ?? 100;
  const progress = Math.min(collectionCount / total, 1);

  const rarityStats = useMemo(() => {
    if (!allBreeds) return [];
    return (["common", "uncommon", "rare", "legendary"] as const).map((r) => ({
      rarity: r,
      total: allBreeds.filter((b) => b.rarity === r).length,
      collected: collectedDogs.filter((d) => allBreeds.find((b) => b.id === d.breedId)?.rarity === r).length,
    }));
  }, [allBreeds, collectedDogs]);

  const sortIcon = sort === "newest" ? "clock" : sort === "name" ? "type" : "sliders";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 70 : 16) }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>Collection</Text>
          <View style={[styles.countPill, { backgroundColor: colors.primary }]}>
            <Text style={[styles.countPillText, { color: "#fff" }]}>{collectionCount}/{total}</Text>
          </View>
        </View>

        {/* Progress */}
        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${progress * 100}%` }]} />
        </View>

        {/* Rarity stats */}
        <View style={styles.rarityStats}>
          {rarityStats.map((s) => (
            <View key={s.rarity} style={styles.rarityStat}>
              <View style={[styles.rarityDot, { backgroundColor: RARITY_COLORS[s.rarity] }]} />
              <Text style={[styles.rarityStatText, { color: colors.mutedForeground }]}>
                {s.collected}/{s.total}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Search + sort */}
      <View style={[styles.toolbar, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Feather name="search" size={15} color={colors.mutedForeground} />
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
          style={[styles.sortBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={() => setSort((s) => s === "default" ? "newest" : s === "newest" ? "name" : "default")}
        >
          <Feather name={sortIcon} size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Rarity filter pills */}
      <View style={[styles.filterBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(["all", "common", "uncommon", "rare", "legendary"] as RarityFilter[]).map((f) => {
          const isActive = f === filter;
          const dotColor = f === "all" ? colors.primary : RARITY_COLORS[f];
          return (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterPill,
                {
                  backgroundColor: isActive ? `${dotColor}18` : "transparent",
                  borderColor: isActive ? dotColor : colors.border,
                },
              ]}
              onPress={() => setFilter(f)}
            >
              {f !== "all" && <View style={[styles.rarityDot, { backgroundColor: dotColor }]} />}
              <Text style={[styles.filterPillText, { color: isActive ? dotColor : colors.mutedForeground }]}>
                {RARITY_LABELS[f]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <Text style={{ fontSize: 36 }}>🐕</Text>
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading breeds…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          numColumns={2}
          keyExtractor={(item) => item.id}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 90 }]}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={{ fontSize: 48 }}>🔍</Text>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No breeds found</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                {search ? "Try a different search." : "Scan some dogs to start your collection!"}
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
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, gap: 10 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: "Georgia", fontSize: 32 },
  countPill: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  countPillText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  progressTrack: { height: 7, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  rarityStats: { flexDirection: "row", gap: 14 },
  rarityStat: { flexDirection: "row", alignItems: "center", gap: 5 },
  rarityDot: { width: 8, height: 8, borderRadius: 4 },
  rarityStatText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  toolbar: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  searchInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, padding: 0 },
  sortBtn: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  filterBar: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 8, gap: 6, borderBottomWidth: 1, flexWrap: "wrap" },
  filterPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  filterPillText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  grid: { padding: 14, gap: 12 },
  row: { gap: 12, justifyContent: "space-between" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 10 },
  loadingText: { fontFamily: "Inter_400Regular", fontSize: 15 },
  emptyTitle: { fontFamily: "Georgia", fontSize: 22 },
  emptySub: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", paddingHorizontal: 32 },
});
