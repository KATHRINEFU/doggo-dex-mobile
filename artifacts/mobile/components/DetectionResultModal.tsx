import { Feather, Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import React, { useEffect } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import type { DogBreed, DetectBreedResult } from "@workspace/api-client-react";

interface Props {
  visible: boolean;
  result: DetectBreedResult | null;
  breed: DogBreed | null;
  imageUri: string;
  alreadyCollected: boolean;
  onCollect: () => void;
  onClose: () => void;
}

const RARITY_COLORS: Record<string, string> = {
  common: "#6B9E4A",
  uncommon: "#5B7A9E",
  rare: "#9B6FA8",
  legendary: "#C8943A",
};

const RARITY_LABELS: Record<string, string> = {
  common: "Common", uncommon: "Uncommon", rare: "Rare", legendary: "Legendary",
};

export function DetectionResultModal({ visible, result, breed, imageUri, alreadyCollected, onCollect, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 16 });
      opacity.value = withDelay(30, withSpring(1));
      if (result?.isDog) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      scale.value = 0.9;
      opacity.value = 0;
    }
  }, [visible, result?.isDog]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!result) return null;

  const rarityColor = breed ? (RARITY_COLORS[breed.rarity] ?? colors.primary) : colors.primary;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderRadius: 28,
              paddingBottom: insets.bottom + 16,
              borderTopColor: rarityColor,
              borderTopWidth: 3,
              borderLeftColor: colors.border,
              borderRightColor: colors.border,
              borderBottomColor: colors.border,
              borderWidth: 1,
            },
            cardStyle,
          ]}
        >
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <View style={[styles.closeCircle, { backgroundColor: colors.muted }]}>
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </View>
          </TouchableOpacity>

          {!result.isDog ? (
            <View style={styles.noDogContainer}>
              <Text style={{ fontSize: 56 }}>🔍</Text>
              <Text style={[styles.noDogTitle, { color: colors.foreground }]}>No Dog Found</Text>
              <Text style={[styles.noDogSub, { color: colors.mutedForeground }]}>{result.description}</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Photo */}
              <View style={[styles.photoWrap, { borderRadius: 20 }]}>
                <Image source={{ uri: imageUri }} style={styles.photo} contentFit="cover" />
                {breed && (
                  <View style={[styles.rarityTag, { backgroundColor: rarityColor }]}>
                    <Text style={styles.rarityTagText}>{RARITY_LABELS[breed.rarity]}</Text>
                  </View>
                )}
              </View>

              {/* Name + confidence */}
              <View style={styles.nameRow}>
                <Text style={[styles.breedName, { color: colors.foreground }]}>{result.breedName}</Text>
                <View style={[styles.confPill, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}40` }]}>
                  <Text style={[styles.confText, { color: colors.primary }]}>
                    {Math.round(result.confidence * 100)}%
                  </Text>
                </View>
              </View>

              <Text style={[styles.desc, { color: colors.mutedForeground }]}>{result.description}</Text>

              {/* Stats grid */}
              {breed && (
                <View style={[styles.statsGrid, { borderColor: colors.border, borderRadius: 14 }]}>
                  {[
                    { label: "Origin", value: breed.origin },
                    { label: "Size", value: breed.size },
                    { label: "Lifespan", value: breed.lifespan },
                    { label: "Temperament", value: breed.temperament },
                  ].map((s, i) => (
                    <View key={i} style={[styles.statCell, { borderColor: colors.border }]}>
                      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                      <Text style={[styles.statValue, { color: colors.foreground }]}>{s.value}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Action */}
              {!result.breedId || alreadyCollected ? (
                <View style={[styles.alreadyBanner, { backgroundColor: colors.muted, borderRadius: 14 }]}>
                  <Text style={{ fontSize: 20 }}>{alreadyCollected ? "✅" : "❓"}</Text>
                  <Text style={[styles.alreadyText, { color: colors.foreground }]}>
                    {alreadyCollected ? "Already in your DogDex!" : "Breed not in our database yet"}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.collectBtn, { backgroundColor: colors.primary, borderRadius: 16 }]}
                  onPress={onCollect}
                >
                  <Feather name="plus-circle" size={20} color="#fff" />
                  <Text style={styles.collectBtnText}>Add to DogDex</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(61,53,41,0.55)", justifyContent: "flex-end", paddingHorizontal: 12, paddingBottom: 8 },
  sheet: { maxHeight: "88%", padding: 20, shadowColor: "#3D3529", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 10 },
  closeBtn: { alignSelf: "flex-end", marginBottom: 12 },
  closeCircle: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  noDogContainer: { alignItems: "center", paddingVertical: 32, gap: 12 },
  noDogTitle: { fontFamily: "Georgia", fontSize: 24 },
  noDogSub: { fontFamily: "Inter_400Regular", fontSize: 15, textAlign: "center" },
  photoWrap: { height: 200, overflow: "hidden", marginBottom: 16 },
  photo: { width: "100%", height: "100%" },
  rarityTag: { position: "absolute", top: 12, left: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  rarityTagText: { fontFamily: "Inter_700Bold", fontSize: 10, color: "#fff", letterSpacing: 0.5, textTransform: "uppercase" },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  breedName: { fontFamily: "Georgia", fontSize: 24, flex: 1 },
  confPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginLeft: 8, borderWidth: 1 },
  confText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  desc: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 22, marginBottom: 16 },
  statsGrid: { borderWidth: 1, overflow: "hidden", marginBottom: 16, flexDirection: "row", flexWrap: "wrap" },
  statCell: { width: "50%", padding: 12, borderBottomWidth: 1, borderRightWidth: 1 },
  statLabel: { fontFamily: "Inter_500Medium", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  statValue: { fontFamily: "Inter_600SemiBold", fontSize: 13, textTransform: "capitalize" },
  alreadyBanner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, marginTop: 4 },
  alreadyText: { fontFamily: "Inter_500Medium", fontSize: 15 },
  collectBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, marginTop: 4, shadowColor: "#5B7A3A", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  collectBtnText: { fontFamily: "Inter_700Bold", fontSize: 17, color: "#fff" },
});
