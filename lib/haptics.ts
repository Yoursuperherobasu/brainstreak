import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '@/store/useSettingsStore';

// Settings-aware haptics. Reads `hapticsOn` from useSettingsStore on each call.
// Centralizing here means the rest of the app never imports expo-haptics directly.

// On web, `expo-haptics` ultimately delegates to `navigator.vibrate`, which
// Chrome refuses to fire before the user has interacted with the page —
// throwing a noisy "Blocked call to navigator.vibrate" error on every render
// of an in-game screen reached via direct URL. We track whether a user
// gesture has occurred and silently skip until then. After the first
// gesture we drop the gate and let haptics through normally.
let gestureSeen = Platform.OS !== 'web';
if (typeof window !== 'undefined' && Platform.OS === 'web') {
  const onGesture = () => { gestureSeen = true; };
  const once = { once: true } as AddEventListenerOptions;
  window.addEventListener('pointerdown', onGesture, once);
  window.addEventListener('keydown', onGesture, once);
  window.addEventListener('touchstart', onGesture, once);
}

function safe(fn: () => Promise<unknown>) {
  if (!useSettingsStore.getState().hapticsOn) return;
  if (!gestureSeen) return;
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
