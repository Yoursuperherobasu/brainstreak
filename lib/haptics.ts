import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '@/store/useSettingsStore';

// Settings-aware haptics. Reads `hapticsOn` from useSettingsStore on each call.
// Centralizing here means the rest of the app never imports expo-haptics directly.

function safe(fn: () => Promise<unknown>) {
  if (!useSettingsStore.getState().hapticsOn) return;
  fn().catch(() => {});
}

export const haptics = {
  light: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  heavy: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  selection: () => safe(() => Haptics.selectionAsync()),
};
