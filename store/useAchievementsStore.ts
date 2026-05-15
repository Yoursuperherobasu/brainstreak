import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface S {
  unlocked: string[];
  hydrated: boolean;
  recordUnlocked: (ids: string[]) => string[]; // returns newly unlocked
  _setHydrated: (v: boolean) => void;
}

export const useAchievementsStore = create<S>()(
  persist(
    (set, get) => ({
      unlocked: [],
      hydrated: false,
      recordUnlocked: (ids) => {
        const cur = new Set(get().unlocked);
        const fresh = ids.filter((id) => !cur.has(id));
        if (fresh.length === 0) return [];
        set({ unlocked: [...get().unlocked, ...fresh] });
        return fresh;
      },
      _setHydrated: (v) => set({ hydrated: v }),
    }),
    {
      name: '@brainstreak/achievements',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ unlocked: s.unlocked }),
      onRehydrateStorage: () => (s) => s?._setHydrated(true),
    },
  ),
);
