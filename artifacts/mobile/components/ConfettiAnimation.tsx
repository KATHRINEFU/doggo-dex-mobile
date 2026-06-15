import React, { useEffect } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

const { width: W, height: H } = Dimensions.get("window");

const COLORS = ["#FFC400", "#3396D3", "#78C44C", "#A855F7", "#FF6B6B", "#00D4AA", "#FFB347"];
const SHAPES = ["circle", "square"] as const;

interface ParticleConfig {
  x: number;
  color: string;
  shape: (typeof SHAPES)[number];
  delay: number;
  size: number;
  dx: number;
  spin: number;
}

function generateParticles(count: number): ParticleConfig[] {
  return Array.from({ length: count }, (_, i) => ({
    x: Math.random() * W,
    color: COLORS[i % COLORS.length],
    shape: SHAPES[i % 2],
    delay: Math.floor(Math.random() * 600),
    size: 8 + Math.random() * 8,
    dx: (Math.random() - 0.5) * 120,
    spin: Math.random() * 720 - 360,
  }));
}

const PARTICLES = generateParticles(60);

interface ParticleProps {
  config: ParticleConfig;
  active: boolean;
}

function Particle({ config, active }: ParticleProps) {
  const y = useSharedValue(-20);
  const x = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    if (active) {
      y.value = -20;
      x.value = 0;
      opacity.value = 1;
      rotate.value = 0;

      y.value = withDelay(
        config.delay,
        withTiming(H + 40, { duration: 2200 + Math.random() * 800, easing: Easing.in(Easing.ease) })
      );
      x.value = withDelay(
        config.delay,
        withTiming(config.dx, { duration: 2200, easing: Easing.out(Easing.ease) })
      );
      opacity.value = withDelay(
        config.delay + 1600,
        withTiming(0, { duration: 600 })
      );
      rotate.value = withDelay(
        config.delay,
        withTiming(config.spin, { duration: 2200 })
      );
    } else {
      opacity.value = 0;
    }
  }, [active]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: y.value },
      { translateX: x.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const isCircle = config.shape === "circle";

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: config.x,
          width: config.size,
          height: config.size,
          backgroundColor: config.color,
          borderRadius: isCircle ? config.size / 2 : 2,
        },
        style,
      ]}
    />
  );
}

interface Props {
  active: boolean;
}

export function ConfettiAnimation({ active }: Props) {
  if (!active) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {PARTICLES.map((p, i) => (
        <Particle key={i} config={p} active={active} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: "absolute",
    top: 0,
  },
});
