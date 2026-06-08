import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface CollectedDog {
  breedId: string;
  breedName: string;
  imageUri: string;
  collectedAt: string;
  confidence: number;
  description: string;
}

interface CollectionContextValue {
  collectedDogs: CollectedDog[];
  addDog: (dog: CollectedDog) => Promise<void>;
  isCollected: (breedId: string) => boolean;
  collectionCount: number;
  medals: Medal[];
}

export interface Medal {
  id: string;
  name: string;
  description: string;
  required: number;
  unlocked: boolean;
  icon: string;
}

const MEDALS: Omit<Medal, "unlocked">[] = [
  { id: "puppy", name: "Puppy Scout", description: "Collected your first 10 breeds", required: 10, icon: "paw" },
  { id: "hound", name: "Hound Tracker", description: "Collected 20 breeds", required: 20, icon: "search" },
  { id: "shepherd", name: "Master Shepherd", description: "Collected 50 breeds", required: 50, icon: "star" },
  { id: "kennel", name: "Grand Kennel Master", description: "Collected all breeds", required: 32, icon: "trophy" },
];

const STORAGE_KEY = "@dogdex_collection";

const CollectionContext = createContext<CollectionContextValue | null>(null);

export function CollectionProvider({ children }: { children: React.ReactNode }) {
  const [collectedDogs, setCollectedDogs] = useState<CollectedDog[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setCollectedDogs(JSON.parse(raw));
        } catch {
          // ignore
        }
      }
    });
  }, []);

  const addDog = useCallback(async (dog: CollectedDog) => {
    setCollectedDogs((prev) => {
      const already = prev.find((d) => d.breedId === dog.breedId);
      if (already) return prev;
      const updated = [...prev, dog];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isCollected = useCallback(
    (breedId: string) => collectedDogs.some((d) => d.breedId === breedId),
    [collectedDogs]
  );

  const medals: Medal[] = MEDALS.map((m) => ({
    ...m,
    unlocked: collectedDogs.length >= m.required,
  }));

  return (
    <CollectionContext.Provider
      value={{
        collectedDogs,
        addDog,
        isCollected,
        collectionCount: collectedDogs.length,
        medals,
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
