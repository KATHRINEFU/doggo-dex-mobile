import React from "react";
import { View, StyleSheet } from "react-native";

interface PokeBallProps {
  size?: number;
  shadow?: boolean;
}

export function PokeBall({ size = 60, shadow = false }: PokeBallProps) {
  const r = size / 2;
  const band = Math.max(3, size * 0.065);
  const btnOuter = size * 0.34;
  const btnInner = size * 0.2;
  const border = Math.max(2, size * 0.048);

  return (
    <View
      style={[
        styles.ball,
        {
          width: size,
          height: size,
          borderRadius: r,
          borderWidth: border,
          shadowOpacity: shadow ? 0.5 : 0,
          shadowRadius: shadow ? 14 : 0,
          shadowOffset: shadow ? { width: 0, height: 6 } : { width: 0, height: 0 },
          elevation: shadow ? 12 : 0,
        },
      ]}
    >
      <View style={[styles.topHalf, { height: r }]} />
      <View style={[styles.bottomHalf, { height: r }]} />
      <View style={[styles.band, { top: r - band / 2, height: band }]} />
      <View
        style={[
          styles.centerOuter,
          {
            width: btnOuter,
            height: btnOuter,
            borderRadius: btnOuter / 2,
            top: r - btnOuter / 2,
            left: r - btnOuter / 2,
            borderWidth: band,
          },
        ]}
      >
        <View
          style={[
            styles.centerInner,
            { width: btnInner, height: btnInner, borderRadius: btnInner / 2 },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ball: {
    overflow: "hidden",
    borderColor: "#1A1A2E",
    position: "relative",
    shadowColor: "#000",
  },
  topHalf: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#E8232A",
  },
  bottomHalf: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
  },
  band: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "#1A1A2E",
    zIndex: 2,
  },
  centerOuter: {
    position: "absolute",
    backgroundColor: "#1A1A2E",
    zIndex: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  centerInner: {
    backgroundColor: "#F0F0F0",
  },
});
