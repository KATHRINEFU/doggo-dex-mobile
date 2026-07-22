import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { ClerkProvider, ClerkLoaded } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import Constants from "expo-constants";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { useAuth } from "@clerk/expo";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CollectionProvider } from "@/context/CollectionContext";
import { ScanProvider } from "@/context/ScanContext";
import { initBreedModel } from "@/lib/BreedModel";

const extra = Constants.expoConfig?.extra ?? {};

// Clerk key: read from app.config.js extra (which injects process.env.CLERK_PUBLISHABLE_KEY at dev-server startup)
const publishableKey: string =
  extra.clerkPublishableKey ||
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  "";

// Domain: prefer app.config.js extra, fall back to EXPO_PUBLIC_ variant
const domain: string =
  extra.domain ||
  process.env.EXPO_PUBLIC_DOMAIN ||
  "";

const _apiBase = domain ? `https://${domain}` : "";
console.log("[PawDex] API base URL:", _apiBase, "| Clerk key present:", !!publishableKey);
setBaseUrl(_apiBase);

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthTokenProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn } = useAuth();

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
    console.error("[PawDex] CLERK_PUBLISHABLE_KEY is not set — auth will not work.");
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
                    <ScanProvider>
                      <AuthTokenProvider>
                        <RootLayoutNav />
                      </AuthTokenProvider>
                    </ScanProvider>
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
