import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform, StyleSheet, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import * as FileSystem from "expo-file-system/legacy";
import { useCollection, type Medal } from "@/context/CollectionContext";
import { BadgeShareCard } from "@/components/BadgeShareCard";

/**
 * Pre-generates a shareable PNG for each badge the moment it unlocks, so the
 * share sheet opens instantly (no capture latency) when the user taps Share.
 *
 * Images are stored in the app's documents directory and indexed in
 * AsyncStorage as { [medalId]: fileUri }.
 */

const INDEX_KEY = "@dogdex_v2_badge_share_images";

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
  const { medals, collectedDogs } = useCollection();
  const [index, setIndex] = useState<Record<string, CacheEntry>>({});
  const [indexLoaded, setIndexLoaded] = useState(false);

  // Medal currently being rendered off-screen for capture
  const [pending, setPending] = useState<Medal | null>(null);
  const shotRef = useRef<View>(null);
  const settledCount = useRef(0);
  const capturing = useRef(false);
  // Capped retries per medal so a persistent capture failure can't loop forever
  const failures = useRef<Record<string, number>>({});

  // Load the index once
  useEffect(() => {
    AsyncStorage.getItem(INDEX_KEY).then((raw) => {
      if (raw) {
        try {
          setIndex(JSON.parse(raw));
        } catch {
          /* ignore */
        }
      }
      setIndexLoaded(true);
    });
  }, []);

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
    capturing.current = true;
    const medal = pending;
    try {
      const tmpUri = await captureRef(shotRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });
      const dest = `${FileSystem.documentDirectory}badge-share-${medal.id}.png`;
      // Overwrite any stale file
      await FileSystem.deleteAsync(dest, { idempotent: true });
      await FileSystem.moveAsync({ from: tmpUri, to: dest });

      setIndex((prev) => {
        const next: Record<string, CacheEntry> = {
          ...prev,
          [medal.id]: { uri: dest, sig: cardSignature(medal, collectedDogs) },
        };
        AsyncStorage.setItem(INDEX_KEY, JSON.stringify(next));
        return next;
      });
      delete failures.current[medal.id];
    } catch (e) {
      failures.current[medal.id] = (failures.current[medal.id] ?? 0) + 1;
      console.warn("[BadgeShare] capture failed", e);
    } finally {
      setPending(null);
    }
  }, [pending, collectedDogs]);

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
