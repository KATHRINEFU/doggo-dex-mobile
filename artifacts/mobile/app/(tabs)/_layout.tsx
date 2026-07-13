import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React, { useCallback } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { PokeBall } from "@/components/PokeBall";
import { useScan } from "@/context/ScanContext";

const LEFT_TABS = [
  { name: "index", icon: "home" as const, label: "Home" },
  { name: "collection", icon: "grid" as const, label: "Dex" },
];
const RIGHT_TABS = [
  { name: "map", icon: "map-pin" as const, label: "Map" },
  { name: "medals", icon: "user" as const, label: "Profile" },
];

const POKEBALL_SIZE = 68;
const BAR_HEIGHT = 62;

function TabItem({
  routeName,
  icon,
  label,
  active,
  onPress,
}: {
  routeName: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePress() {
    scale.value = withSpring(0.88, { damping: 14, stiffness: 380 }, () => {
      scale.value = withSpring(1, { damping: 12, stiffness: 300 });
    });
    onPress();
  }

  return (
    <Pressable style={styles.tabItem} onPress={handlePress} hitSlop={8}>
      <Animated.View style={[styles.tabInner, animStyle]}>
        <Feather
          name={icon}
          size={21}
          color={active ? "#FFFFFF" : "rgba(255,255,255,0.4)"}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: active ? "#FFFFFF" : "rgba(255,255,255,0.4)" },
          ]}
        >
          {label}
        </Text>
        {active && <View style={styles.activeDot} />}
      </Animated.View>
    </Pressable>
  );
}

function PoGoTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { openScan, isScanning } = useScan();

  const ballScale = useSharedValue(1);

  const ballStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ballScale.value }],
  }));

  function handlePokeballPress() {
    ballScale.value = withSpring(0.85, { damping: 10, stiffness: 400 }, () => {
      ballScale.value = withSpring(1, { damping: 12, stiffness: 280 });
    });
    openScan();
  }

  const goTo = useCallback(
    (routeName: string) => {
      navigation.navigate(routeName);
    },
    [navigation],
  );

  function isActive(routeName: string) {
    return state.routes[state.index]?.name === routeName;
  }

  const bottomPad = insets.bottom > 0 ? insets.bottom : 12;

  return (
    <View
      style={[styles.wrapper, { paddingBottom: bottomPad }]}
      pointerEvents="box-none"
    >
      {/* Pokéball — floats above the bar */}
      <Animated.View style={[styles.pokeballWrap, ballStyle]} pointerEvents="box-none">
        <Pressable
          onPress={handlePokeballPress}
          disabled={isScanning}
          style={({ pressed }) => [
            styles.pokeballHit,
            pressed && { opacity: 0.85 },
          ]}
        >
          <PokeBall size={POKEBALL_SIZE} shadow />
        </Pressable>
      </Animated.View>

      {/* Floating glass bar */}
      <BlurView intensity={88} tint="dark" style={styles.bar}>
        {/* Subtle top highlight on the bar */}
        <View style={styles.barHighlight} />

        <View style={styles.barInner}>
          {LEFT_TABS.map((t) => (
            <TabItem
              key={t.name}
              routeName={t.name}
              icon={t.icon}
              label={t.label}
              active={isActive(t.name)}
              onPress={() => goTo(t.name)}
            />
          ))}

          {/* Spacer under the Pokéball */}
          <View style={{ width: POKEBALL_SIZE + 8 }} />

          {RIGHT_TABS.map((t) => (
            <TabItem
              key={t.name}
              routeName={t.name}
              icon={t.icon}
              label={t.label}
              active={isActive(t.name)}
              onPress={() => goTo(t.name)}
            />
          ))}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    alignItems: "center",
    pointerEvents: "box-none" as any,
  },
  pokeballWrap: {
    position: "absolute",
    top: -(POKEBALL_SIZE / 2) - 6,
    alignSelf: "center",
    zIndex: 20,
  },
  pokeballHit: {
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 18,
  },
  bar: {
    width: "100%",
    height: BAR_HEIGHT,
    borderRadius: 36,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: -6 },
    elevation: 20,
  },
  barHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  barInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  tabInner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tabLabel: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.3,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#5AC8FA",
    marginTop: 1,
  },
});

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <PoGoTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: false,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="collection" />
      <Tabs.Screen name="map" />
      <Tabs.Screen name="medals" />
    </Tabs>
  );
}
