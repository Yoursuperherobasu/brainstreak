import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '@/constants/config';
import { StorageKeys } from '@/lib/storage';

export interface SettingsState {
  soundOn: boolean;
  hapticsOn: boolean;
  dailyReminderTime: string | null;
  hydrated: boolean;

  setSoundOn: (value: boolean) => void;
  setHapticsOn: (value: boolean) => void;
  setDailyReminderTime: (value: string | null) => void;
  _setHydrated: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      soundOn: true,
      hapticsOn: true,
      dailyReminderTime: Config.DEFAULT_REMINDER_HHMM,
      hydrated: false,

      setSoundOn: (value) => set({ soundOn: value }),
      setHapticsOn: (value) => set({ hapticsOn: value }),
      setDailyReminderTime: (value) => set({ dailyReminderTime: value }),
      _setHydrated: (value) => set({ hydrated: value }),
    }),
    {
      name: StorageKeys.SETTINGS,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        soundOn: state.soundOn,
        hapticsOn: state.hapticsOn,
        dailyReminderTime: state.dailyReminderTime,
      }),
      onRehydrateStorage: () => (state) => {
        state?._setHydrated(true);
      },
    }
  )
);
