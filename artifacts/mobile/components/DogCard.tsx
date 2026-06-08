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
  uncommon: "Uncommon",
  rare: "Rare",
  legendary: "Legendary",
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
    scale.value = withSpring(0.96, { damping: 15 });
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
            borderWidth: collected ? 2 : 1,
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
            <View style={[styles.maskedImage, { backgroundColor: colors.muted }]}>
              <Ionicons name="help-circle" size={36} color={colors.mutedForeground} />
            </View>
          )}
          {/* Rarity badge */}
          <View style={[styles.rarityBadge, { backgroundColor: rarityColor }]}>
            <Text style={styles.rarityText}>{RARITY_LABELS[rarity]}</Text>
          </View>
          {/* Collected check */}
          {collected && (
            <View style={[styles.collectedBadge, { backgroundColor: rarityColor }]}>
              <Ionicons name="checkmark" size={12} color="#fff" />
            </View>
          )}
        </View>
        <View style={styles.info}>
          <Text
            style={[styles.name, { color: collected ? colors.foreground : colors.mutedForeground }]}
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    height: 140,
    overflow: "hidden",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  maskedImage: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  rarityBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  rarityText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  collectedBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    padding: 10,
  },
  name: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  group: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
