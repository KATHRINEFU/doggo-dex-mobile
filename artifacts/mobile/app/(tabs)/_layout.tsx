import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef } from "react";
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
          color={active ? "#1A3A8F" : "rgba(0,0,0,0.35)"}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: active ? "#1A3A8F" : "rgba(0,0,0,0.35)" },
          ]}
        >
          {label}
        </Text>
        {active && <View style={styles.activeDot} />}
      </Animated.View>
    </Pressable>
  );
}

// ─── Liquid glass (web only) ─────────────────────────────────────────────────
// Technique from github.com/nikdelvin/liquid-glass:
//   feTurbulence noise → feDisplacementMap → organic lens-edge distortion.
//   Applied via SVG filter injected into <body> + ref-based DOM style injection.
//
// Two layers:
//   barRef  — the pill itself gets backdrop-filter (frosted glass blur)
//   ringRef — absoluteFill overlay gets the displaced white border ring
//             (white-on-blue is high contrast; the wavy border is the
//              most visible "liquid" signature of the effect)
// ─────────────────────────────────────────────────────────────────────────────
const LG_SVG_ID = "lg-dogdex-svg";
const LG_FILTER_ID = "lg-dogdex-f";

function useLiquidGlassSvg() {
  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (document.getElementById(LG_SVG_ID)) return;

    // Low baseFrequency = large smooth blobs → looks like a glass lens, not noise.
    // scale=26 → strong enough to see on a white border, subtle on the tinted fill.
    const svg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    ) as SVGSVGElement;
    svg.id = LG_SVG_ID;
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = `<defs>
      <filter id="${LG_FILTER_ID}" x="-20%" y="-60%" width="140%" height="220%"
              color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.011 0.055"
          numOctaves="3" seed="9" result="noise"/>
        <feColorMatrix in="noise" type="saturate" values="0" result="mono"/>
        <feDisplacementMap in="SourceGraphic" in2="mono" scale="26"
          xChannelSelector="R" yChannelSelector="G"/>
      </filter>
    </defs>`;
    Object.assign(svg.style, {
      position: "fixed",
      width: "0",
      height: "0",
      overflow: "hidden",
      pointerEvents: "none",
      zIndex: "-1",
    });
    document.body.appendChild(svg);
    return () => svg.remove();
  }, []);
}

function PoGoTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { openScan, isScanning } = useScan();
  useLiquidGlassSvg();

  // barRef  → backdrop-filter (frosted glass) applied directly to the pill div
  // ringRef → displaced white border ring floated above content
  const barRef = useRef<View>(null);
  const ringRef = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const bar = barRef.current as unknown as HTMLElement | null;
    if (bar) {
      bar.style.backdropFilter = "blur(24px) saturate(190%)";
      (bar.style as any).webkitBackdropFilter = "blur(24px) saturate(190%)";
      bar.style.backgroundColor = "rgba(255,255,255,0.20)";
    }

    const ring = ringRef.current as unknown as HTMLElement | null;
    if (ring) {
      ring.style.position = "absolute";
      ring.style.inset = "0";
      ring.style.borderRadius = "36px";
      ring.style.borderWidth = "1.5px";
      ring.style.borderStyle = "solid";
      ring.style.borderColor = "rgba(255,255,255,0.88)";
      ring.style.boxShadow =
        "inset 0 2px 0 rgba(255,255,255,0.95)," +
        "inset 0 -1px 0 rgba(80,130,220,0.18)," +
        "0 6px 28px rgba(75,184,250,0.20)";
      ring.style.pointerEvents = "none";
      // SVG displacement makes the white border organically wavy — the
      // signature "liquid glass" rim glow from nikdelvin/liquid-glass.
      if (document.getElementById(LG_SVG_ID)) {
        ring.style.filter = `url(#${LG_FILTER_ID})`;
      }
    }
  });

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

      {/* Floating glass pill
          Web:    backdrop-filter applied via barRef; ring overlay via ringRef.
          Native: BlurView tint="extraLight" for the frosted glass. */}
      <View
        ref={Platform.OS === "web" ? barRef : undefined}
        style={styles.bar}
      >
        {Platform.OS !== "web" && (
          <BlurView
            intensity={72}
            tint="extraLight"
            style={StyleSheet.absoluteFillObject}
          />
        )}

        {/* Top shimmer — bright white line at glass rim */}
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

          {/* Gap under the floating Pokéball */}
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

        {/* Web: displaced border ring — renders above content, no touch capture */}
        {Platform.OS === "web" && (
          <View
            ref={ringRef}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
        )}
      </View>
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
    // Web: overflow visible so the ring's filter extension isn't clipped.
    // Native: overflow hidden clips BlurView to the pill shape.
    overflow: Platform.OS === "web" ? "visible" : "hidden",
    // Native border — on web the ringRef overlay draws the border.
    ...(Platform.OS !== "web" && {
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.75)",
    }),
    shadowColor: "#4BB8FA",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 },
    elevation: 20,
  },
  barHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: "rgba(255,255,255,0.95)",
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
    backgroundColor: "#1A3A8F",
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
