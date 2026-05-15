// Settings state surface. Every persisted field except internal flags
// (`hydrated`, `onboarded`) MUST be exposed in the Profile screen OR a
// dedicated settings sub-screen. Audit performed 2026-05-16:
//
//   soundOn                        → Profile SettingsRow "Sound effects" (line ~232)
//   hapticsOn                      → Profile SettingsRow "Haptics" (line ~239)
//   dailyReminderTime              → /settings/reminder + Profile SettingsRow rightLabel (line ~246)
//   onboarded                      → internal, set by onboarding flow
//   lastDailyChallengeTappedDate   → set by DailyChallengeCard (no UI exposure)
//
// When adding a new persisted setting, also add its UI surface and update
// this audit comment.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '@/constants/config';
import { StorageKeys } from '@/lib/storage';
import { scheduleDailyReminder, cancelDailyReminder } from '@/lib/notifications';

export interface SettingsState {
  soundOn: boolean;
  hapticsOn: boolean;
  dailyReminderTime: string | null;
  onboarded: boolean;
  hydrated: boolean;
  lastDailyChallengeTappedDate: string | null;

  setSoundOn: (value: boolean) => void;
  setHapticsOn: (value: boolean) => void;
  setDailyReminderTime: (value: string | null) => void;
  setOnboarded: (value: boolean) => void;
  applyReminder: () => Promise<void>;
  _setHydrated: (value: boolean) => void;
  setLastDailyChallengeTappedDate: (value: string | null) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      soundOn: true,
      hapticsOn: true,
      dailyReminderTime: Config.DEFAULT_REMINDER_HHMM,
      onboarded: false,
      hydrated: false,
      lastDailyChallengeTappedDate: null,

      setSoundOn: (value) => set({ soundOn: value }),
      setHapticsOn: (value) => set({ hapticsOn: value }),
      setDailyReminderTime: (value) => {
        set({ dailyReminderTime: value });
        get().applyReminder();
      },
      setOnboarded: (value) => set({ onboarded: value }),

      applyReminder: async () => {
        const time = get().dailyReminderTime;
        if (!time) {
          await cancelDailyReminder();
          return;
        }
        await scheduleDailyReminder(time);
      },

      _setHydrated: (value) => set({ hydrated: value }),
      setLastDailyChallengeTappedDate: (value) => set({ lastDailyChallengeTappedDate: value }),
    }),
    {
      name: StorageKeys.SETTINGS,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        soundOn: state.soundOn,
        hapticsOn: state.hapticsOn,
        dailyReminderTime: state.dailyReminderTime,
        onboarded: state.onboarded,
        lastDailyChallengeTappedDate: state.lastDailyChallengeTappedDate,
      }),
      onRehydrateStorage: () => (state) => {
        state?._setHydrated(true);
      },
    }
  )
);
