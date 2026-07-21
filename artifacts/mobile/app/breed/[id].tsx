import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useCollection } from "@/context/CollectionContext";
import { LiquidGlass } from "@/components/LiquidGlass";
import { useGetDogBreed } from "@workspace/api-client-react";

const RARITY_COLORS: Record<string, string> = {
  common: "#6B9E4A",
  uncommon: "#5B7A9E",
  rare: "#9B6FA8",
  legendary: "#C8943A",
};
const RARITY_LABELS: Record<string, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  legendary: "Legendary",
};

function RatingBar({ value, color }: { value: number; color: string }) {
  return (
    <View style={ratingStyles.track}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View
          key={i}
          style={[
            ratingStyles.pip,
            {
              backgroundColor: i <= value ? color : "rgba(0,0,0,0.10)",
              borderColor: i <= value ? color : "rgba(0,0,0,0.08)",
            },
          ]}
        />
      ))}
    </View>
  );
}

function DexCard({
  icon,
  label,
  value,
  accent,
  mutedColor,
  fgColor,
}: {
  icon: string;
  label: string;
  value: string;
  accent: string;
  cardBg: string;
  mutedColor: string;
  fgColor: string;
}) {
  return (
    <LiquidGlass
      borderRadius={14}
      intensity={Platform.OS === "ios" ? 60 : 0}
      tint="light"
      highlightOpacity={0.5}
      style={dexCardStyles.card}
    >
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: `${accent}18`, borderRadius: 14 },
        ]}
        pointerEvents="none"
      />
      <Feather name={icon as any} size={22} color={accent} style={{ marginBottom: 4 }} />
      <Text style={[dexCardStyles.label, { color: mutedColor }]}>{label}</Text>
      <Text style={[dexCardStyles.value, { color: fgColor }]}>{value}</Text>
    </LiquidGlass>
  );
}

function LoreBlock({
  icon,
  title,
  text,
  accent,
  cardBg,
  mutedColor,
  fgColor,
  radius,
}: {
  icon: string;
  title: string;
  text: string;
  accent: string;
  cardBg: string;
  mutedColor: string;
  fgColor: string;
  radius: number;
}) {
  return (
    <View
      style={[
        loreStyles.block,
        { backgroundColor: cardBg, borderColor: `${accent}25`, borderRadius: radius },
      ]}
    >
      <View style={loreStyles.header}>
        <Feather name={icon as any} size={18} color={accent} />
        <Text style={[loreStyles.title, { color: accent }]}>{title}</Text>
      </View>
      <Text style={[loreStyles.text, { color: fgColor }]}>{text}</Text>
      <View style={[loreStyles.bar, { backgroundColor: `${accent}20` }]}>
        <View style={[loreStyles.barFill, { backgroundColor: accent }]} />
      </View>
    </View>
  );
}

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
      <LinearGradient
        colors={["#4BB8FA", "#3A8FDC", "#2C5EAD"]}
        locations={[0, 0.5, 1]}
        style={styles.loading}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      >
        <Feather name="refresh-cw" size={48} color="rgba(255,255,255,0.5)" />
        <Text style={[styles.loadingText, { color: "rgba(255,255,255,0.85)" }]}>
          Loading…
        </Text>
      </LinearGradient>
    );
  }

  const rarityColor = RARITY_COLORS[breed.rarity] ?? colors.primary;
  const discoveredDate = entry?.collectedAt
    ? new Date(entry.collectedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#C8E8FF", "#E8F5FF", "#FFFFFF"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      />
      {/* ── Hero ───────────────────────────────────────────────── */}
      <View style={styles.hero}>
        {collected ? (
          <Image
            source={{ uri: entry?.photos?.[0] ?? entry?.imageUri ?? breed.imageUrl }}
            style={styles.heroImg}
            contentFit="cover"
          />
        ) : (
          <View style={styles.silhouetteContainer}>
            <Image
              source={{ uri: breed.imageUrl }}
              style={styles.heroImg}
              contentFit="cover"
            />
            <View style={styles.silhouetteOverlay} />
          </View>
        )}

        {/* Gradient overlay — fades into the light page background */}
        <LinearGradient
          colors={["transparent", "rgba(232,245,255,0.97)"]}
          style={styles.heroGrad}
        />

        {/* Back */}
        <TouchableOpacity
          style={[
            styles.backBtn,
            { top: insets.top + (Platform.OS === "web" ? 70 : 12) },
          ]}
          onPress={() => router.back()}
        >
          <View
            style={[
              styles.backBtnInner,
              { backgroundColor: "rgba(253,250,243,0.85)" },
            ]}
          >
            <Feather name="chevron-left" size={22} color={colors.foreground} />
          </View>
        </TouchableOpacity>

        {/* Rarity badge */}
        <View
          style={[
            styles.rarityBadge,
            {
              backgroundColor: rarityColor,
              top: insets.top + (Platform.OS === "web" ? 70 : 12),
            },
          ]}
        >
          <Text style={styles.rarityBadgeText}>
            {RARITY_LABELS[breed.rarity]}
          </Text>
        </View>

        {/* Name */}
        <View style={styles.heroFooter}>
          <Text style={[styles.breedName, { color: "#FDFAF3" }]}>
            {collected ? breed.name : "???"}
          </Text>
          <Text style={[styles.breedGroup, { color: "rgba(253,250,243,0.75)" }]}>
            {breed.group} Group
          </Text>
        </View>
      </View>

      {/* ── Content ────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status card */}
        {collected && entry ? (
          <>
            <View
              style={[
                styles.statusCard,
                {
                  backgroundColor: `${rarityColor}15`,
                  borderColor: `${rarityColor}40`,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <Feather name="check-circle" size={20} color={rarityColor} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.statusTitle, { color: rarityColor }]}>
                  In Your DogDex
                </Text>
                <View style={styles.statsRow}>
                  <View
                    style={[
                      styles.statChip,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statChipLabel,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Discovered
                    </Text>
                    <Text
                      style={[styles.statChipVal, { color: colors.foreground }]}
                    >
                      {discoveredDate}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statChip,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statChipLabel,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Spotted
                    </Text>
                    <Text
                      style={[styles.statChipVal, { color: colors.foreground }]}
                    >
                      {entry.timesSpotted}×
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statChip,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statChipLabel,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Confidence
                    </Text>
                    <Text
                      style={[styles.statChipVal, { color: colors.foreground }]}
                    >
                      {Math.round(entry.confidence * 100)}%
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Photo carousel — all scanned photos for this breed, up to 10 */}
            {(entry.photos?.length ?? 0) > 0 && (
              <FlatList
                data={(entry.photos ?? [entry.imageUri]).filter(Boolean)}
                keyExtractor={(_, i) => String(i)}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.photoRoll}
                contentContainerStyle={styles.photoRollContent}
                renderItem={({ item, index }) => (
                  <View
                    style={[
                      styles.photoThumb,
                      {
                        borderColor: index === 0 ? rarityColor : colors.border,
                        borderWidth: index === 0 ? 2 : 1,
                        borderRadius: colors.radius - 2,
                      },
                    ]}
                  >
                    <Image
                      source={{ uri: item }}
                      style={styles.photoThumbImg}
                      contentFit="cover"
                    />
                    {index === 0 && (
                      <View style={[styles.photoThumbBadge, { backgroundColor: rarityColor }]}>
                        <Feather name="star" size={12} color="#FBBF24" />
                      </View>
                    )}
                  </View>
                )}
              />
            )}
          </>
        ) : (
          <View
            style={[
              styles.statusCard,
              {
                backgroundColor: "rgba(255,255,255,0.75)",
                borderColor: "rgba(75,184,250,0.3)",
                borderRadius: colors.radius,
              },
            ]}
          >
            <Feather name="lock" size={20} color={colors.mutedForeground} />
            <Text
              style={[styles.lockedText, { color: colors.mutedForeground }]}
            >
              Not discovered yet — go find one!
            </Text>
          </View>
        )}

        {/* Description */}
        <Text style={[styles.description, { color: colors.foreground }]}>
          {collected
            ? breed.description
            : "Discover this breed to unlock its field notes."}
        </Text>

        {/* ── Dex entry cards (personality / humanJob / coffeeOrder) ── */}
        {collected && (
          <>
            <SectionHeading label="DEX ENTRIES" color={rarityColor} />
            <View style={styles.dexRow}>
              <DexCard
                icon="smile"
                label="Personality"
                value={breed.personality}
                accent={rarityColor}
                cardBg={colors.card}
                mutedColor={colors.mutedForeground}
                fgColor={colors.foreground}
              />
              <DexCard
                icon="briefcase"
                label="Human Job"
                value={breed.humanJob}
                accent={rarityColor}
                cardBg={colors.card}
                mutedColor={colors.mutedForeground}
                fgColor={colors.foreground}
              />
              <DexCard
                icon="coffee"
                label="Coffee Order"
                value={breed.coffeeOrder}
                accent={rarityColor}
                cardBg={colors.card}
                mutedColor={colors.mutedForeground}
                fgColor={colors.foreground}
              />
            </View>
          </>
        )}

        {/* ── Ratings ─────────────────────────────────────────── */}
        {collected && (
          <>
            <SectionHeading label="RATINGS" color={rarityColor} />
            <View style={styles.ratingChipsRow}>
              <StatChip
                icon="battery"
                label="Energy"
                value={breed.energyLevel}
                color="#F59E0B"
                mutedColor={colors.mutedForeground}
              />
              <StatChip
                icon="home"
                label="Apartment"
                value={breed.apartmentFriendly}
                color="#34D399"
                mutedColor={colors.mutedForeground}
              />
              <StatChip
                icon="wind"
                label="Chaos"
                value={breed.chaosLevel}
                color="#F87171"
                mutedColor={colors.mutedForeground}
              />
            </View>
          </>
        )}

        {/* ── Info grid ──────────────────────────────────────── */}
        {collected && (
          <View
            style={[
              styles.infoGrid,
              {
                borderColor: colors.border,
                borderRadius: 14,
                backgroundColor: colors.card,
              },
            ]}
          >
            {[
              { label: "Origin", value: breed.origin },
              {
                label: "Size",
                value:
                  breed.size.charAt(0).toUpperCase() + breed.size.slice(1),
              },
              { label: "Lifespan", value: breed.lifespan },
              { label: "Temperament", value: breed.temperament },
            ].map((item, i) => (
              <View
                key={i}
                style={[styles.infoCell, { borderColor: colors.border }]}
              >
                <Text
                  style={[
                    styles.infoLabel,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {item.label}
                </Text>
                <Text
                  style={[styles.infoValue, { color: colors.foreground }]}
                >
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Lore sections ──────────────────────────────────── */}
        {collected && (
          <>
            <SectionHeading label="FIELD LORE" color={rarityColor} />
            <LoreBlock
              icon="star"
              title="Fun Fact"
              text={breed.funFact}
              accent={rarityColor}
              cardBg={colors.card}
              mutedColor={colors.mutedForeground}
              fgColor={colors.foreground}
              radius={colors.radius}
            />
            <LoreBlock
              icon="film"
              title="Pop Culture"
              text={breed.popCulture}
              accent="#60A5FA"
              cardBg={colors.card}
              mutedColor={colors.mutedForeground}
              fgColor={colors.foreground}
              radius={colors.radius}
            />
            <LoreBlock
              icon="git-branch"
              title="Ancestors"
              text={breed.ancestors}
              accent="#A78BFA"
              cardBg={colors.card}
              mutedColor={colors.mutedForeground}
              fgColor={colors.foreground}
              radius={colors.radius}
            />
            <LoreBlock
              icon="book-open"
              title="Ancient Lore"
              text={breed.randomLore}
              accent="#F59E0B"
              cardBg={colors.card}
              mutedColor={colors.mutedForeground}
              fgColor={colors.foreground}
              radius={colors.radius}
            />
          </>
        )}

        {/* ── Rarity info ────────────────────────────────────── */}
        <View
          style={[
            styles.rarityCard,
            {
              backgroundColor: "rgba(255,255,255,0.75)",
              borderColor: "rgba(75,184,250,0.3)",
              borderRadius: colors.radius,
            },
          ]}
        >
          <View style={[styles.rarityDotBig, { backgroundColor: rarityColor }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rarityTitle, { color: rarityColor }]}>
              {RARITY_LABELS[breed.rarity]} Breed
            </Text>
            <Text style={[styles.rarityDesc, { color: colors.mutedForeground }]}>
              {breed.rarity === "common" &&
                "Commonly spotted in parks and neighbourhoods."}
              {breed.rarity === "uncommon" &&
                "Takes a bit of luck — keep your eyes peeled!"}
              {breed.rarity === "rare" &&
                "Hard to find — try dog shows and breeders."}
              {breed.rarity === "legendary" &&
                "Extremely rare — only dedicated hunters find these!"}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/* ── Small helpers ─────────────────────────────────────────────── */

function SectionHeading({ label, color }: { label: string; color: string }) {
  return (
    <View style={shStyles.row}>
      <View style={[shStyles.dot, { backgroundColor: color }]} />
      <Text style={[shStyles.text, { color }]}>{label}</Text>
      <View style={[shStyles.line, { backgroundColor: `${color}30` }]} />
    </View>
  );
}

function StatChip({
  icon,
  label,
  value,
  color,
  mutedColor,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
  mutedColor: string;
}) {
  return (
    <View style={[chipStyles.chip, { backgroundColor: `${color}12` }]}>
      <Feather name={icon as any} size={16} color={color} style={chipStyles.icon} />
      <Text style={[chipStyles.label, { color: mutedColor }]}>{label}</Text>
      <RatingBar value={value} color={color} />
    </View>
  );
}

/* ── StyleSheets ───────────────────────────────────────────────── */

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontFamily: "Inter_400Regular", fontSize: 16 },
  hero: { height: 300, position: "relative" },
  heroImg: { width: "100%", height: "100%" },
  silhouetteContainer: { width: "100%", height: "100%" },
  silhouetteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,12,8,0.88)",
  },
  heroGrad: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  backBtn: { position: "absolute", left: 16 },
  backBtnInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  rarityBadge: {
    position: "absolute",
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  rarityBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: "#fff",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  heroFooter: { position: "absolute", bottom: 16, left: 20 },
  breedName: { fontFamily: "Georgia", fontSize: 28 },
  breedGroup: { fontFamily: "Inter_400Regular", fontSize: 13 },
  content: { padding: 20, gap: 14 },
  statusCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 1,
    padding: 14,
  },
  statusEmoji: { fontSize: 20 },
  statusTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    marginBottom: 8,
  },
  lockedText: {
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    fontSize: 14,
  },
  statsRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  statChip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 2,
  },
  statChipLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  statChipVal: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  description: {
    fontFamily: "Georgia",
    fontSize: 16,
    lineHeight: 26,
    fontStyle: "italic",
  },
  dexRow: { flexDirection: "row", gap: 8 },
  ratingChipsRow: { flexDirection: "row", gap: 8 },
  infoGrid: {
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  infoCell: {
    width: "50%",
    padding: 14,
    borderBottomWidth: 1,
    borderRightWidth: 1,
  },
  infoLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  infoValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    textTransform: "capitalize",
  },
  photoRoll: {
    marginHorizontal: -20,
  },
  photoRollContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  photoThumb: {
    width: 90,
    height: 90,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  photoThumbImg: {
    width: "100%",
    height: "100%",
  },
  photoThumbBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  photoThumbBadgeText: {
    fontSize: 9,
    color: "#fff",
    fontFamily: "Inter_700Bold",
  },
  rarityCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderWidth: 1,
  },
  rarityDotBig: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  rarityTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    marginBottom: 3,
  },
  rarityDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
});

const shStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    marginBottom: 2,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 1.2,
  },
  line: { flex: 1, height: 1 },
});

const dexCardStyles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 12,
    gap: 4,
    alignItems: "center",
    minHeight: 90,
    justifyContent: "center",
  },
  icon: { marginBottom: 4 },  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  value: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
  },
});

const chipStyles = StyleSheet.create({
  chip: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 6,
  },
  icon: { marginBottom: 2 },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    textAlign: "center",
  },
});

const rrStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  icon: { width: 24, alignItems: "center" },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    width: 130,
  },
  barArea: { flex: 1 },
  val: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    width: 30,
    textAlign: "right",
  },
});

const ratingStyles = StyleSheet.create({
  track: { flexDirection: "row", gap: 5 },
  pip: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
});

const loreStyles = StyleSheet.create({
  block: {
    borderWidth: 1,
    padding: 16,
    gap: 8,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  icon: { marginBottom: 2 },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  text: {
    fontFamily: "Georgia",
    fontSize: 15,
    lineHeight: 24,
  },
  bar: {
    height: 3,
    borderRadius: 2,
    marginTop: 4,
  },
  barFill: {
    width: 32,
    height: 3,
    borderRadius: 2,
  },
});
