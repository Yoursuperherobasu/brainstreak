import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GameId } from '@/constants/games';

interface PersonalBestEntry {
  bestScore: number;
  bestAt: string;
}

export type PersonalBests = Partial<Record<GameId, PersonalBestEntry>>;

export interface PersonalBestState {
  bests: PersonalBests;
  hydrated: boolean;
  recordScore: (
    gameId: GameId,
    score: number,
  ) => { wasNewBest: boolean; previousBest: number };
  _setHydrated: (v: boolean) => void;
}

export const usePersonalBestStore = create<PersonalBestState>()(
  persist(
    (set, get) => ({
      bests: {},
      hydrated: false,

      recordScore: (gameId, score) => {
        const current = get().bests[gameId];
        const previousBest = current?.bestScore ?? 0;
        if (score > previousBest) {
          set({
            bests: {
              ...get().bests,
              [gameId]: { bestScore: score, bestAt: new Date().toISOString() },
            },
          });
          return { wasNewBest: true, previousBest };
        }
        return { wasNewBest: false, previousBest };
      },

      _setHydrated: (v) => set({ hydrated: v }),
    }),
    {
      name: '@brainstreak/personal-bests',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ bests: s.bests }),
      onRehydrateStorage: () => (s) => s?._setHydrated(true),
    },
  ),
);
