import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

interface Props {
  visible: boolean;
  imageUri: string;
  usingGptFallback: boolean;
  onCancel: () => void;
}

const { width } = Dimensions.get("window");
const IMAGE_SIZE = Math.min(width * 0.72, 300);

export function ScanningOverlay({ visible, imageUri, usingGptFallback, onCancel }: Props) {
  const scanY = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;
  const pokeRotate = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!visible) return;

    // Scan line sweeping top → bottom, repeat
    const scanAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(scanY, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scanY, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    // Pulse ring
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseScale, { toValue: 1.12, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.15, duration: 900, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulseScale, { toValue: 1, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.55, duration: 900, useNativeDriver: true }),
        ]),
      ]),
    );

    // Pokéball spin
    const spinAnim = Animated.loop(
      Animated.timing(pokeRotate, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    // Staggered dots
    const makeDot = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ]),
      );

    const dotAnim1 = makeDot(dot1, 0);
    const dotAnim2 = makeDot(dot2, 200);
    const dotAnim3 = makeDot(dot3, 400);

    scanAnim.start();
    pulseAnim.start();
    spinAnim.start();
    dotAnim1.start();
    dotAnim2.start();
    dotAnim3.start();

    return () => {
      scanAnim.stop();
      pulseAnim.stop();
      spinAnim.stop();
      dotAnim1.stop();
      dotAnim2.stop();
      dotAnim3.stop();
      scanY.setValue(0);
      pulseScale.setValue(1);
      pulseOpacity.setValue(0.6);
      pokeRotate.setValue(0);
      dot1.setValue(0.3);
      dot2.setValue(0.3);
      dot3.setValue(0.3);
    };
  }, [visible]);

  const scanTranslate = scanY.interpolate({
    inputRange: [0, 1],
    outputRange: [-IMAGE_SIZE / 2, IMAGE_SIZE / 2],
  });

  const spinDeg = pokeRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // Rendered as an absolutely-positioned view (NOT a Modal): iOS deadlocks when
  // two Modals are visible at once, and the result modal opens right after this
  // overlay closes. A plain view avoids the race entirely.
  if (!visible) return null;

  return (
    <View style={styles.root} pointerEvents="auto">
      <LinearGradient
        colors={["rgba(30,60,130,0.97)", "rgba(20,40,100,0.99)"]}
        style={styles.overlay}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel analysis"
          hitSlop={12}
          onPress={onCancel}
          style={styles.cancelButton}
        >
          <Feather name="arrow-left" size={26} color="#FFFFFF" />
        </Pressable>

        {/* Image frame */}
        <View style={styles.imageContainer}>
          {/* Pulse ring */}
          <Animated.View
            style={[
              styles.pulseRing,
              { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
            ]}
          />

          {/* Image with rounded corners */}
          <View style={styles.imageFrame}>
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]}>
                <Feather name="camera" size={36} color="rgba(90,200,250,0.6)" />
              </View>
            )}

            {/* Scan line overlay */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <Animated.View
                style={[
                  styles.scanLine,
                  { transform: [{ translateY: scanTranslate }] },
                ]}
              >
                <LinearGradient
                  colors={[
                    "transparent",
                    "rgba(90,200,250,0.18)",
                    "rgba(90,200,250,0.55)",
                    "rgba(90,200,250,0.18)",
                    "transparent",
                  ]}
                  style={styles.scanLineGradient}
                />
              </Animated.View>
            </View>

            {/* Corner brackets */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </View>

        {/* Pokéball spinner */}
        <Animated.View style={[styles.pokeball, { transform: [{ rotate: spinDeg }] }]}>
          <View style={styles.pokeTop} />
          <View style={styles.pokeMid} />
          <View style={styles.pokeBot} />
          <View style={styles.pokeCenter} />
        </Animated.View>

        {/* Label */}
        <Text style={styles.label}>
          {usingGptFallback ? "🔍 Sniffing a little deeper…" : "Analyzing breed"}
        </Text>

        {/* Dots */}
        <View style={styles.dots}>
          {[dot1, dot2, dot3].map((d, i) => (
            <Animated.View key={i} style={[styles.dot, { opacity: d }]} />
          ))}
        </View>
      </LinearGradient>
    </View>
  );
}

const CORNER = 20;
const BORDER = 3;

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  cancelButton: {
    position: "absolute",
    top: 54,
    left: 22,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },

  imageContainer: {
    width: IMAGE_SIZE + 40,
    height: IMAGE_SIZE + 40,
    alignItems: "center",
    justifyContent: "center",
  },

  pulseRing: {
    position: "absolute",
    width: IMAGE_SIZE + 40,
    height: IMAGE_SIZE + 40,
    borderRadius: (IMAGE_SIZE + 40) / 2,
    borderWidth: 2,
    borderColor: "rgba(90,200,250,0.6)",
  },

  imageFrame: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(90,200,250,0.4)",
  },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: { backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },

  scanLine: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    height: 36,
    marginTop: -18,
  },
  scanLineGradient: { flex: 1 },

  // Corner brackets
  corner: {
    position: "absolute",
    width: CORNER,
    height: CORNER,
    borderColor: "#5AC8FA",
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: BORDER, borderLeftWidth: BORDER, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderTopWidth: BORDER, borderRightWidth: BORDER, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: BORDER, borderLeftWidth: BORDER, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: BORDER, borderRightWidth: BORDER, borderBottomRightRadius: 6 },

  // Mini pokéball
  pokeball: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 2.5,
    borderColor: "#222",
  },
  pokeTop: { height: "50%", backgroundColor: "#E53935" },
  pokeBot: { height: "50%", backgroundColor: "#FFFFFF" },
  pokeMid: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: "#222",
    marginTop: -2.5,
  },
  pokeCenter: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 2.5,
    borderColor: "#222",
    marginTop: -6,
    marginLeft: -6,
  },

  label: {
    fontFamily: "Georgia",
    fontSize: 22,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },

  dots: { flexDirection: "row", gap: 8, marginTop: -8 },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#5AC8FA",
  },
});
