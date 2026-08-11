import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as {
  clerkPublishableKey?: string;
  domain?: string;
};

// app.json is the source of truth for the Clerk instance. It is kept ahead of
// EXPO_PUBLIC_* so a stale value in a developer's shell (or a leftover .env,
// which is gitignored and never arrives via git pull) cannot silently point a
// native build at a retired instance.
export const clerkPublishableKey: string =
  extra.clerkPublishableKey ||
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  "";

// A publishable key encodes its own frontend-API host, so the bundle can report
// which instance it targets without ever logging the key itself. Publishable
// keys are public; secret keys must never appear on the client.
function decodeInstanceHost(key: string): string {
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

/** Frontend-API host this bundle talks to, e.g. "bursting-bear-7.clerk.accounts.dev". */
export const clerkInstanceHost: string = clerkPublishableKey
  ? decodeInstanceHost(clerkPublishableKey)
  : "NO KEY";

/** Short form for on-screen diagnostics: "bursting-bear-7". */
export const clerkInstanceLabel: string =
  clerkInstanceHost.split(".")[0] || clerkInstanceHost;

/** SecureStore keys allow only alphanumerics, ".", "-" and "_". */
export const clerkInstanceNamespace: string = clerkInstanceHost.replace(
  /[^A-Za-z0-9.\-_]/g,
  "_",
);
