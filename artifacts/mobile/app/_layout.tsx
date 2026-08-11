import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { ClerkProvider, ClerkLoaded } from "@clerk/expo";
import { tokenCache } from "@/lib/tokenCache";
import { initBreedModel } from "@/lib/BreedModel";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import Constants from "expo-constants";
import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { useAuth } from "@clerk/expo";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CollectionProvider } from "@/context/CollectionContext";
import { BadgeShareProvider } from "@/context/BadgeShareContext";
import { ScanProvider } from "@/context/ScanContext";

const extra = Constants.expoConfig?.extra ?? {};

// Production API domain — used when no EXPO_PUBLIC_DOMAIN is injected
// (i.e. store/TestFlight builds made outside the Replit dev environment).
const PRODUCTION_DOMAIN = "dog-breed-hunter.replit.app";

// Clerk key: injected as EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY at build/dev-server time.
const publishableKey: string =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  extra.clerkPublishableKey ||
  "";

// Domain: dev server injects EXPO_PUBLIC_DOMAIN; store builds fall back to production.
const domain: string =
  process.env.EXPO_PUBLIC_DOMAIN ||
  extra.domain ||
  PRODUCTION_DOMAIN;

const _apiBase = domain ? `https://${domain}` : "";

// Which Clerk instance is this bundle actually pointed at? A build can carry a
// stale key from a previous instance, which makes the server reject providers
// that look enabled in the dashboard. The publishable key is public (it ships
// in the client bundle) and encodes its own frontend-API host, so log that host
// rather than the raw key.
function clerkInstanceHost(key: string): string {
  const body = key.split("_", 3)[2];
  if (!body) return "unknown";
  try {
    // eslint-disable-next-line no-undef
    const decoded = typeof atob === "function" ? atob(body) : "";
    return decoded.replace(/\$$/, "") || "undecodable";
  } catch {
    return "undecodable";
  }
}

console.log(
  "[DoggoDex] API base URL:",
  _apiBase,
  "| Clerk instance:",
  publishableKey ? clerkInstanceHost(publishableKey) : "NO KEY",
);
setBaseUrl(_apiBase);

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthTokenProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn, userId, isLoaded } = useAuth();
  const previousUserId = useRef<string | null | undefined>(undefined);

  // Cached API responses (profile, leaderboard rank) belong to whoever was
  // signed in when they were fetched. Drop them whenever the account changes
  // — including on sign-out — so nothing from one account is ever shown to
  // another while fresh data loads.
  useEffect(() => {
    if (!isLoaded) return;
    const current = userId ?? null;
    if (previousUserId.current !== undefined && previousUserId.current !== current) {
      queryClient.clear();
    }
    previousUserId.current = current;
  }, [userId, isLoaded]);

  useEffect(() => {
    if (isSignedIn) {
      setAuthTokenGetter(async () => {
        const token = await getToken();
        return token ?? null;
      });
    } else {
      setAuthTokenGetter(null);
    }
  }, [isSignedIn, getToken]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="profile" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="breed/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    // Pre-load and warm the on-device TFLite model (native only)
    initBreedModel().catch(() => {});
  }, []);

  if (!fontsLoaded && !fontError) return null;

  if (!publishableKey) {
    console.error("[DoggoDex] CLERK_PUBLISHABLE_KEY is not set — auth will not work.");
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <SafeAreaProvider>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <CollectionProvider>
                    <BadgeShareProvider>
                      <ScanProvider>
                        <AuthTokenProvider>
                          <RootLayoutNav />
                        </AuthTokenProvider>
                      </ScanProvider>
                    </BadgeShareProvider>
                  </CollectionProvider>
                </KeyboardProvider>
              </GestureHandlerRootView>
            </QueryClientProvider>
          </ErrorBoundary>
        </SafeAreaProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
