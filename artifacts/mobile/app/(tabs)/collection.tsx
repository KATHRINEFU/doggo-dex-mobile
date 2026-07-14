import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
  common: "#34D399",
  uncommon: "#60A5FA",
  rare: "#A78BFA",
  legendary: "#FBBF24",
};

export default function CollectionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { collectedDogs, isCollected, collectionCount, getEntry } = useCollection();
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
  const sortIcon = sort === "newest" ? "clock" : sort === "name" ? "type" : "sliders";

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#4BB8FA", "#3A8FDC", "#2C5EAD"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 70 : 16) }]}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Collection</Text>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{collectionCount}/{total}</Text>
          </View>
        </View>

        <View style={[styles.progressTrack, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
          <LinearGradient
            colors={["#FFFFFF", "rgba(255,255,255,0.8)"]}
            style={[styles.progressFill, { width: `${progress * 100}%` }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </View>

        <View style={styles.rarityStats}>
          {(["common", "uncommon", "rare", "legendary"] as const).map((r) => {
            const total2 = allBreeds?.filter((b) => b.rarity === r).length ?? 0;
            const collected2 = collectedDogs.filter((d) => allBreeds?.find((b) => b.id === d.breedId)?.rarity === r).length;
            return (
              <View key={r} style={styles.rarityStat}>
                <View style={[styles.rarityDot, { backgroundColor: RARITY_COLORS[r] }]} />
                <Text style={styles.rarityStatText}>{collected2}/{total2}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Search + sort */}
      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Feather name="search" size={15} color="rgba(255,255,255,0.5)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search collected breeds…"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => setSort((s) => s === "default" ? "newest" : s === "newest" ? "name" : "default")}
        >
          <Feather name={sortIcon} size={16} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </View>

      {/* Rarity filter pills */}
      <View style={styles.filterBar}>
        {(["all", "common", "uncommon", "rare", "legendary"] as RarityFilter[]).map((f) => {
          const isActive = f === filter;
          const dotColor = f === "all" ? "#5AC8FA" : RARITY_COLORS[f];
          return (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterPill,
                {
                  backgroundColor: isActive ? `${dotColor}28` : "rgba(255,255,255,0.12)",
                  borderColor: isActive ? dotColor : "rgba(255,255,255,0.3)",
                },
              ]}
              onPress={() => setFilter(f)}
            >
              {f !== "all" && <View style={[styles.rarityDot, { backgroundColor: dotColor }]} />}
              <Text style={[styles.filterPillText, { color: isActive ? dotColor : "rgba(255,255,255,0.92)" }]}>
                {RARITY_LABELS[f]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <Text style={{ fontSize: 36 }}>🐕</Text>
          <Text style={styles.loadingText}>Loading breeds…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          numColumns={2}
          keyExtractor={(item) => item.id}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100 }]}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={{ fontSize: 48 }}>🔍</Text>
              <Text style={styles.emptyTitle}>No breeds found</Text>
              <Text style={styles.emptySub}>
                {search ? "Try a different search." : "Tap the Pokéball to start your collection!"}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const entry = getEntry(item.id);
            return (
              <DogCard
                id={item.id}
                name={item.name}
                imageUrl={item.imageUrl}
                userPhotoUri={entry?.photos?.[0] ?? entry?.imageUri}
                rarity={item.rarity}
                group={item.group}
                collected={isCollected(item.id)}
                onPress={() => router.push(`/breed/${item.id}` as any)}
              />
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, gap: 10 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: "Georgia", fontSize: 32, color: "#FFFFFF" },
  countPill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  countPillText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#FFFFFF" },
  progressTrack: { height: 7, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  rarityStats: { flexDirection: "row", gap: 14 },
  rarityStat: { flexDirection: "row", alignItems: "center", gap: 5 },
  rarityDot: { width: 8, height: 8, borderRadius: 4 },
  rarityStatText: { fontFamily: "Inter_500Medium", fontSize: 12, color: "rgba(255,255,255,0.8)" },

  toolbar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "transparent",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, padding: 0, color: "#FFFFFF" },
  sortBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },

  filterBar: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    backgroundColor: "transparent",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.12)",
    flexWrap: "wrap",
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: { fontFamily: "Inter_500Medium", fontSize: 12 },

  grid: { padding: 14, gap: 12 },
  row: { gap: 12 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 10 },
  loadingText: { fontFamily: "Inter_400Regular", fontSize: 15, color: "#FFFFFF" },
  emptyTitle: { fontFamily: "Georgia", fontSize: 22, color: "#FFFFFF" },
  emptySub: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", paddingHorizontal: 32, color: "rgba(255,255,255,0.75)" },
});
