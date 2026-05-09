import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const REMINDER_IDENTIFIER = 'brainstreak.daily-reminder';
const ANDROID_CHANNEL_ID = 'daily-reminder';

// Foreground display behavior must be configured exactly once at app start.
// Without this, notifications fired while the app is open are silently dropped.
let handlerInstalled = false;
export function ensureForegroundHandler(): void {
  if (handlerInstalled) return;
  handlerInstalled = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      // SDK 54 added explicit banner/list controls; default to showing.
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

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

function parseHHMM(s: string): { hour: number; minute: number } {
  const [h, m] = s.split(':');
  const hour = Math.max(0, Math.min(23, parseInt(h, 10) || 0));
  const minute = Math.max(0, Math.min(59, parseInt(m, 10) || 0));
  return { hour, minute };
}

// Schedule a daily-repeating reminder at the given local HH:MM.
// CALENDAR with repeats:true means the OS handles the recurrence — we don't
// have to re-schedule each day (A3 fix).
export async function scheduleDailyReminder(reminderHHMM: string): Promise<{ ok: boolean; reason?: string }> {
  const status = await getPermissionStatus();
  if (status !== 'granted') {
    return { ok: false, reason: 'permission-not-granted' };
  }
  await ensureAndroidChannel();
  await cancelDailyReminder();

  const { hour, minute } = parseHHMM(reminderHHMM);

  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_IDENTIFIER,
    content: {
      title: 'Time to flex your brain 🧠',
      body: 'A 5-question round takes about a minute. Keep your streak alive.',
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour,
      minute,
      repeats: true,
      channelId: ANDROID_CHANNEL_ID,
    },
  });

  return { ok: true };
}
