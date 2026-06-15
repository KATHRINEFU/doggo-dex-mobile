import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useCollection } from "@/context/CollectionContext";
import { useGetDogBreed } from "@workspace/api-client-react";

const RARITY_LABELS: Record<string, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  legendary: "Legendary",
};

export default function BreedDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getEntry, isCollected } = useCollection();

  const { data: breed, isLoading } = useGetDogBreed(id ?? "");
  const entry = id ? getEntry(id) : undefined;
  const collected = id ? isCollected(id) : false;

  if (isLoading || !breed) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <Ionicons name="paw" size={48} color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading…</Text>
      </View>
    );
  }

  const rarityColor = {
    common: colors.common,
    uncommon: colors.uncommon,
    rare: colors.rare,
    legendary: colors.legendary,
  }[breed.rarity] ?? colors.primary;

  const discoveredDate = entry?.collectedAt
    ? new Date(entry.collectedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Image hero */}
      <View style={styles.heroContainer}>
        {collected ? (
          <Image source={{ uri: breed.imageUrl }} style={styles.heroImage} contentFit="cover" />
        ) : (
          <View style={[styles.heroBlurred, { backgroundColor: colors.muted }]}>
            <Ionicons name="paw" size={80} color={`${rarityColor}55`} />
            <Text style={[styles.unknownLabel, { color: colors.mutedForeground }]}>Not yet discovered</Text>
          </View>
        )}
        <LinearGradient colors={["transparent", "#0B1626EE", "#0B1626"]} style={styles.heroGradient} />

        {/* Back button */}
        <TouchableOpacity
          style={[styles.backBtn, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}
          onPress={() => router.back()}
        >
          <View style={[styles.backBtnInner, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Rarity badge */}
        <View style={[styles.rarityTag, { backgroundColor: rarityColor }]}>
          <Text style={styles.rarityTagText}>{RARITY_LABELS[breed.rarity]}</Text>
        </View>

        {/* Title over image */}
        <View style={styles.heroFooter}>
          <Text style={styles.breedName}>{collected ? breed.name : "???"}</Text>
          <Text style={styles.breedGroup}>{breed.group} Group</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Collection status */}
        {collected && entry ? (
          <View style={[styles.statusCard, { backgroundColor: `${colors.common}18`, borderColor: `${colors.common}44`, borderRadius: colors.radius }]}>
            <View style={styles.statusRow}>
              <Ionicons name="checkmark-circle" size={20} color={colors.common} />
              <Text style={[styles.statusTitle, { color: colors.common }]}>In Your DogDex</Text>
            </View>
            <View style={styles.statsRow}>
              <StatChip icon="calendar" label="Discovered" value={discoveredDate ?? ""} colors={colors} />
              <StatChip icon="eye" label="Times Spotted" value={`${entry.timesSpotted}×`} colors={colors} />
              <StatChip icon="flash" label="Confidence" value={`${Math.round(entry.confidence * 100)}%`} colors={colors} />
            </View>
          </View>
        ) : (
          <View style={[styles.statusCard, { backgroundColor: colors.secondary, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={styles.statusRow}>
              <Ionicons name="lock-closed" size={20} color={colors.mutedForeground} />
              <Text style={[styles.statusTitle, { color: colors.mutedForeground }]}>Not yet discovered — go find one!</Text>
            </View>
          </View>
        )}

        {/* Description */}
        <Text style={[styles.description, { color: colors.foreground }]}>
          {collected ? breed.description : "Discover this breed to unlock its description."}
        </Text>

        {/* Info grid */}
        {collected && (
          <View style={[styles.infoGrid, { borderColor: colors.border, borderRadius: colors.radius }]}>
            {[
              { label: "Origin", value: breed.origin },
              { label: "Size", value: breed.size.charAt(0).toUpperCase() + breed.size.slice(1) },
              { label: "Lifespan", value: breed.lifespan },
              { label: "Temperament", value: breed.temperament },
            ].map((item, i) => (
              <View key={i} style={[styles.infoCell, { borderColor: colors.border }]}>
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]}>{item.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Rarity info */}
        <View style={[styles.rarityCard, { backgroundColor: `${rarityColor}15`, borderColor: `${rarityColor}44`, borderRadius: colors.radius }]}>
          <View style={[styles.rarityDot, { backgroundColor: rarityColor }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rarityTitle, { color: rarityColor }]}>{RARITY_LABELS[breed.rarity]} Breed</Text>
            <Text style={[styles.rarityDesc, { color: colors.mutedForeground }]}>
              {breed.rarity === "common" && "Commonly spotted — easy to find in parks and neighborhoods."}
              {breed.rarity === "uncommon" && "Takes a bit of luck — keep your eyes peeled!"}
              {breed.rarity === "rare" && "Hard to find — requires dedicated searching at dog shows or breeders."}
              {breed.rarity === "legendary" && "Extremely rare — only serious DogDex hunters will ever spot one!"}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

interface ChipColors { primary: string; mutedForeground: string; secondary: string; foreground: string; border: string; radius: number; }

function StatChip({ icon, label, value, colors }: { icon: string; label: string; value: string; colors: ChipColors }) {
  return (
    <View style={[styles.statChip, { backgroundColor: colors.secondary, borderRadius: 10 }]}>
      <Ionicons name={icon as any} size={14} color={colors.mutedForeground} />
      <Text style={[styles.statChipLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.statChipValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  heroContainer: { height: 300, position: "relative" },
  heroImage: { width: "100%", height: "100%" },
  heroBlurred: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center", gap: 12 },
  unknownLabel: { fontSize: 16, fontFamily: "Inter_500Medium" },
  heroGradient: { position: "absolute", bottom: 0, left: 0, right: 0, height: 160 },
  backBtn: { position: "absolute", top: 0, left: 16 },
  backBtnInner: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  rarityTag: { position: "absolute", top: 16, right: 16, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 50 },
  rarityTagText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#0B1626", letterSpacing: 1, textTransform: "uppercase" },
  heroFooter: { position: "absolute", bottom: 16, left: 20 },
  breedName: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff" },
  breedGroup: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  content: { padding: 20, gap: 16 },
  statusCard: { borderWidth: 1, padding: 14, gap: 12 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  statsRow: { flexDirection: "row", gap: 8 },
  statChip: { flex: 1, alignItems: "center", padding: 10, gap: 3 },
  statChipLabel: { fontSize: 9, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  statChipValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  description: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 24 },
  infoGrid: { borderWidth: 1, flexDirection: "row", flexWrap: "wrap", overflow: "hidden" },
  infoCell: { width: "50%", padding: 14, borderBottomWidth: 1, borderRightWidth: 1 },
  infoLabel: { fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  infoValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  rarityCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderWidth: 1 },
  rarityDot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  rarityTitle: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 3 },
  rarityDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
