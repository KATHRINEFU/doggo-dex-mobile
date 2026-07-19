import { Feather, Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCollection } from "@/context/CollectionContext";
import { DogCard } from "@/components/DogCard";
import { useGetDogBreeds } from "@workspace/api-client-react";

const { width: SCREEN_W } = Dimensions.get("window");

/* ── Filter types ─────────────────────────────────────────── */
type RarityFilter = "all" | "common" | "uncommon" | "rare" | "legendary";
type CollectionFilter = "all" | "collected" | "uncollected";
type SortType = "default" | "newest" | "name";

const RARITY_META: Record<
  Exclude<RarityFilter, "all">,
  { label: string; color: string; icon: React.ComponentProps<typeof Ionicons>["name"] }
> = {
  common:    { label: "Common",    color: "#34D399", icon: "paw-outline" },
  uncommon:  { label: "Uncommon",  color: "#60A5FA", icon: "sparkles-outline" },
  rare:      { label: "Rare",      color: "#A78BFA", icon: "diamond-outline" },
  legendary: { label: "Legendary", color: "#FBBF24", icon: "trophy-outline" },
};

const RARITY_ORDER: Exclude<RarityFilter, "all">[] = ["common", "uncommon", "rare", "legendary"];

/* ── Main screen ──────────────────────────────────────────── */
export default function CollectionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { collectedDogs, isCollected, collectionCount, getEntry } = useCollection();
  const { data: allBreeds, isLoading } = useGetDogBreeds();

  /* State */
  const [rarity, setRarity] = useState<RarityFilter>("all");
  const [collectionStatus, setCollectionStatus] = useState<CollectionFilter>("all");
  const [sort, setSort] = useState<SortType>("default");
  const [search, setSearch] = useState("");
  const [showSortMenu, setShowSortMenu] = useState(false);

  const total = allBreeds?.length ?? 100;
  const progress = Math.min(collectionCount / total, 1);

  /* Rarity stats for the header */
  const rarityStats = useMemo(() => {
    if (!allBreeds) return [];
    return RARITY_ORDER.map((r) => {
      const totalR = allBreeds.filter((b) => b.rarity === r).length;
      const collectedR = collectedDogs.filter(
        (d) => allBreeds.find((b) => b.id === d.breedId)?.rarity === r
      ).length;
      return { rarity: r, ...RARITY_META[r], collected: collectedR, total: totalR };
    });
  }, [allBreeds, collectedDogs]);

  /* Filtered list */
  const filtered = useMemo(() => {
    if (!allBreeds) return [];
    let list = [...allBreeds];

    /* Rarity filter */
    if (rarity !== "all") {
      list = list.filter((b) => b.rarity === rarity);
    }

    /* Collection status filter */
    if (collectionStatus === "collected") {
      list = list.filter((b) => isCollected(b.id));
    } else if (collectionStatus === "uncollected") {
      list = list.filter((b) => !isCollected(b.id));
    }

    /* Search */
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((b) => b.name.toLowerCase().includes(q));
    }

    /* Sort */
    if (sort === "newest") {
      const map = Object.fromEntries(collectedDogs.map((d) => [d.breedId, d.collectedAt]));
      list.sort((a, b) => {
        const aD = map[a.id] ?? "";
        const bD = map[b.id] ?? "";
        if (!aD && !bD) return 0;
        if (!aD) return 1;
        if (!bD) return -1;
        return bD.localeCompare(aD);
      });
    } else if (sort === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [allBreeds, rarity, collectionStatus, sort, search, isCollected, collectedDogs]);

  /* Active filter pill label */
  const activeFilterLabel =
    rarity === "all"
      ? collectionStatus === "all"
        ? "All"
        : collectionStatus === "collected"
        ? "Collected"
        : "Uncollected"
      : RARITY_META[rarity].label;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#4BB8FA", "#3A8FDC", "#2C5EAD"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      />

      <FlatList
        data={filtered}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={styles.row}
        contentContainerStyle={{
          paddingTop: insets.top + (Platform.OS === "web" ? 70 : 16),
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: 16,
        }}
        ListHeaderComponent={
          <>
            {/* ── Top nav ─────────────────────────────── */}
            <View style={styles.topNav}>
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.brandTitle}>DogDex</Text>
                  <Text style={styles.brandPaw}>🐾</Text>
                </View>
                <Text style={styles.brandSubtitle}>Collect every dog. Share every story.</Text>
              </View>
              <Pressable style={styles.searchIconBtn} onPress={() => {}}>
                <BlurView intensity={40} tint="light" style={styles.searchIconBlur}>
                  <Feather name="search" size={18} color="#2C5EAD" />
                </BlurView>
              </Pressable>
            </View>

            {/* ── Progress bar ──────────────────────────── */}
            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <LinearGradient
                  colors={["#A3D5FF", "#5AC8FA"]}
                  style={[styles.progressFill, { width: `${progress * 100}%` }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
              <View style={styles.progressPill}>
                <Text style={styles.progressPillText}>{collectionCount} / {total}</Text>
              </View>
            </View>

            {/* ── Rarity stats row ──────────────────────── */}
            <View style={styles.rarityStatsRow}>
              {rarityStats.map((s) => (
                <View key={s.rarity} style={styles.rarityStat}>
                  <View style={[styles.rarityDot, { backgroundColor: s.color }]} />
                  <View>
                    <Text style={styles.rarityLabel}>{s.label}</Text>
                    <Text style={styles.rarityCount}>
                      {s.collected}/{s.total}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* ── Divider ─────────────────────────────── */}
            <View style={styles.divider} />

            {/* ── Filter bar ────────────────────────────── */}
            <View style={styles.filterBar}>
              {/* Status pills: All / Collected / Uncollected */}
              <View style={styles.statusPills}>
                {(["all", "collected", "uncollected"] as CollectionFilter[]).map((st) => {
                  const active = collectionStatus === st;
                  return (
                    <Pressable
                      key={st}
                      style={[styles.statusPill, active && styles.statusPillActive]}
                      onPress={() => setCollectionStatus(st)}
                    >
                      <Text style={[styles.statusPillText, active && styles.statusPillTextActive]}>
                        {st === "all" ? "All" : st === "collected" ? "Collected" : "Uncollected"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Rarity icon buttons */}
              <View style={styles.rarityIcons}>
                {RARITY_ORDER.map((r) => {
                  const meta = RARITY_META[r];
                  const isActive = rarity === r;
                  return (
                    <Pressable
                      key={r}
                      style={[
                        styles.rarityIconBtn,
                        isActive && { backgroundColor: `${meta.color}20`, borderColor: meta.color },
                      ]}
                      onPress={() => setRarity(isActive ? "all" : r)}
                    >
                      <Ionicons
                        name={meta.icon}
                        size={18}
                        color={isActive ? meta.color : "#94A3B8"}
                      />
                    </Pressable>
                  );
                })}
              </View>

              {/* Sort dropdown */}
              <View style={styles.sortWrap}>
                <Pressable
                  style={styles.sortBtn}
                  onPress={() => setShowSortMenu((v) => !v)}
                >
                  <Text style={styles.sortLabel}>
                    {sort === "default" ? "Recent" : sort === "newest" ? "Newest" : "Name"}
                  </Text>
                  <Feather name="chevron-down" size={14} color="#475569" />
                </Pressable>
                {showSortMenu && (
                  <View style={styles.sortMenu}>
                    {(["default", "newest", "name"] as SortType[]).map((s) => (
                      <Pressable
                        key={s}
                        style={[styles.sortItem, sort === s && styles.sortItemActive]}
                        onPress={() => {
                          setSort(s);
                          setShowSortMenu(false);
                        }}
                      >
                        <Text style={[styles.sortItemText, sort === s && styles.sortItemTextActive]}>
                          {s === "default" ? "Recent" : s === "newest" ? "Newest first" : "Name A→Z"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </>
        }
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
    </View>
  );
}

/* ── Styles ────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },

  /* Top nav */
  topNav: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  brandTitle: {
    fontFamily: "Georgia",
    fontSize: 28,
    color: "#1E3A5F",
    letterSpacing: -0.5,
  },
  brandPaw: { fontSize: 22, marginTop: 2 },
  brandSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  searchIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
  },
  searchIconBlur: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },

  /* Progress */
  progressWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.5)",
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 4 },
  progressPill: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  progressPillText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: "#fff",
  },

  /* Rarity stats */
  rarityStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  rarityStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rarityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rarityLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: "#94A3B8",
  },
  rarityCount: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: "#334155",
  },

  /* Divider */
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginBottom: 12,
  },

  /* Filter bar */
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },

  /* Status pills */
  statusPills: {
    flexDirection: "row",
    gap: 6,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  statusPillActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  statusPillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: "#64748B",
  },
  statusPillTextActive: {
    color: "#fff",
  },

  /* Rarity icon buttons */
  rarityIcons: {
    flexDirection: "row",
    gap: 6,
  },
  rarityIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },

  /* Sort dropdown */
  sortWrap: {
    marginLeft: "auto",
    position: "relative",
  },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  sortLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: "#475569",
  },
  sortMenu: {
    position: "absolute",
    right: 0,
    top: 34,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 50,
    minWidth: 130,
  },
  sortItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  sortItemActive: {
    backgroundColor: "#EFF6FF",
  },
  sortItemText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#475569",
  },
  sortItemTextActive: {
    color: "#3B82F6",
  },

  /* Grid */
  row: { gap: 12, justifyContent: "space-between" },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 10,
  },
  emptyTitle: {
    fontFamily: "Georgia",
    fontSize: 20,
    color: "#1E3A5F",
  },
  emptySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 32,
    color: "#64748B",
  },
});
