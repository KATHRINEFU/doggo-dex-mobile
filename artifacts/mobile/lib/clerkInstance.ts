import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as {
  clerkPublishableKey?: string;
  domain?: string;
};

// The one and only Clerk instance this app targets: bursting-bear-7.
// Hardcoded (publishable keys are public) so that NO local machine state — a
// leftover untracked app.config.js (which silently overrides app.json), a
// stale .env, or shell EXPO_PUBLIC_* exports — can ever point a build at the
// retired alert-cod-60 instance again. Config/env values are used only if
// they resolve to this same instance.
const CANONICAL_KEY = "pk_test_YnVyc3RpbmctYmVhci03LmNsZXJrLmFjY291bnRzLmRldiQ";
const CANONICAL_HOST = "bursting-bear-7.clerk.accounts.dev";

const configuredKey: string =
  extra.clerkPublishableKey ||
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  "";

// A publishable key encodes its own frontend-API host, so the bundle can report
// which instance it targets without ever logging the key itself. Publishable
// keys are public; secret keys must never appear on the client.
export function decodeInstanceHost(key: string): string {
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

// Enforce the canonical instance: any configured key that does not decode to
// bursting-bear-7 (e.g. a stale alert-cod-60 key from local machine state) is
// discarded in favor of the hardcoded canonical key.
export const clerkPublishableKey: string =
  configuredKey && decodeInstanceHost(configuredKey) === CANONICAL_HOST
    ? configuredKey
    : CANONICAL_KEY;

if (configuredKey && clerkPublishableKey !== configuredKey) {
  console.warn(
    "[DoggoDex] Ignoring configured Clerk key for retired instance:",
    decodeInstanceHost(configuredKey),
    "→ forcing",
    CANONICAL_HOST,
  );
}

/** Frontend-API host this bundle talks to, e.g. "bursting-bear-7.clerk.accounts.dev". */
export const clerkInstanceHost: string = decodeInstanceHost(clerkPublishableKey);

/** Short form for on-screen diagnostics: "bursting-bear-7". */
export const clerkInstanceLabel: string =
  clerkInstanceHost.split(".")[0] || clerkInstanceHost;

/** SecureStore keys allow only alphanumerics, ".", "-" and "_". */
export const clerkInstanceNamespace: string = clerkInstanceHost.replace(
  /[^A-Za-z0-9.\-_]/g,
  "_",
);
