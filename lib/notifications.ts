import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { computeNextReminder } from '@/lib/notification-time';
import { getStreakData } from '@/lib/storage';

const REMINDER_IDENTIFIER = 'brainstreak.daily-reminder';
const ANDROID_CHANNEL_ID = 'daily-reminder';

export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Daily reminder',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200, 100, 200],
    lightColor: '#7C3AED',
  });
}

export async function getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return 'granted';
  if (settings.canAskAgain) return 'undetermined';
  return 'denied';
}

export async function requestPermission(): Promise<'granted' | 'denied'> {
  const settings = await Notifications.requestPermissionsAsync();
  return settings.granted ? 'granted' : 'denied';
}

export async function cancelDailyReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER);
  } catch {
    // identifier may not exist; ignore
  }
}

export async function scheduleDailyReminder(reminderHHMM: string): Promise<{ ok: boolean; reason?: string }> {
  const status = await getPermissionStatus();
  if (status !== 'granted') {
    return { ok: false, reason: 'permission-not-granted' };
  }
  await ensureAndroidChannel();
  await cancelDailyReminder();

  const streak = await getStreakData();
  const next = computeNextReminder({
    now: new Date(),
    reminderHHMM,
    lastPlayDate: streak.lastPlayDate,
  });

  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_IDENTIFIER,
    content: {
      title: streak.current > 0 ? `Don't break your ${streak.current}-day streak 🔥` : 'Time to flex your brain 🧠',
      body: 'A 5-question round takes about a minute.',
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: next.fireAt,
      channelId: ANDROID_CHANNEL_ID,
    },
  });

  return { ok: true };
}
