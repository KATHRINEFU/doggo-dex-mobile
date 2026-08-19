import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@clerk/expo";
import * as FileSystem from "expo-file-system/legacy";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export interface CollectedDog {
  breedId: string;
  breedName: string;
  imageUri: string;      // first / primary photo (backward compat)
  photos?: string[];     // all scanned photos, newest-first, capped at 10
  collectedAt: string;
  confidence: number;
  description: string;
  rarity: "common" | "uncommon" | "rare" | "legendary";
  timesSpotted: number;
}

export interface Medal {
  id: string;
  name: string;
  description: string;
  required: number;
  unlocked: boolean;
  icon: string;
}

const XP_PER_RARITY: Record<string, number> = {
  common: 10,
  uncommon: 25,
  rare: 60,
  legendary: 150,
};

export const XP_LEVELS = [
  { name: "Pup", min: 0, max: 99 },
  { name: "Scout", min: 100, max: 299 },
  { name: "Tracker", min: 300, max: 599 },
  { name: "Expert", min: 600, max: 999 },
  { name: "Master", min: 1000, max: 1999 },
  { name: "Legend", min: 2000, max: Infinity },
];

const BADGES: Omit<Medal, "unlocked">[] = [
  { id: "b10", name: "Puppy Scout", description: "Collected 10 breeds", required: 10, icon: "paw" },
  { id: "b20", name: "Hound Tracker", description: "Collected 20 breeds", required: 20, icon: "search" },
  { id: "b30", name: "Pack Leader", description: "Collected 30 breeds", required: 30, icon: "people" },
  { id: "b40", name: "Dog Whisperer", description: "Collected 40 breeds", required: 40, icon: "ear" },
  { id: "b50", name: "Breed Expert", description: "Collected 50 breeds", required: 50, icon: "ribbon" },
  { id: "b60", name: "Kennel Master", description: "Collected 60 breeds", required: 60, icon: "home" },
  { id: "b70", name: "Show Champion", description: "Collected 70 breeds", required: 70, icon: "star" },
  { id: "b80", name: "Legend Collector", description: "Collected 80 breeds", required: 80, icon: "medal" },
  { id: "b90", name: "Almost There!", description: "Collected 90 breeds", required: 90, icon: "sun" },
  { id: "b100", name: "Doggo Dex Master", description: "Collected all 100 breeds", required: 100, icon: "star" },
];

interface CollectionContextValue {
  collectedDogs: CollectedDog[];
  addDog: (dog: Omit<CollectedDog, "timesSpotted">) => Promise<{ isNew: boolean; xpGained: number }>;
  bumpSpotted: (breedId: string) => Promise<void>;
  resetCollection: () => Promise<void>;
  isCollected: (breedId: string) => boolean;
  getEntry: (breedId: string) => CollectedDog | undefined;
  collectionCount: number;
  xp: number;
  streak: number;
  lastDiscoveryDate: string | null;
  medals: Medal[];
  xpLevel: (typeof XP_LEVELS)[number];
}

/**
 * Progress is stored per signed-in account. Every key is suffixed with the
 * Clerk user id so two accounts sharing one device never see each other's Dex.
 * The unsuffixed v2 keys below are the old device-global storage; they are
 * deleted on first launch rather than migrated, because there is no way to
 * know which account that progress belonged to.
 */
const collectionKey = (uid: string) => `@dogdex_v3_collection:${uid}`;
const xpKey = (uid: string) => `@dogdex_v3_xp:${uid}`;
const streakKey = (uid: string) => `@dogdex_v3_streak:${uid}`;
const lastDateKey = (uid: string) => `@dogdex_v3_last_date:${uid}`;
export const badgeShareIndexKey = (uid: string) =>
  `@dogdex_v3_badge_share_images:${uid}`;

const userKeys = (uid: string) => [
  collectionKey(uid),
  xpKey(uid),
  streakKey(uid),
  lastDateKey(uid),
  badgeShareIndexKey(uid),
];

const LEGACY_KEYS = [
  "@dogdex_v2_collection",
  "@dogdex_v2_xp",
  "@dogdex_v2_streak",
  "@dogdex_v2_last_date",
  "@dogdex_v2_badge_share_images",
];

const CollectionContext = createContext<CollectionContextValue | null>(null);

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function CollectionProvider({ children }: { children: React.ReactNode }) {
  const { userId, isLoaded } = useAuth();
  const [collectedDogs, setCollectedDogs] = useState<CollectedDog[]>([]);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastDiscoveryDate, setLastDiscoveryDate] = useState<string | null>(null);

  /**
   * The account whose progress is currently held in state. Writes are only
   * persisted when this matches the signed-in account, so an update that is
   * in flight while accounts switch can never be saved under the wrong one.
   */
  const loadedUserRef = useRef<string | null>(null);

  const persist = useCallback(
    (makeKey: (uid: string) => string, value: string) => {
      const uid = loadedUserRef.current;
      if (!uid || uid !== userId) return;
      AsyncStorage.setItem(makeKey(uid), value).catch(() => {});
    },
    [userId],
  );

  // Discard the old device-global progress once — it is not attributable to
  // any account, and leaving it in place would keep leaking between users.
  useEffect(() => {
    AsyncStorage.multiRemove(LEGACY_KEYS).catch(() => {});
  }, []);

  // Load the signed-in account's progress; clear everything when signed out.
  useEffect(() => {
    if (!isLoaded) return;

    if (!userId) {
      loadedUserRef.current = null;
      setCollectedDogs([]);
      setXp(0);
      setStreak(0);
      setLastDiscoveryDate(null);
      return;
    }

    let cancelled = false;
    // Blank the previous account's data immediately so it is never visible
    // during the async read of the new account's data.
    loadedUserRef.current = null;
    setCollectedDogs([]);
    setXp(0);
    setStreak(0);
    setLastDiscoveryDate(null);

    AsyncStorage.multiGet([
      collectionKey(userId),
      xpKey(userId),
      streakKey(userId),
      lastDateKey(userId),
    ])
      .then((entries) => {
        if (cancelled) return;
        const [dogs, xpStr, streakStr, lastDate] = entries.map(([, v]) => v);
        if (dogs) {
          try {
            setCollectedDogs(JSON.parse(dogs));
          } catch {
            /* ignore */
          }
        }
        if (xpStr) setXp(parseInt(xpStr, 10) || 0);
        if (streakStr) setStreak(parseInt(streakStr, 10) || 0);
        if (lastDate) setLastDiscoveryDate(lastDate);
        loadedUserRef.current = userId;
      })
      .catch(() => {
        if (!cancelled) loadedUserRef.current = userId;
      });

    return () => {
      cancelled = true;
    };
  }, [userId, isLoaded]);

  const addDog = useCallback(
    async (dog: Omit<CollectedDog, "timesSpotted">): Promise<{ isNew: boolean; xpGained: number }> => {
      let isNew = false;
      let xpGained = 0;

      setCollectedDogs((prev) => {
        const existing = prev.find((d) => d.breedId === dog.breedId);
        if (existing) {
          // Append new photo (cap at 10, newest first) and bump spotted count
          const newPhotos = dog.imageUri
            ? [dog.imageUri, ...(existing.photos ?? [existing.imageUri])].slice(0, 10)
            : (existing.photos ?? [existing.imageUri]);
          const updated = prev.map((d) =>
            d.breedId === dog.breedId
              ? { ...d, timesSpotted: d.timesSpotted + 1, photos: newPhotos }
              : d
          );
          persist(collectionKey, JSON.stringify(updated));
          return updated;
        }
        isNew = true;
        xpGained = XP_PER_RARITY[dog.rarity] ?? 10;
        const newEntry: CollectedDog = {
          ...dog,
          timesSpotted: 1,
          photos: dog.imageUri ? [dog.imageUri] : [],
        };
        const updated = [...prev, newEntry];
        persist(collectionKey, JSON.stringify(updated));
        return updated;
      });

      if (isNew) {
        xpGained = XP_PER_RARITY[dog.rarity] ?? 10;
        setXp((prev) => {
          const next = prev + xpGained;
          persist(xpKey, String(next));
          return next;
        });

        // Update streak
        const today = todayStr();
        setLastDiscoveryDate((prevDate) => {
          let newStreak = streak;
          if (prevDate === null) {
            newStreak = 1;
          } else {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().slice(0, 10);
            if (prevDate === yesterdayStr) {
              newStreak = streak + 1;
            } else if (prevDate !== today) {
              newStreak = 1;
            }
          }
          setStreak(newStreak);
          persist(streakKey, String(newStreak));
          persist(lastDateKey, today);
          return today;
        });
      }

      return { isNew, xpGained };
    },
    [streak, persist]
  );

  const bumpSpotted = useCallback(
    async (breedId: string) => {
      setCollectedDogs((prev) => {
        const updated = prev.map((d) =>
          d.breedId === breedId ? { ...d, timesSpotted: d.timesSpotted + 1 } : d
        );
        persist(collectionKey, JSON.stringify(updated));
        return updated;
      });
    },
    [persist]
  );

  const resetCollection = useCallback(async () => {
    const badgeCachePaths = FileSystem.cacheDirectory
      ? BADGES.map(
          ({ id }) => `${FileSystem.cacheDirectory}doggodex-${id}.png`,
        )
      : [];

    await Promise.all([
      userId ? AsyncStorage.multiRemove(userKeys(userId)) : Promise.resolve(),
      ...badgeCachePaths.map((path) =>
        FileSystem.deleteAsync(path, { idempotent: true }),
      ),
    ]);
    setCollectedDogs([]);
    setXp(0);
    setStreak(0);
    setLastDiscoveryDate(null);
  }, [userId]);

  const isCollected = useCallback(
    (breedId: string) => collectedDogs.some((d) => d.breedId === breedId),
    [collectedDogs]
  );

  const getEntry = useCallback(
    (breedId: string) => collectedDogs.find((d) => d.breedId === breedId),
    [collectedDogs]
  );

  const medals: Medal[] = BADGES.map((b) => ({
    ...b,
    unlocked: collectedDogs.length >= b.required,
  }));

  const xpLevel = XP_LEVELS.findLast((l) => xp >= l.min) ?? XP_LEVELS[0];

  return (
    <CollectionContext.Provider
      value={{
        collectedDogs,
        addDog,
        bumpSpotted,
        resetCollection,
        isCollected,
        getEntry,
        collectionCount: collectedDogs.length,
        xp,
        streak,
        lastDiscoveryDate,
        medals,
        xpLevel,
      }}
    >
      {children}
    </CollectionContext.Provider>
  );
}

export function useCollection() {
  const ctx = useContext(CollectionContext);
  if (!ctx) throw new Error("useCollection must be used inside CollectionProvider");
  return ctx;
}
