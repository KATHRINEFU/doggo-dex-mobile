import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useCollection } from "@/context/CollectionContext";
import { DetectionResultModal } from "@/components/DetectionResultModal";
import { useDetectDogBreed, useGetDogBreeds } from "@workspace/api-client-react";
import type { DetectBreedResult, DogBreed } from "@workspace/api-client-react";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const RADAR_SIZE = Math.min(SCREEN_WIDTH * 0.72, 300);

// Extracted animated ring to avoid hooks-in-loop
function PulseRing({ delay, size, color }: { delay: number; size: number; color: string }) {
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0.8);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withTiming(1.0, { duration: 2200, easing: Easing.out(Easing.ease) }),
        -1,
        false
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withTiming(0, { duration: 2200, easing: Easing.out(Easing.ease) }),
        -1,
        false
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: color,
        },
        style,
      ]}
    />
  );
}

function RadarSweep({ color }: { color: string }) {
  const rotate = useSharedValue(0);

  useEffect(() => {
    rotate.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: RADAR_SIZE,
          height: RADAR_SIZE,
          borderRadius: RADAR_SIZE / 2,
          overflow: "hidden",
        },
        style,
      ]}
      pointerEvents="none"
    >
      {/* Sweep wedge using border trick */}
      <View
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: RADAR_SIZE / 2,
          height: RADAR_SIZE / 2,
          transformOrigin: "0% 100%",
          backgroundColor: `${color}22`,
          borderTopLeftRadius: RADAR_SIZE / 2,
        }}
      />
    </Animated.View>
  );
}

function DetectingAnimation({ color }: { color: string }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 500 }),
        withTiming(1.0, { duration: 500 })
      ),
      -1,
      false
    );
  }, []);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.radarCenter, { backgroundColor: `${color}22` }, style]}>
      <ActivityIndicator size="large" color={color} />
    </Animated.View>
  );
}

export default function ScanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addDog, isCollected, collectionCount } = useCollection();

  const [detecting, setDetecting] = useState(false);
  const [imageUri, setImageUri] = useState("");
  const [result, setResult] = useState<DetectBreedResult | null>(null);
  const [matchedBreed, setMatchedBreed] = useState<DogBreed | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const scanBtnScale = useSharedValue(1);
  const { data: allBreeds } = useGetDogBreeds();
  const detectMutation = useDetectDogBreed();

  const scanBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scanBtnScale.value }],
  }));

  function onScanPressIn() {
    scanBtnScale.value = withSpring(0.92, { damping: 12 });
  }
  function onScanPressOut() {
    scanBtnScale.value = withSpring(1, { damping: 12 });
  }

  async function pickAndDetect(fromCamera: boolean) {
    try {
      let picked: ImagePicker.ImagePickerResult;
      if (fromCamera) {
        const { granted } = await ImagePicker.requestCameraPermissionsAsync();
        if (!granted) {
          Alert.alert("Permission needed", "Camera permission is required to take photos.");
          return;
        }
        picked = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          base64: true,
          allowsEditing: true,
          aspect: [1, 1],
        });
      } else {
        const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!granted) {
          Alert.alert("Permission needed", "Photo library permission is required.");
          return;
        }
        picked = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          base64: true,
          allowsEditing: true,
          aspect: [1, 1],
        });
      }

      if (picked.canceled || !picked.assets?.[0]) return;
      const asset = picked.assets[0];
      if (!asset.base64) {
        Alert.alert("Error", "Could not read image data.");
        return;
      }

      setImageUri(asset.uri);
      setDetecting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      const res = await detectMutation.mutateAsync({
        data: {
          imageBase64: asset.base64,
          mimeType: asset.mimeType ?? "image/jpeg",
        },
      });

      setResult(res);
      if (res.breedId && allBreeds) {
        setMatchedBreed(allBreeds.find((b) => b.id === res.breedId) ?? null);
      } else {
        setMatchedBreed(null);
      }
      setModalVisible(true);
    } catch {
      Alert.alert("Detection failed", "Could not analyze the image. Please try again.");
    } finally {
      setDetecting(false);
    }
  }

  async function handleCollect() {
    if (!result || !imageUri) return;
    await addDog({
      breedId: result.breedId,
      breedName: result.breedName,
      imageUri,
      collectedAt: new Date().toISOString(),
      confidence: result.confidence,
      description: result.description,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setModalVisible(false);
  }

  const totalBreeds = allBreeds?.length ?? 32;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Star-field header */}
      <LinearGradient
        colors={["#0B1626", "#0d2040", "#0B1626"]}
        style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>DogDex</Text>
            <Text style={styles.headerSub}>Gotta sniff 'em all!</Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.countText, { color: colors.primaryForeground }]}>
              {collectionCount}/{totalBreeds}
            </Text>
            <Text style={[styles.countLabel, { color: colors.primaryForeground }]}>caught</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Main scan area */}
      <View style={styles.scanArea}>
        {/* Grid overlay for Pokémon GO feel */}
        <View style={styles.gridOverlay} pointerEvents="none">
          {[...Array(6)].map((_, i) => (
            <View
              key={i}
              style={[styles.gridLine, { borderColor: `${colors.accent}18` }]}
            />
          ))}
        </View>

        {/* Radar */}
        <View style={styles.radarWrapper}>
          {/* Concentric static rings */}
          {[0.35, 0.6, 0.85, 1.0].map((r, i) => (
            <View
              key={i}
              style={{
                position: "absolute",
                width: RADAR_SIZE * r,
                height: RADAR_SIZE * r,
                borderRadius: (RADAR_SIZE * r) / 2,
                borderWidth: 1,
                borderColor: `${colors.accent}30`,
              }}
            />
          ))}

          {/* Pulse rings */}
          <PulseRing delay={0} size={RADAR_SIZE * 0.6} color={colors.primary} />
          <PulseRing delay={730} size={RADAR_SIZE * 0.8} color={colors.primary} />
          <PulseRing delay={1460} size={RADAR_SIZE} color={colors.primary} />

          {/* Sweep */}
          {!detecting && <RadarSweep color={colors.primary} />}

          {/* Cross-hairs */}
          <View style={[styles.crossH, { backgroundColor: `${colors.accent}40` }]} />
          <View style={[styles.crossV, { backgroundColor: `${colors.accent}40` }]} />

          {/* Center */}
          {detecting ? (
            <DetectingAnimation color={colors.primary} />
          ) : (
            <TouchableOpacity
              activeOpacity={1}
              onPressIn={onScanPressIn}
              onPressOut={onScanPressOut}
              onPress={() => pickAndDetect(true)}
            >
              <Animated.View
                style={[
                  styles.radarCenter,
                  { backgroundColor: colors.primary },
                  scanBtnStyle,
                ]}
              >
                <Ionicons name="camera" size={40} color={colors.primaryForeground} />
                <Text style={[styles.centerLabel, { color: colors.primaryForeground }]}>
                  SCAN
                </Text>
              </Animated.View>
            </TouchableOpacity>
          )}
        </View>

        {/* Status text */}
        <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
          {detecting
            ? "Analyzing breed with AI..."
            : "Point at a dog and tap SCAN"}
        </Text>
      </View>

      {/* Bottom action row */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 70,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.sideBtn, { backgroundColor: colors.secondary, borderRadius: colors.radius }]}
          onPress={() => pickAndDetect(false)}
          disabled={detecting}
        >
          <Ionicons name="images-outline" size={22} color={colors.primary} />
          <Text style={[styles.sideBtnText, { color: colors.foreground }]}>Upload</Text>
        </TouchableOpacity>

        <View style={styles.centerSpacer}>
          <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
            or upload from gallery
          </Text>
        </View>

        <View style={[styles.sideBtn, { backgroundColor: colors.secondary, borderRadius: colors.radius }]}>
          <Ionicons name="paw-outline" size={22} color={colors.accent} />
          <Text style={[styles.sideBtnText, { color: colors.foreground }]}>
            {totalBreeds - collectionCount} left
          </Text>
        </View>
      </View>

      <DetectionResultModal
        visible={modalVisible}
        result={result}
        breed={matchedBreed}
        imageUri={imageUri}
        alreadyCollected={result ? isCollected(result.breedId) : false}
        onCollect={handleCollect}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: "#FFC400",
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.55)",
  },
  countBadge: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
  },
  countText: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  countLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    opacity: 0.75,
  },
  scanArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  gridOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "column",
    justifyContent: "space-around",
  },
  gridLine: {
    flex: 1,
    borderBottomWidth: 1,
  },
  radarWrapper: {
    width: RADAR_SIZE,
    height: RADAR_SIZE,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  crossH: {
    position: "absolute",
    width: RADAR_SIZE,
    height: 1,
  },
  crossV: {
    position: "absolute",
    width: 1,
    height: RADAR_SIZE,
  },
  radarCenter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    shadowColor: "#FFC400",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  centerLabel: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  statusText: {
    marginTop: 32,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 16,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    gap: 12,
  },
  sideBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 4,
    minWidth: 80,
  },
  sideBtnText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  centerSpacer: {
    flex: 1,
    alignItems: "center",
  },
  tipText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
