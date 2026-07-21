import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

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
  { id: "b100", name: "DogDex Master", description: "Collected all 100 breeds", required: 100, icon: "star" },
];

interface CollectionContextValue {
  collectedDogs: CollectedDog[];
  addDog: (dog: Omit<CollectedDog, "timesSpotted">) => Promise<{ isNew: boolean; xpGained: number }>;
  bumpSpotted: (breedId: string) => Promise<void>;
  isCollected: (breedId: string) => boolean;
  getEntry: (breedId: string) => CollectedDog | undefined;
  collectionCount: number;
  xp: number;
  streak: number;
  lastDiscoveryDate: string | null;
  medals: Medal[];
  xpLevel: (typeof XP_LEVELS)[number];
}

const STORAGE_KEY = "@dogdex_v2_collection";
const XP_KEY = "@dogdex_v2_xp";
const STREAK_KEY = "@dogdex_v2_streak";
const LAST_DATE_KEY = "@dogdex_v2_last_date";

const CollectionContext = createContext<CollectionContextValue | null>(null);

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function CollectionProvider({ children }: { children: React.ReactNode }) {
  const [collectedDogs, setCollectedDogs] = useState<CollectedDog[]>([]);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastDiscoveryDate, setLastDiscoveryDate] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(XP_KEY),
      AsyncStorage.getItem(STREAK_KEY),
      AsyncStorage.getItem(LAST_DATE_KEY),
    ]).then(([dogs, xpStr, streakStr, lastDate]) => {
      if (dogs) try { setCollectedDogs(JSON.parse(dogs)); } catch { /* ignore */ }
      if (xpStr) setXp(parseInt(xpStr, 10) || 0);
      if (streakStr) setStreak(parseInt(streakStr, 10) || 0);
      if (lastDate) setLastDiscoveryDate(lastDate);
    });
  }, []);

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
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
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
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });

      if (isNew) {
        xpGained = XP_PER_RARITY[dog.rarity] ?? 10;
        setXp((prev) => {
          const next = prev + xpGained;
          AsyncStorage.setItem(XP_KEY, String(next));
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
          AsyncStorage.setItem(STREAK_KEY, String(newStreak));
          AsyncStorage.setItem(LAST_DATE_KEY, today);
          return today;
        });
      }

      return { isNew, xpGained };
    },
    [streak]
  );

  const bumpSpotted = useCallback(async (breedId: string) => {
    setCollectedDogs((prev) => {
      const updated = prev.map((d) =>
        d.breedId === breedId ? { ...d, timesSpotted: d.timesSpotted + 1 } : d
      );
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

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
