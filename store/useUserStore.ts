import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  StorageKeys,
  StreakData,
  LocalProfile,
  DEFAULT_USERNAME,
} from '@/lib/storage';
import { getCurrentSession } from '@/lib/auth';
import { pullAndMerge, pushProfile } from '@/lib/sync';

export type AuthState = 'unknown' | 'anonymous' | 'authenticated';

export interface UserState {
  profile: LocalProfile;
  streak: StreakData;
  authState: AuthState;
  authedUserId: string | null;
  hydrated: boolean;
  bootstrapped: boolean;

  setUsername: (username: string) => void;
  setProfile: (profile: LocalProfile) => void;
  setStreak: (streak: StreakData) => void;
  setAuthenticated: (userId: string) => void;
  setAnonymous: () => void;
  reset: () => void;

  bootstrapAuth: () => Promise<void>;
  signInAndSync: (userId: string) => Promise<void>;
  pushIfAuthed: () => Promise<void>;

  _setHydrated: (value: boolean) => void;
}

const initialProfile: LocalProfile = {
  username: DEFAULT_USERNAME,
  totalXP: 0,
  level: 1,
  gamesPlayed: 0,
};

const initialStreak: StreakData = {
  current: 0,
  longest: 0,
  lastPlayDate: null,
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      profile: initialProfile,
      streak: initialStreak,
      authState: 'unknown',
      authedUserId: null,
      hydrated: false,
      bootstrapped: false,

      setUsername: (username) =>
        set((s) => ({ profile: { ...s.profile, username } })),
      setProfile: (profile) => set({ profile }),
      setStreak: (streak) => set({ streak }),
      setAuthenticated: (userId) =>
        set({ authState: 'authenticated', authedUserId: userId }),
      setAnonymous: () => set({ authState: 'anonymous', authedUserId: null }),
      reset: () =>
        set({
          profile: initialProfile,
          streak: initialStreak,
          authState: 'anonymous',
          authedUserId: null,
        }),

      bootstrapAuth: async () => {
        if (get().bootstrapped) return;
        try {
          const { userId } = await getCurrentSession();
          if (userId) {
            set({ authState: 'authenticated', authedUserId: userId });
            await get().signInAndSync(userId);
          } else if (get().authState === 'unknown') {
            set({ authState: 'anonymous' });
          }
        } finally {
          set({ bootstrapped: true });
        }
      },

      signInAndSync: async (userId) => {
        const { profile, streak } = get();
        try {
          const merged = await pullAndMerge(userId, profile, streak);
          set({
            profile: merged.profile,
            streak: merged.streak,
            authState: 'authenticated',
            authedUserId: userId,
          });
          await pushProfile(userId, merged.profile, merged.streak);
        } catch (e) {
          console.warn('[useUserStore] signInAndSync failed:', e);
        }
      },

      pushIfAuthed: async () => {
        const { authState, authedUserId, profile, streak } = get();
        if (authState !== 'authenticated' || !authedUserId) return;
        await pushProfile(authedUserId, profile, streak);
      },

      _setHydrated: (value) => set({ hydrated: value }),
    }),
    {
      name: StorageKeys.PROFILE,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        profile: state.profile,
        streak: state.streak,
        authState: state.authState,
        authedUserId: state.authedUserId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.authState === 'unknown') {
          state.authState = 'anonymous';
        }
        state?._setHydrated(true);
      },
    }
  )
);
