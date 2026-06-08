import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useCollection } from "@/context/CollectionContext";
import { DogCard } from "@/components/DogCard";
import { useGetDogBreeds } from "@workspace/api-client-react";

type FilterType = "all" | "collected" | "missing";

export default function CollectionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { collectedDogs, isCollected, collectionCount } = useCollection();
  const { data: allBreeds, isLoading } = useGetDogBreeds();
  const [filter, setFilter] = useState<FilterType>("all");

  const filteredBreeds = useMemo(() => {
    if (!allBreeds) return [];
    switch (filter) {
      case "collected":
        return allBreeds.filter((b) => isCollected(b.id));
      case "missing":
        return allBreeds.filter((b) => !isCollected(b.id));
      default:
        return allBreeds;
    }
  }, [allBreeds, isCollected, filter]);

  const totalBreeds = allBreeds?.length ?? 32;
  const progressPct = Math.min((collectionCount / totalBreeds) * 100, 100);

  const rarityStats = useMemo(() => {
    if (!allBreeds) return [];
    const rarities = ["common", "uncommon", "rare", "legendary"] as const;
    return rarities.map((r) => ({
      rarity: r,
      total: allBreeds.filter((b) => b.rarity === r).length,
      collected: collectedDogs.filter((d) => {
        const breed = allBreeds.find((b) => b.id === d.breedId);
        return breed?.rarity === r;
      }).length,
      color: {
        common: colors.common,
        uncommon: colors.uncommon,
        rare: colors.rare,
        legendary: colors.legendary,
      }[r],
    }));
  }, [allBreeds, collectedDogs, colors]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={["#0B1626", "#0d2040"]}
        style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.primary }]}>DogDex</Text>
          <View style={[styles.countPill, { backgroundColor: colors.primary }]}>
            <Text style={[styles.countPillText, { color: colors.primaryForeground }]}>
              {collectionCount}/{totalBreeds}
            </Text>
          </View>
        </View>

        {/* Progress */}
        <View style={[styles.progressTrack, { backgroundColor: colors.secondary }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: colors.primary, width: `${progressPct}%` },
            ]}
          />
        </View>

        {/* Rarity badges */}
        <View style={styles.rarityRow}>
          {rarityStats.map((s) => (
            <View key={s.rarity} style={[styles.rarityBadge, { backgroundColor: `${s.color}22`, borderColor: `${s.color}55` }]}>
              <View style={[styles.rarityDot, { backgroundColor: s.color }]} />
              <Text style={[styles.rarityStatText, { color: s.color }]}>
                {s.collected}/{s.total}
              </Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* Filter tabs */}
      <View style={[styles.filterRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(["all", "collected", "missing"] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterTab,
              f === filter && [styles.filterTabActive, { borderBottomColor: colors.primary }],
            ]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterTabText,
                { color: f === filter ? colors.primary : colors.mutedForeground },
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="paw" size={40} color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading breeds...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredBreeds}
          numColumns={2}
          keyExtractor={(item) => item.id}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[
            styles.grid,
            {
              paddingBottom:
                insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100,
            },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="paw-outline" size={56} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {filter === "collected" ? "No dogs yet!" : "All caught!"}
              </Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                {filter === "collected"
                  ? "Go scan some dogs on the Scan tab."
                  : "You've collected every breed in this filter!"}
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
            />
          )}
        />
      )}
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
  countPill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  countPillText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  rarityRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  rarityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  rarityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rarityStatText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  filterRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  filterTabActive: { borderBottomWidth: 2 },
  filterTabText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  grid: { padding: 12, gap: 12 },
  row: { gap: 12, justifyContent: "space-between" },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  emptySub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
