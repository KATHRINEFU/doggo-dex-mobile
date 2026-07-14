import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";

interface Props {
  id: string;
  name: string;
  imageUrl: string;
  userPhotoUri?: string;
  rarity: "common" | "uncommon" | "rare" | "legendary";
  group: string;
  collected: boolean;
  onPress?: () => void;
}

const RARITY_COLORS = {
  common: "#6B9E4A",
  uncommon: "#5B7A9E",
  rare: "#9B6FA8",
  legendary: "#C8943A",
};

const RARITY_LABELS = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  legendary: "Legendary",
};

export function DogCard({ name, imageUrl, userPhotoUri, rarity, group, collected, onPress }: Props) {
  const colors = useColors();
  const scale = useSharedValue(1);
  const rarityColor = RARITY_COLORS[rarity];

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.95, { damping: 15 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
    >
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderRadius: colors.radius,
            borderColor: collected ? `${rarityColor}60` : colors.border,
            borderWidth: 1,
          },
          animStyle,
        ]}
      >
        <View style={[styles.imgWrap, { borderRadius: colors.radius - 2 }]}>
          {collected ? (
            <Image source={{ uri: userPhotoUri || imageUrl }} style={styles.img} contentFit="cover" transition={200} />
          ) : (
            <View style={[styles.masked, { backgroundColor: `${rarityColor}12` }]}>
              <Text style={{ fontSize: 28, opacity: 0.35 }}>🐾</Text>
            </View>
          )}

          {/* Rarity dot */}
          <View style={[styles.rarityBadge, { backgroundColor: rarityColor }]}>
            <Text style={styles.rarityBadgeText}>{RARITY_LABELS[rarity][0]}</Text>
          </View>

          {/* Collected checkmark */}
          {collected && (
            <View style={[styles.check, { backgroundColor: rarityColor }]}>
              <Text style={styles.checkText}>✓</Text>
            </View>
          )}
        </View>

        <View style={styles.info}>
          <Text style={[styles.name, { color: collected ? colors.foreground : `${colors.foreground}44` }]} numberOfLines={2}>
            {collected ? name : "???"}
          </Text>
          <Text style={[styles.group, { color: colors.mutedForeground }]}>{group}</Text>
        </View>

        {/* Bottom rarity stripe */}
        <View style={[styles.stripe, { backgroundColor: `${rarityColor}20` }]}>
          <View style={[styles.stripeDot, { backgroundColor: rarityColor }]} />
          <Text style={[styles.stripeText, { color: rarityColor }]}>{RARITY_LABELS[rarity]}</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 160,
    overflow: "hidden",
    shadowColor: "#8B7355",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  imgWrap: { height: 130, overflow: "hidden", position: "relative" },
  img: { width: "100%", height: "100%" },
  masked: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  rarityBadge: { position: "absolute", top: 8, left: 8, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  rarityBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff" },
  check: { position: "absolute", bottom: 8, right: 8, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  checkText: { fontSize: 10, color: "#fff", fontWeight: "bold" },
  info: { padding: 10, paddingBottom: 6 },
  name: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18, marginBottom: 2 },
  group: { fontFamily: "Inter_400Regular", fontSize: 11 },
  stripe: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6 },
  stripeDot: { width: 6, height: 6, borderRadius: 3 },
  stripeText: { fontFamily: "Inter_500Medium", fontSize: 11 },
});
