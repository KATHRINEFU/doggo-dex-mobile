import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";

interface Props {
  id: string;
  name: string;
  imageUrl: string;
  rarity: "common" | "uncommon" | "rare" | "legendary";
  group: string;
  collected: boolean;
  onPress?: () => void;
}

const RARITY_LABELS: Record<string, string> = {
  common: "Common",
  uncommon: "Rare",
  rare: "Epic",
  legendary: "Legend",
};

export function DogCard({ name, imageUrl, rarity, group, collected, onPress }: Props) {
  const colors = useColors();
  const scale = useSharedValue(1);

  const rarityColor = {
    common: colors.common,
    uncommon: colors.uncommon,
    rare: colors.rare,
    legendary: colors.legendary,
  }[rarity] ?? colors.primary;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    scale.value = withSpring(0.94, { damping: 15 });
  }
  function handlePressOut() {
    scale.value = withSpring(1, { damping: 15 });
  }

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderRadius: colors.radius,
            borderColor: collected ? rarityColor : colors.border,
            borderWidth: collected ? 1.5 : 1,
          },
          animStyle,
        ]}
      >
        <View style={[styles.imageContainer, { borderRadius: colors.radius - 4 }]}>
          {collected ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <View style={[styles.maskedImage, { backgroundColor: `${rarityColor}15` }]}>
              <Ionicons name="paw" size={32} color={`${rarityColor}55`} />
            </View>
          )}

          {/* Rarity strip at top */}
          <View style={[styles.rarityStrip, { backgroundColor: rarityColor }]}>
            <Text style={styles.rarityText}>{RARITY_LABELS[rarity]}</Text>
          </View>

          {collected && (
            <View style={[styles.checkBadge, { backgroundColor: rarityColor }]}>
              <Ionicons name="checkmark" size={11} color="#fff" />
            </View>
          )}
        </View>

        <View style={styles.info}>
          <Text
            style={[
              styles.name,
              { color: collected ? colors.foreground : `${colors.foreground}55` },
            ]}
            numberOfLines={2}
          >
            {collected ? name : "???"}
          </Text>
          <Text style={[styles.group, { color: colors.mutedForeground }]}>{group}</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 160,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  imageContainer: {
    height: 140,
    overflow: "hidden",
    position: "relative",
  },
  image: { width: "100%", height: "100%" },
  maskedImage: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  rarityStrip: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 3,
    alignItems: "center",
  },
  rarityText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  checkBadge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { padding: 10 },
  name: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  group: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
