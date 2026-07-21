import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useUser } from "@clerk/expo";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LiquidGlass } from "@/components/LiquidGlass";
import { useCollection } from "@/context/CollectionContext";
import { useScan } from "@/context/ScanContext";
import { useGetDogBreeds } from "@workspace/api-client-react";

const { width: W } = Dimensions.get("window");

const DOG_EMOJIS: string[] = [];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { collectionCount } = useCollection();
  const { xpMessage, confettiActive, claimDaily, dailyDogLoading } = useScan();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [cameraError, setCameraError] = useState(false);
  const { data: allBreeds } = useGetDogBreeds();

  const totalBreeds = allBreeds?.length ?? 100;
  const progress = Math.min(collectionCount / totalBreeds, 1);
  const trainerLevel = Math.floor(collectionCount / 5) + 1;
  const dogEmoji = DOG_EMOJIS[collectionCount % DOG_EMOJIS.length];

  // Floating dog animation
  const dogY = useSharedValue(0);
  const dogScale = useSharedValue(1);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.5);
  const xpOpacity = useSharedValue(0);
  const xpY = useSharedValue(0);

  useEffect(() => {
    dogY.value = withRepeat(
      withSequence(
        withTiming(-20, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
    dogScale.value = withRepeat(
      withSequence(withTiming(1.07, { duration: 1500 }), withTiming(1, { duration: 1500 })),
      -1,
    );
    ringScale.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: 2200, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 }),
      ),
      -1,
    );
    ringOpacity.value = withRepeat(
      withSequence(withTiming(0, { duration: 2200 }), withTiming(0.5, { duration: 0 })),
      -1,
    );
  }, []);

  useEffect(() => {
    if (xpMessage) {
      xpOpacity.value = 1;
      xpY.value = 0;
      xpY.value = withTiming(-80, { duration: 1600 });
      xpOpacity.value = withSequence(
        withTiming(1, { duration: 60 }),
        withTiming(0, { duration: 900 }),
      );
    }
  }, [xpMessage]);

  const dogStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dogY.value }, { scale: dogScale.value }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));
  const xpStyle = useAnimatedStyle(() => ({
    opacity: xpOpacity.value,
    transform: [{ translateY: xpY.value }],
  }));

  const showCamera = Platform.OS !== "web" && cameraPermission?.granted;

  return (
    <View style={styles.root}>
      {/* Background — gradient always renders; CameraView overlays it when permitted */}
      <LinearGradient
        colors={["#4BB8FA", "#3A8FDC", "#2C5EAD"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      />
      {Platform.OS !== "web" && (
        <CameraView
          style={[StyleSheet.absoluteFill, { opacity: showCamera ? 1 : 0 }]}
          facing="back"
          onCameraReady={() => console.log("[Camera] ready")}
          onMountError={(err) => {
            console.warn("[Camera] mount error:", err.message);
          }}
        />
      )}

      {/* Vignette overlay */}
      <LinearGradient
        colors={["rgba(6,15,31,0.62)", "transparent", "transparent", "rgba(6,15,31,0.75)"]}
        locations={[0, 0.2, 0.55, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Top HUD */}
      <View style={[styles.topHud, { paddingTop: insets.top + 8 }]}>
        <BlurView intensity={48} tint="dark" style={styles.trainerBadge}>
          <View style={styles.trainerAvatar}>
            {user?.imageUrl ? (
              <Image
                source={{ uri: user.imageUrl }}
                style={{ width: 28, height: 28, borderRadius: 14 }}
                contentFit="cover"
              />
            ) : (
              <Feather name="user" size={17} color="#fff" />
            )}
          </View>
          <View>
            <Text style={styles.trainerLevel}>
              {user
                ? `Lv. ${trainerLevel} ${user.firstName || "Trainer"}`
                : `Lv. ${trainerLevel} DogDex Trainer`}
            </Text>
          </View>
        </BlurView>

        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.logoImage}
          contentFit="contain"
        />
      </View>

      {/* Dog encounter */}
      <View style={styles.encounterArea} pointerEvents="none">
        <Animated.View style={dogStyle}>
          <View style={styles.dogStack}>
            <Animated.View style={[styles.ring, ringStyle]} />
            <Text style={styles.dogEmoji}>{dogEmoji}</Text>
          </View>
          <View style={styles.shadowPuddle} />
        </Animated.View>
      </View>

      {/* Camera prompt — positioned over encounterArea but NOT inside pointerEvents="none" */}
      {!showCamera && Platform.OS !== "web" && (
        <View style={styles.cameraPromptWrap} pointerEvents="box-none">
          <Pressable
            style={styles.cameraPrompt}
            onPress={requestCameraPermission}
          >
            <BlurView intensity={58} tint="dark" style={styles.cameraPromptBlur}>
              <Feather name="camera" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.cameraPromptText}>Enable camera for AR</Text>
            </BlurView>
          </Pressable>
        </View>
      )}

      {/* XP popup — driven by ScanContext */}
      {xpMessage ? (
        <Animated.View style={[styles.xpPop, xpStyle]}>
          <Text style={styles.xpText}>{xpMessage}</Text>
        </Animated.View>
      ) : null}

      {/* Daily Dog card */}
      <View style={[styles.dailyArea, { paddingBottom: 6 }]}>
        <Pressable onPress={claimDaily} disabled={dailyDogLoading}>
          <LiquidGlass style={styles.dailyCard} borderRadius={20} intensity={88}>
            <View style={styles.dailyRow}>
              <View style={styles.dailyIconWrap}>
                <Feather name="gift" size={22} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dailyLabel}>DAILY DOG</Text>
                <Text style={styles.dailySub}>Tap for a free breed today</Text>
              </View>
              {dailyDogLoading ? (
                <View style={styles.dailySpinner}>
                  <Feather name="refresh-cw" size={18} color="#94A3B8" />
                </View>
              ) : (
                <View style={styles.dailyArrow}>
                  <Feather name="chevron-right" size={18} color="#94A3B8" />
                </View>
              )}
            </View>
          </LiquidGlass>
        </Pressable>
      </View>

      {/* Bottom collection card */}
      <View style={[styles.bottomArea, { paddingBottom: insets.bottom + 106 }]}>
        <LiquidGlass style={styles.card} borderRadius={28} intensity={92}>
          <View style={styles.cardRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>COLLECTION PROGRESS</Text>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 2 }}>
                <Text style={styles.cardCount}>{collectionCount}</Text>
                <Text style={styles.cardTotal}> / {totalBreeds}</Text>
              </View>
              <Text style={styles.cardSub}>Breeds Collected</Text>
              <View style={styles.progressTrack}>
                <LinearGradient
                  colors={["#5AC8FA", "#007AFF"]}
                  style={[styles.progressFill, { width: `${progress * 100}%` }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
            </View>

            <View style={styles.pawCircle}>
              <Feather name="maximize" size={28} color="rgba(90,200,250,0.8)" />
            </View>
          </View>

          <View style={styles.hintRow}>
            <Feather name="arrow-up" size={12} color="rgba(90,200,250,0.9)" />
            <Text style={styles.hintText}>
              Tap the Pokéball to scan a dog
            </Text>
          </View>
        </LiquidGlass>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#060F1F" },

  topHud: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  logoImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  trainerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
    overflow: "hidden",
  },
  trainerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1565C0",
    borderWidth: 2,
    borderColor: "#5AC8FA",
    alignItems: "center",
    justifyContent: "center",
  },
  trainerLevel: {
    color: "#5AC8FA",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    lineHeight: 14,
  },
  trainerName: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 9,
    fontFamily: "Inter_400Regular",
  },
  appTitle: {
    flex: 1,
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 24,
    fontFamily: "Georgia",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
    letterSpacing: 0.3,
  },
  settingsCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },

  encounterArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  dogStack: { alignItems: "center", justifyContent: "center" },
  ring: {
    position: "absolute",
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 1.5,
    borderColor: "#5AC8FA",
  },
  dogEmoji: {
    fontSize: 100,
    textShadowColor: "rgba(0,20,60,0.5)",
    textShadowOffset: { width: 0, height: 6 },
    textShadowRadius: 20,
  },
  shadowPuddle: {
    marginTop: 4,
    alignSelf: "center",
    width: 68,
    height: 14,
    borderRadius: 34,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  cameraPromptWrap: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  cameraPrompt: { marginTop: 28, borderRadius: 20, overflow: "hidden" },
  cameraPromptBlur: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
  },
  cameraPromptText: {
    color: "rgba(255,255,255,0.9)",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },

  xpPop: {
    position: "absolute",
    bottom: "30%",
    alignSelf: "center",
    backgroundColor: "#5AC8FA",
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 10,
    shadowColor: "#5AC8FA",
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    zIndex: 100,
  },
  xpText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },

  dailyArea: {
    paddingHorizontal: 14,
    zIndex: 10,
  },
  dailyCard: {
    padding: 14,
    gap: 10,
  },
  dailyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dailyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(245,158,11,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  dailyLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#F59E0B",
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  dailySub: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Inter_400Regular",
  },
  dailyArrow: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  dailySpinner: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  bottomArea: {
    paddingHorizontal: 14,
    zIndex: 10,
  },
  card: {
    padding: 20,
    gap: 14,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  cardLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#64748B",
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  cardCount: {
    fontSize: 52,
    fontFamily: "Georgia",
    color: "#007AFF",
    lineHeight: 56,
  },
  cardTotal: {
    fontSize: 22,
    fontFamily: "Georgia",
    color: "#94A3B8",
  },
  cardSub: {
    fontSize: 12,
    color: "#94A3B8",
    fontFamily: "Inter_400Regular",
    marginTop: -2,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E2EAF4",
    marginTop: 10,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },
  pawCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
  },

  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  hintText: {
    fontSize: 12,
    color: "rgba(90,200,250,0.85)",
    fontFamily: "Inter_400Regular",
  },
});
