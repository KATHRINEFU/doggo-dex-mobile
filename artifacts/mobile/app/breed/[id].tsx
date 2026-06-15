import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useCollection } from "@/context/CollectionContext";
import { useGetDogBreed } from "@workspace/api-client-react";

const RARITY_COLORS: Record<string, string> = {
  common: "#6B9E4A", uncommon: "#5B7A9E", rare: "#9B6FA8", legendary: "#C8943A",
};
const RARITY_LABELS: Record<string, string> = {
  common: "Common", uncommon: "Uncommon", rare: "Rare", legendary: "Legendary",
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
        <Text style={{ fontSize: 48 }}>🐾</Text>
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading…</Text>
      </View>
    );
  }

  const rarityColor = RARITY_COLORS[breed.rarity] ?? colors.primary;
  const discoveredDate = entry?.collectedAt
    ? new Date(entry.collectedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Hero */}
      <View style={styles.hero}>
        {collected ? (
          <Image source={{ uri: breed.imageUrl }} style={styles.heroImg} contentFit="cover" />
        ) : (
          <View style={[styles.heroBlank, { backgroundColor: colors.muted }]}>
            <Text style={{ fontSize: 72, opacity: 0.4 }}>🐾</Text>
            <Text style={[styles.unknownLabel, { color: colors.mutedForeground }]}>Not yet discovered</Text>
          </View>
        )}

        {/* Gradient overlay */}
        <View style={styles.heroGrad} />

        {/* Back */}
        <TouchableOpacity
          style={[styles.backBtn, { top: insets.top + (Platform.OS === "web" ? 70 : 12) }]}
          onPress={() => router.back()}
        >
          <View style={[styles.backBtnInner, { backgroundColor: "rgba(253,250,243,0.85)" }]}>
            <Feather name="chevron-left" size={22} color={colors.foreground} />
          </View>
        </TouchableOpacity>

        {/* Rarity badge */}
        <View style={[styles.rarityBadge, { backgroundColor: rarityColor, top: insets.top + (Platform.OS === "web" ? 70 : 12) }]}>
          <Text style={styles.rarityBadgeText}>{RARITY_LABELS[breed.rarity]}</Text>
        </View>

        {/* Name */}
        <View style={styles.heroFooter}>
          <Text style={[styles.breedName, { color: collected ? "#FDFAF3" : "#FDFAF3" }]}>
            {collected ? breed.name : "???"}
          </Text>
          <Text style={[styles.breedGroup, { color: "rgba(253,250,243,0.75)" }]}>{breed.group} Group</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        {/* Status */}
        {collected && entry ? (
          <View style={[styles.statusCard, { backgroundColor: `${rarityColor}15`, borderColor: `${rarityColor}40`, borderRadius: colors.radius }]}>
            <Text style={[styles.statusEmoji]}>✅</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusTitle, { color: rarityColor }]}>In Your DogDex</Text>
              <View style={styles.statsRow}>
                <View style={[styles.statChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.statChipLabel, { color: colors.mutedForeground }]}>Discovered</Text>
                  <Text style={[styles.statChipVal, { color: colors.foreground }]}>{discoveredDate}</Text>
                </View>
                <View style={[styles.statChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.statChipLabel, { color: colors.mutedForeground }]}>Spotted</Text>
                  <Text style={[styles.statChipVal, { color: colors.foreground }]}>{entry.timesSpotted}×</Text>
                </View>
                <View style={[styles.statChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.statChipLabel, { color: colors.mutedForeground }]}>Confidence</Text>
                  <Text style={[styles.statChipVal, { color: colors.foreground }]}>{Math.round(entry.confidence * 100)}%</Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.statusCard, { backgroundColor: colors.muted, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={styles.statusEmoji}>🔒</Text>
            <Text style={[styles.lockedText, { color: colors.mutedForeground }]}>Not discovered yet — go find one!</Text>
          </View>
        )}

        {/* Description */}
        <Text style={[styles.description, { color: colors.foreground }]}>
          {collected ? breed.description : "Discover this breed to unlock its field notes."}
        </Text>

        {/* Info grid */}
        {collected && (
          <View style={[styles.infoGrid, { borderColor: colors.border, borderRadius: 14, backgroundColor: colors.card }]}>
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
        <View style={[styles.rarityCard, { backgroundColor: `${rarityColor}12`, borderColor: `${rarityColor}40`, borderRadius: colors.radius }]}>
          <View style={[styles.rarityDotBig, { backgroundColor: rarityColor }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rarityTitle, { color: rarityColor }]}>{RARITY_LABELS[breed.rarity]} Breed</Text>
            <Text style={[styles.rarityDesc, { color: colors.mutedForeground }]}>
              {breed.rarity === "common" && "Commonly spotted in parks and neighbourhoods."}
              {breed.rarity === "uncommon" && "Takes a bit of luck — keep your eyes peeled!"}
              {breed.rarity === "rare" && "Hard to find — try dog shows and breeders."}
              {breed.rarity === "legendary" && "Extremely rare — only dedicated hunters find these!"}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontFamily: "Inter_400Regular", fontSize: 16 },
  hero: { height: 300, position: "relative" },
  heroImg: { width: "100%", height: "100%" },
  heroBlank: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center", gap: 12 },
  unknownLabel: { fontFamily: "Inter_400Regular", fontStyle: "italic", fontSize: 16 },
  heroGrad: { position: "absolute", bottom: 0, left: 0, right: 0, height: 160, backgroundColor: "transparent", backgroundImage: "linear-gradient(transparent, rgba(61,53,41,0.8))" },
  backBtn: { position: "absolute", left: 16 },
  backBtnInner: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  rarityBadge: { position: "absolute", right: 16, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  rarityBadgeText: { fontFamily: "Inter_700Bold", fontSize: 11, color: "#fff", letterSpacing: 0.5, textTransform: "uppercase" },
  heroFooter: { position: "absolute", bottom: 16, left: 20 },
  breedName: { fontFamily: "Georgia", fontSize: 28 },
  breedGroup: { fontFamily: "Inter_400Regular", fontSize: 13 },
  content: { padding: 20, gap: 14 },
  statusCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderWidth: 1, padding: 14 },
  statusEmoji: { fontSize: 20 },
  statusTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, marginBottom: 8 },
  lockedText: { fontFamily: "Inter_400Regular", fontStyle: "italic", fontSize: 14 },
  statsRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  statChip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, gap: 2 },
  statChipLabel: { fontFamily: "Inter_400Regular", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.4 },
  statChipVal: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  description: { fontFamily: "Georgia", fontSize: 16, lineHeight: 26, fontStyle: "italic" },
  infoGrid: { borderWidth: 1, overflow: "hidden", flexDirection: "row", flexWrap: "wrap" },
  infoCell: { width: "50%", padding: 14, borderBottomWidth: 1, borderRightWidth: 1 },
  infoLabel: { fontFamily: "Inter_500Medium", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  infoValue: { fontFamily: "Inter_600SemiBold", fontSize: 14, textTransform: "capitalize" },
  rarityCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderWidth: 1 },
  rarityDotBig: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  rarityTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, marginBottom: 3 },
  rarityDesc: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20 },
});
