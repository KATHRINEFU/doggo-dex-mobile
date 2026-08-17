import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as {
  clerkPublishableKey?: string;
};

export const clerkPublishableKey =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  extra.clerkPublishableKey ||
  "";

export function decodeInstanceHost(key: string): string {
  const body = key.split("_", 3)[2];
  if (!body) return "unknown";

  try {
    const decoded = typeof atob === "function" ? atob(body) : "";
    return decoded.replace(/\$$/, "") || "undecodable";
  } catch {
    return "undecodable";
  }
}

export const clerkInstanceHost = decodeInstanceHost(clerkPublishableKey);

export const clerkInstanceLabel =
  clerkInstanceHost.split(".")[0] || clerkInstanceHost;

export const clerkInstanceNamespace = clerkInstanceHost.replace(
  /[^A-Za-z0-9.\-_]/g,
  "_",
);