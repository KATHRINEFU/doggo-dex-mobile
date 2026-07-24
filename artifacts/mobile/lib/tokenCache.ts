import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// Clerk's TokenCache interface: getToken / saveToken / clearToken
// On web, expo-secure-store is a no-op (returns null for all reads),
// so sessions are never persisted. This module provides a localStorage
// fallback for web so Clerk can persist the session token across navigations.

const webCache = {
  getToken: async (key: string): Promise<string | null> => {
    try {
      if (typeof window === "undefined") return null;
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  saveToken: async (key: string, value: string): Promise<void> => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(key, value);
    } catch {}
  },
  clearToken: async (key: string): Promise<void> => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(key);
    } catch {}
  },
};

const nativeCache = {
  getToken: (key: string) => SecureStore.getItemAsync(key),
  saveToken: (key: string, value: string) =>
    SecureStore.setItemAsync(key, value),
  clearToken: (key: string) => SecureStore.deleteItemAsync(key),
};

export const tokenCache = Platform.OS === "web" ? webCache : nativeCache;
