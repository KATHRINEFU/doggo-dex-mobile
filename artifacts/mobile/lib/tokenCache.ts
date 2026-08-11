import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

// Clerk's TokenCache interface: getToken / saveToken / clearToken
// On web, expo-secure-store is a no-op (returns null for all reads),
// so sessions are never persisted. This module provides a localStorage
// fallback for web so Clerk can persist the session token across navigations.

// Clerk's own cache key is not namespaced by instance, so a session token
// minted by a previous Clerk instance keeps being replayed after the app is
// pointed at a new one. The API server can't verify it against the new
// instance's JWKS and answers 401 forever. On native the token lives in the
// iOS Keychain, which survives an app delete + reinstall, so the stale session
// cannot be cleared by reinstalling. Namespacing the key by the instance host
// abandons old-instance tokens instead of resurrecting them.
function instanceNamespace(): string {
  const key: string =
    (Constants.expoConfig?.extra as { clerkPublishableKey?: string } | undefined)
      ?.clerkPublishableKey ||
    process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    "";
  const body = key.split("_", 3)[2];
  if (!body) return "unknown";
  try {
    // eslint-disable-next-line no-undef
    const decoded = typeof atob === "function" ? atob(body) : "";
    const host = decoded.replace(/\$$/, "");
    // SecureStore keys allow only alphanumerics, ".", "-" and "_".
    return host ? host.replace(/[^A-Za-z0-9.\-_]/g, "_") : "unknown";
  } catch {
    return "unknown";
  }
}

const NS = instanceNamespace();

const scopedKey = (key: string) => `${NS}__${key}`;

const webCache = {
  getToken: async (key: string): Promise<string | null> => {
    try {
      if (typeof window === "undefined") return null;
      return window.localStorage.getItem(scopedKey(key));
    } catch {
      return null;
    }
  },
  saveToken: async (key: string, value: string): Promise<void> => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(scopedKey(key), value);
    } catch {}
  },
  clearToken: async (key: string): Promise<void> => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(scopedKey(key));
    } catch {}
  },
};

const nativeCache = {
  getToken: (key: string) => SecureStore.getItemAsync(scopedKey(key)),
  saveToken: (key: string, value: string) =>
    SecureStore.setItemAsync(scopedKey(key), value),
  clearToken: (key: string) => SecureStore.deleteItemAsync(scopedKey(key)),
};

export const tokenCache = Platform.OS === "web" ? webCache : nativeCache;
