import { BlurView } from "expo-blur";
import { Tabs, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { PokeBall } from "@/components/PokeBall";

const TABS = [
  { name: "index", icon: "home", label: "Home" },
  { name: "collection", icon: "grid", label: "Dex" },
  { name: "map", icon: "map-pin", label: "Map" },
  { name: "medals", icon: "user", label: "Profile" },
];

function PoGoTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const leftTabs = TABS.slice(0, 2);
  const rightTabs = TABS.slice(2);

  function goTo(routeName: string) {
    navigation.navigate(routeName);
  }

  function isActive(routeName: string) {
    const idx = state.routes.findIndex((r) => r.name === routeName);
    return idx === state.index;
  }

  return (
    <View
      style={[
        styles.wrapper,
        { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 },
      ]}
      pointerEvents="box-none"
    >
      {/* Pokéball floats above bar */}
      <View style={styles.pokeballAbsolute} pointerEvents="box-none">
        <Pressable
          onPress={() => goTo("index")}
          style={({ pressed }) => [
            styles.pokeballBtn,
            pressed && { transform: [{ scale: 0.92 }] },
          ]}
        >
          <PokeBall size={66} shadow />
        </Pressable>
      </View>

      {/* The floating glass bar */}
      <BlurView intensity={85} tint="dark" style={styles.bar}>
        <View style={styles.barInner}>
          {/* Left tabs */}
          {leftTabs.map((tab) => {
            const active = isActive(tab.name);
            return (
              <Pressable
                key={tab.name}
                onPress={() => goTo(tab.name)}
                style={styles.tabItem}
              >
                <Feather
                  name={tab.icon as any}
                  size={22}
                  color={active ? "#FFFFFF" : "rgba(255,255,255,0.45)"}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    { color: active ? "#FFFFFF" : "rgba(255,255,255,0.45)" },
                  ]}
                >
                  {tab.label}
                </Text>
                {active && <View style={styles.activeDot} />}
              </Pressable>
            );
          })}

          {/* Center spacer for Pokéball */}
          <View style={styles.centerGap} />

          {/* Right tabs */}
          {rightTabs.map((tab) => {
            const active = isActive(tab.name);
            return (
              <Pressable
                key={tab.name}
                onPress={() => goTo(tab.name)}
                style={styles.tabItem}
              >
                <Feather
                  name={tab.icon as any}
                  size={22}
                  color={active ? "#FFFFFF" : "rgba(255,255,255,0.45)"}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    { color: active ? "#FFFFFF" : "rgba(255,255,255,0.45)" },
                  ]}
                >
                  {tab.label}
                </Text>
                {active && <View style={styles.activeDot} />}
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const POKEBALL_SIZE = 66;
const BAR_HEIGHT = 64;

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  pokeballAbsolute: {
    position: "absolute",
    top: -(POKEBALL_SIZE / 2) - 4,
    alignSelf: "center",
    zIndex: 20,
  },
  pokeballBtn: {
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 14,
  },
  bar: {
    width: "100%",
    height: BAR_HEIGHT,
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
  },
  barInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.2,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#16C8A0",
    marginTop: 1,
  },
  centerGap: {
    width: POKEBALL_SIZE + 16,
  },
});

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <PoGoTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="collection" />
      <Tabs.Screen name="map" />
      <Tabs.Screen name="medals" />
    </Tabs>
  );
}
