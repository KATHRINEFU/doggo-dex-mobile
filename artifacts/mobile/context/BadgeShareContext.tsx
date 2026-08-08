import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { NativeModules, Platform, StyleSheet, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { useAuth } from "@clerk/expo";
import {
  badgeShareIndexKey,
  useCollection,
  type Medal,
} from "@/context/CollectionContext";
import { BadgeShareCard } from "@/components/BadgeShareCard";

/**
 * Pre-generates a shareable PNG for each badge the moment it unlocks, so the
 * share sheet opens instantly (no capture latency) when the user taps Share.
 *
 * Images are stored in the app's documents directory and indexed in
 * AsyncStorage as { [medalId]: fileUri }.
 */

// Share images are cached per account: the card renders the account's own dogs,
// so one account must never reuse another's generated PNG.

// A development build made before react-native-view-shot was installed does
// not contain RNViewShot. Avoid loading the native library in that old binary:
// the badge can still use its existing text-sharing fallback instead of
// crashing the entire app while Metro serves the latest JavaScript.
const captureRef =
  Platform.OS !== "web" && NativeModules.RNViewShot
    ? require("react-native-view-shot").captureRef
    : null;

interface CacheEntry {
  uri: string;
  /** Signature of the dogs rendered in the card, for invalidation. */
  sig: string;
}

/** Signature of the dogs that would appear on a medal's card. */
function cardSignature(medal: Medal, dogs: { breedId: string }[]): string {
  return dogs
    .slice(0, Math.min(medal.required, 20))
    .map((d) => d.breedId)
    .join(",");
}

interface BadgeShareContextValue {
  /** Returns the cached share-image URI for a badge, or null if not ready. */
  getShareImageUri: (medalId: string) => string | null;
}

const BadgeShareContext = createContext<BadgeShareContextValue>({
  getShareImageUri: () => null,
});

export function BadgeShareProvider({ children }: { children: React.ReactNode }) {
  const { userId, isLoaded: authLoaded } = useAuth();
  const { medals, collectedDogs } = useCollection();
  const [index, setIndex] = useState<Record<string, CacheEntry>>({});
  const [indexLoaded, setIndexLoaded] = useState(false);
  // Account the loaded index belongs to, so an in-flight capture can never be
  // written into another account's cache.
  const indexUserRef = useRef<string | null>(null);

  // Medal currently being rendered off-screen for capture
  const [pending, setPending] = useState<Medal | null>(null);
  const shotRef = useRef<View>(null);
  const settledCount = useRef(0);
  const capturing = useRef(false);
  // Capped retries per medal so a persistent capture failure can't loop forever
  const failures = useRef<Record<string, number>>({});

  // Load the signed-in account's index; drop it entirely when signed out.
  useEffect(() => {
    if (!authLoaded) return;

    indexUserRef.current = null;
    setIndex({});
    failures.current = {};

    if (!userId) {
      setIndexLoaded(false);
      return;
    }

    let cancelled = false;
    setIndexLoaded(false);
    AsyncStorage.getItem(badgeShareIndexKey(userId))
      .then((raw) => {
        if (cancelled) return;
        if (raw) {
          try {
            setIndex(JSON.parse(raw));
          } catch {
            /* ignore */
          }
        }
        indexUserRef.current = userId;
        setIndexLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        indexUserRef.current = userId;
        setIndexLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, authLoaded]);

  // Whenever badges change, queue the first unlocked badge whose image is
  // missing or stale (the dogs shown on the card changed).
  useEffect(() => {
    if (!indexLoaded || pending || Platform.OS === "web") return;
    const missing = medals.find(
      (m) =>
        m.unlocked &&
        (failures.current[m.id] ?? 0) < 2 &&
        index[m.id]?.sig !== cardSignature(m, collectedDogs),
    );
    if (missing) {
      settledCount.current = 0;
      capturing.current = false;
      setPending(missing);
    }
  }, [medals, index, indexLoaded, pending, collectedDogs]);

  const doCapture = useCallback(async () => {
    if (!pending || capturing.current || !shotRef.current) return;
    if (!captureRef) {
      setPending(null);
      return;
    }
    capturing.current = true;
    const medal = pending;
    try {
      const tmpUri = await captureRef(shotRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });
      const owner = indexUserRef.current;
      // The account changed while the card was rendering — throw the capture away.
      if (!owner || owner !== userId) {
        setPending(null);
        return;
      }
      const dest = `${FileSystem.documentDirectory}badge-share-${owner}-${medal.id}.png`;
      // Overwrite any stale file
      await FileSystem.deleteAsync(dest, { idempotent: true });
      await FileSystem.moveAsync({ from: tmpUri, to: dest });

      setIndex((prev) => {
        const next: Record<string, CacheEntry> = {
          ...prev,
          [medal.id]: { uri: dest, sig: cardSignature(medal, collectedDogs) },
        };
        AsyncStorage.setItem(badgeShareIndexKey(owner), JSON.stringify(next)).catch(
          () => {},
        );
        return next;
      });
      delete failures.current[medal.id];
    } catch (e) {
      failures.current[medal.id] = (failures.current[medal.id] ?? 0) + 1;
      console.warn("[BadgeShare] capture failed", e);
    } finally {
      setPending(null);
    }
  }, [pending, collectedDogs, userId]);

  // Capture when all grid images have settled — with a safety timeout so a
  // stuck image load can never block generation forever.
  const expectedImages = pending
    ? Math.min(collectedDogs.length, Math.min(pending.required, 20))
    : 0;

  const onImageSettled = useCallback(() => {
    settledCount.current += 1;
    if (settledCount.current >= expectedImages) {
      // Small delay so the final image actually paints before capture
      setTimeout(doCapture, 150);
    }
  }, [expectedImages, doCapture]);

  useEffect(() => {
    if (!pending) return;
    const timeout = setTimeout(doCapture, 5000);
    return () => clearTimeout(timeout);
  }, [pending, doCapture]);

  const getShareImageUri = useCallback(
    (medalId: string) => index[medalId]?.uri ?? null,
    [index],
  );

  return (
    <BadgeShareContext.Provider value={{ getShareImageUri }}>
      {children}
      {/* Off-screen render target for capture */}
      {pending && (
        <View style={styles.offscreen} pointerEvents="none">
          <View ref={shotRef} collapsable={false}>
            <BadgeShareCard
              medal={pending}
              dogs={collectedDogs}
              onImageSettled={onImageSettled}
            />
          </View>
        </View>
      )}
    </BadgeShareContext.Provider>
  );
}

export function useBadgeShare() {
  return useContext(BadgeShareContext);
}

const styles = StyleSheet.create({
  offscreen: {
    position: "absolute",
    left: -10000,
    top: 0,
    opacity: 0.011, // must be > 0 on some Android versions for capture to work
  },
});
