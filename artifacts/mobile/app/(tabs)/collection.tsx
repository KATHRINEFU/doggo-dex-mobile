import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  ScrollView,
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
        colors={["#3396D3", "#1a7ab5"]}
        style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}
      >
        <Text style={styles.headerTitle}>DogDex</Text>
        <View style={styles.progressSection}>
          <Text style={styles.progressCount}>
            {collectionCount}/{totalBreeds}
          </Text>
          <Text style={styles.progressLabel}>breeds collected</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
        </View>

        {/* Rarity stats */}
        <View style={styles.rarityRow}>
          {rarityStats.map((s) => (
            <View key={s.rarity} style={styles.rarityStat}>
              <View style={[styles.rarityDot, { backgroundColor: s.color }]} />
              <Text style={styles.rarityStatText}>
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
            Fetching breeds...
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
          scrollEnabled={!!filteredBreeds.length}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="paw-outline" size={56} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {filter === "collected" ? "No dogs yet!" : "All caught!"}
              </Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                {filter === "collected"
                  ? "Go scan some dogs to start your collection."
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
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 12,
  },
  progressSection: {
    marginBottom: 12,
  },
  progressCount: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  progressLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
    marginBottom: 10,
  },
  progressTrack: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFF0CE",
    borderRadius: 4,
  },
  rarityRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  rarityStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  rarityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rarityStatText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.9)",
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
  filterTabActive: {
    borderBottomWidth: 2,
  },
  filterTabText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  grid: {
    padding: 12,
    gap: 12,
  },
  row: {
    gap: 12,
    justifyContent: "space-between",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  emptySub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
