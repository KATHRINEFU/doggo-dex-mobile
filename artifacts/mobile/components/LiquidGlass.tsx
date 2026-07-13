import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";

interface LiquidGlassProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  borderRadius?: number;
  intensity?: number;
  tint?: "light" | "dark" | "regular" | "extraLight" | "prominent";
  highlightOpacity?: number;
}

export function LiquidGlass({
  children,
  style,
  borderRadius = 26,
  intensity = 95,
  tint = "regular",
  highlightOpacity = 0.48,
}: LiquidGlassProps) {
  const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style ?? {};

  if (Platform.OS === "web") {
    return (
      <View
        style={[
          styles.webGlass,
          { borderRadius },
          flatStyle,
        ]}
      >
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.webHighlight,
            { borderRadius },
          ]}
        />
        {children}
      </View>
    );
  }

  return (
    <View style={[{ borderRadius, overflow: "hidden" }, flatStyle]}>
      {/* Backdrop blur */}
      <BlurView
        intensity={intensity}
        tint={tint}
        style={StyleSheet.absoluteFill}
      />

      {/* Glass tint film */}
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.tintFilm,
        ]}
      />

      {/* Top specular highlight */}
      <LinearGradient
        colors={[
          `rgba(255,255,255,${highlightOpacity})`,
          `rgba(255,255,255,${(highlightOpacity * 0.18).toFixed(3)})`,
          "rgba(255,255,255,0)",
        ]}
        locations={[0, 0.25, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.3, y: 0.6 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Bottom edge sheen (refraction) */}
      <LinearGradient
        colors={["rgba(255,255,255,0)", `rgba(255,255,255,${(highlightOpacity * 0.22).toFixed(3)})`]}
        start={{ x: 0, y: 0.65 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Bright border ring (inner) */}
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.innerBorder,
          { borderRadius },
        ]}
        pointerEvents="none"
      />

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  tintFilm: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  innerBorder: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
  },
  webGlass: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    overflow: "hidden",
  },
  webHighlight: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
  },
});
