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

  setSoundOn: (value: boolean) => void;
  setHapticsOn: (value: boolean) => void;
  setDailyReminderTime: (value: string | null) => void;
  setOnboarded: (value: boolean) => void;
  applyReminder: () => Promise<void>;
  _setHydrated: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      soundOn: true,
      hapticsOn: true,
      dailyReminderTime: Config.DEFAULT_REMINDER_HHMM,
      onboarded: false,
      hydrated: false,

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
    }),
    {
      name: StorageKeys.SETTINGS,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        soundOn: state.soundOn,
        hapticsOn: state.hapticsOn,
        dailyReminderTime: state.dailyReminderTime,
        onboarded: state.onboarded,
      }),
      onRehydrateStorage: () => (state) => {
        state?._setHydrated(true);
      },
    }
  )
);
