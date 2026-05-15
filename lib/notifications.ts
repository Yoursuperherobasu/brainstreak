import { Platform } from 'react-native';

const REMINDER_IDENTIFIER = 'brainstreak.daily-reminder';
const ANDROID_CHANNEL_ID = 'daily-reminder';

// `expo-notifications` is loaded lazily and ONLY on native. On web every API
// is a no-op — its module-load side-effects (push-token listeners, etc.) print
// noisy "not yet fully supported on web" warnings on every screen, which is
// pure console pollution for users hitting the static export. By gating the
// require behind `Platform.OS !== 'web'` we skip the import entirely on web.
type NotificationsModule = typeof import('expo-notifications');
let _notif: NotificationsModule | null = null;
function notif(): NotificationsModule | null {
  if (Platform.OS === 'web') return null;
  if (_notif) return _notif;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _notif = require('expo-notifications') as NotificationsModule;
    return _notif;
  } catch {
    return null;
  }
}

// Foreground display behavior must be configured exactly once at app start.
// Without this, notifications fired while the app is open are silently dropped.
let handlerInstalled = false;
export function ensureForegroundHandler(): void {
  if (handlerInstalled) return;
  const N = notif();
  if (!N) { handlerInstalled = true; return; }
  handlerInstalled = true;
  N.setNotificationHandler({
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
  const N = notif();
  if (!N) return;
  await N.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Daily reminder',
    importance: N.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200, 100, 200],
    lightColor: '#7C3AED',
  });
}

export async function getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  const N = notif();
  if (!N) return 'denied';
  const settings = await N.getPermissionsAsync();
  if (settings.granted) return 'granted';
  if (settings.canAskAgain) return 'undetermined';
  return 'denied';
}

export async function requestPermission(): Promise<'granted' | 'denied'> {
  const N = notif();
  if (!N) return 'denied';
  const settings = await N.requestPermissionsAsync();
  return settings.granted ? 'granted' : 'denied';
}

export async function cancelDailyReminder(): Promise<void> {
  const N = notif();
  if (!N) return;
  try {
    await N.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER);
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
  const N = notif();
  if (!N) return { ok: false, reason: 'unsupported-on-web' };
  const status = await getPermissionStatus();
  if (status !== 'granted') {
    return { ok: false, reason: 'permission-not-granted' };
  }
  await ensureAndroidChannel();
  await cancelDailyReminder();

  const { hour, minute } = parseHHMM(reminderHHMM);

  await N.scheduleNotificationAsync({
    identifier: REMINDER_IDENTIFIER,
    content: {
      title: 'Time to flex your brain',
      body: 'A 5-question round takes about a minute. Keep your streak alive.',
      sound: 'default',
    },
    trigger: {
      type: N.SchedulableTriggerInputTypes.CALENDAR,
      hour,
      minute,
      repeats: true,
      channelId: ANDROID_CHANNEL_ID,
    },
  });

  return { ok: true };
}
