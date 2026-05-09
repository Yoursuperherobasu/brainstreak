# BrainStreak Phase 5 — Notifications + Onboarding + Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire a daily reminder via `expo-notifications` (default 19:00 local, skip when already played today) and a 3-screen onboarding flow that runs once. Add a permission-aware Settings entry to choose the reminder time. Cover the new logic with unit tests.

**Architecture:** A pure helper `lib/notification-time.ts` computes the next reminder Date from a clock + HH:MM + lastPlayDate; `lib/notifications.ts` is a thin wrapper around `expo-notifications` for permissions and scheduling, calling the pure helper. `useSettingsStore` exposes `applyReminder` to (re)schedule whenever `dailyReminderTime` changes. Onboarding is a 3-screen stack at `app/onboarding/*`, gated by an `onboarded` flag persisted in `useSettingsStore`. The root layout redirects to `/onboarding/welcome` on first launch.

**Tech Stack:** Expo SDK 54, expo-notifications (already in package.json), expo-router 55, Zustand 5 with persist, Jest 29.

---

## File Map

**Files created in this phase:**
- `lib/notification-time.ts` — pure helper computing the next reminder Date
- `lib/notifications.ts` — permission + schedule wrapper around expo-notifications
- `app/onboarding/_layout.tsx` — stack layout for onboarding
- `app/onboarding/welcome.tsx` — first onboarding screen
- `app/onboarding/username.tsx` — second onboarding screen
- `app/onboarding/sign-in-prompt.tsx` — third onboarding screen
- `app/settings/reminder.tsx` — modal time picker for the daily reminder
- `__tests__/notification-time.test.ts` — tests for the pure helper

**Files modified in this phase:**
- `store/useSettingsStore.ts` — add `onboarded` flag + `applyReminder` action
- `app/_layout.tsx` — register onboarding stack route, add "settings/reminder" route, redirect on first launch
- `app/(tabs)/profile.tsx` — replace the static reminder UI with a `SettingsRow nav` that opens the time picker

**Files deleted in this phase:** none.

---

### Task 1: Add lib/notification-time.ts and tests

**Files:**
- Create: `lib/notification-time.ts`
- Create: `__tests__/notification-time.test.ts`

This is a pure helper — easy to test, no side effects, no React.

- [ ] **Step 1: Create lib/notification-time.ts**

Create `lib/notification-time.ts`:

```ts
// Pure logic for "when should the next daily reminder fire?"
// Separated from expo-notifications wiring so we can unit-test without mocks.

export interface NextReminderInput {
  now: Date;
  // 'HH:MM' in 24-hour local time
  reminderHHMM: string;
  // ISO date 'YYYY-MM-DD' of the user's last completed game; null if never
  lastPlayDate: string | null;
}

export interface NextReminder {
  fireAt: Date;
  // true if today's slot is skipped because the user already played today
  skippedToday: boolean;
}

function parseHHMM(s: string): { hours: number; minutes: number } {
  const [hRaw, mRaw] = s.split(':');
  const hours = Math.max(0, Math.min(23, parseInt(hRaw, 10) || 0));
  const minutes = Math.max(0, Math.min(59, parseInt(mRaw, 10) || 0));
  return { hours, minutes };
}

function todayLocalISO(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function computeNextReminder(input: NextReminderInput): NextReminder {
  const { now, reminderHHMM, lastPlayDate } = input;
  const { hours, minutes } = parseHHMM(reminderHHMM);

  const today = todayLocalISO(now);
  const playedToday = lastPlayDate === today;

  const todaySlot = new Date(now);
  todaySlot.setHours(hours, minutes, 0, 0);

  if (playedToday) {
    // Skip today; fire tomorrow.
    const tomorrow = new Date(todaySlot);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { fireAt: tomorrow, skippedToday: true };
  }

  if (todaySlot.getTime() > now.getTime()) {
    return { fireAt: todaySlot, skippedToday: false };
  }

  // Slot already passed and the user hasn't played; fire tomorrow.
  const tomorrow = new Date(todaySlot);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { fireAt: tomorrow, skippedToday: false };
}
```

- [ ] **Step 2: Create __tests__/notification-time.test.ts**

Create `__tests__/notification-time.test.ts`:

```ts
import { computeNextReminder } from '@/lib/notification-time';

function makeNow(year: number, monthIndex: number, day: number, hours: number, minutes: number) {
  return new Date(year, monthIndex, day, hours, minutes, 0, 0);
}

describe('computeNextReminder', () => {
  test('today slot is in the future and user has not played → fire today', () => {
    const now = makeNow(2026, 4, 9, 10, 0); // 2026-05-09 10:00
    const result = computeNextReminder({
      now,
      reminderHHMM: '19:00',
      lastPlayDate: null,
    });
    expect(result.skippedToday).toBe(false);
    expect(result.fireAt.getFullYear()).toBe(2026);
    expect(result.fireAt.getMonth()).toBe(4);
    expect(result.fireAt.getDate()).toBe(9);
    expect(result.fireAt.getHours()).toBe(19);
    expect(result.fireAt.getMinutes()).toBe(0);
  });

  test('today slot has already passed → fire tomorrow at the same time', () => {
    const now = makeNow(2026, 4, 9, 21, 0); // 2026-05-09 21:00, after 19:00
    const result = computeNextReminder({
      now,
      reminderHHMM: '19:00',
      lastPlayDate: null,
    });
    expect(result.skippedToday).toBe(false);
    expect(result.fireAt.getDate()).toBe(10);
    expect(result.fireAt.getHours()).toBe(19);
  });

  test('user already played today → skip and fire tomorrow', () => {
    const now = makeNow(2026, 4, 9, 10, 0);
    const result = computeNextReminder({
      now,
      reminderHHMM: '19:00',
      lastPlayDate: '2026-05-09',
    });
    expect(result.skippedToday).toBe(true);
    expect(result.fireAt.getDate()).toBe(10);
    expect(result.fireAt.getHours()).toBe(19);
  });

  test('user played yesterday and today slot is upcoming → fire today', () => {
    const now = makeNow(2026, 4, 9, 10, 0);
    const result = computeNextReminder({
      now,
      reminderHHMM: '19:00',
      lastPlayDate: '2026-05-08',
    });
    expect(result.skippedToday).toBe(false);
    expect(result.fireAt.getDate()).toBe(9);
  });

  test('respects custom reminder time', () => {
    const now = makeNow(2026, 4, 9, 6, 0);
    const result = computeNextReminder({
      now,
      reminderHHMM: '08:30',
      lastPlayDate: null,
    });
    expect(result.fireAt.getHours()).toBe(8);
    expect(result.fireAt.getMinutes()).toBe(30);
  });

  test('clamps invalid HH:MM safely (defaults to 00:00)', () => {
    const now = makeNow(2026, 4, 9, 10, 0);
    const result = computeNextReminder({
      now,
      reminderHHMM: '99:99',
      lastPlayDate: null,
    });
    // 23:59 clamped, time already passed → tomorrow at 23:59
    expect(result.fireAt.getHours()).toBe(23);
    expect(result.fireAt.getMinutes()).toBe(59);
  });

  test('month rollover when slot crosses end-of-month', () => {
    const now = makeNow(2026, 4, 31, 21, 0); // 2026-05-31 21:00
    const result = computeNextReminder({
      now,
      reminderHHMM: '19:00',
      lastPlayDate: null,
    });
    // Tomorrow → 2026-06-01
    expect(result.fireAt.getMonth()).toBe(5); // June
    expect(result.fireAt.getDate()).toBe(1);
  });
});
```

- [ ] **Step 3: Run the tests**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npm test -- __tests__/notification-time.test.ts
```

Expected: 7 tests pass.

- [ ] **Step 4: Commit**

```bash
git add lib/notification-time.ts __tests__/notification-time.test.ts
git commit -m "Add computeNextReminder pure helper with unit tests"
```

---

### Task 2: Add lib/notifications.ts wrapper

**Files:**
- Create: `lib/notifications.ts`

- [ ] **Step 1: Create lib/notifications.ts**

Create `lib/notifications.ts`:

```ts
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
```

- [ ] **Step 2: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors. If `SchedulableTriggerInputTypes.DATE` is not exported under that name in the installed expo-notifications version, fall back to passing the trigger as `{ type: 'date', date: next.fireAt, channelId: ANDROID_CHANNEL_ID }` — both shapes are accepted at runtime in SDK 54.

- [ ] **Step 3: Commit**

```bash
git add lib/notifications.ts
git commit -m "Add notifications wrapper with permission + daily schedule helpers"
```

---

### Task 3: Extend useSettingsStore with onboarded flag and applyReminder

**Files:**
- Modify: `store/useSettingsStore.ts`

- [ ] **Step 1: Replace contents of store/useSettingsStore.ts**

Replace the entire contents of `store/useSettingsStore.ts` with:

```ts
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
```

- [ ] **Step 2: Verify type-check and tests**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit && npm test
```

Expected: 0 type errors; 45 tests pass (38 prior + 7 notification-time).

- [ ] **Step 3: Commit**

```bash
git add store/useSettingsStore.ts
git commit -m "Add onboarded flag and applyReminder to useSettingsStore"
```

---

### Task 4: Add settings/reminder time-picker modal

**Files:**
- Create: `app/settings/reminder.tsx`

- [ ] **Step 1: Create the screen**

Create `app/settings/reminder.tsx`:

```tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getPermissionStatus, requestPermission } from '@/lib/notifications';

const PRESETS = ['07:00', '09:00', '12:00', '17:00', '19:00', '21:00'];

export default function ReminderScreen() {
  const dailyReminderTime = useSettingsStore((s) => s.dailyReminderTime);
  const setDailyReminderTime = useSettingsStore((s) => s.setDailyReminderTime);
  const [pending, setPending] = useState<string | null>(dailyReminderTime);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (pending === null) {
        setDailyReminderTime(null);
        router.back();
        return;
      }
      const status = await getPermissionStatus();
      if (status === 'denied') {
        Alert.alert(
          'Notifications disabled',
          'Open Settings → Apps → BrainStreak → Notifications to allow reminders.'
        );
        setSaving(false);
        return;
      }
      if (status === 'undetermined') {
        const next = await requestPermission();
        if (next !== 'granted') {
          Alert.alert(
            'Reminder not set',
            'You can enable notifications later from Profile.'
          );
          setSaving(false);
          return;
        }
      }
      setDailyReminderTime(pending);
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Daily reminder</Text>
        <Text style={styles.subtitle}>
          One short nudge each day to keep your streak alive.
        </Text>

        <View style={styles.presetGrid}>
          {PRESETS.map((time) => {
            const isSelected = pending === time;
            return (
              <TouchableOpacity
                key={time}
                onPress={() => setPending(time)}
                style={[
                  styles.preset,
                  isSelected && styles.presetActive,
                ]}
              >
                <Text style={[styles.presetText, isSelected && styles.presetTextActive]}>
                  {time}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity onPress={() => setPending(null)} style={styles.disableRow}>
          <Text style={[styles.disableText, pending === null && styles.disableTextActive]}>
            {pending === null ? '✓ Reminders off' : 'Turn reminders off'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          We never notify on days you've already played.
        </Text>

        <Button
          label={saving ? 'Saving...' : 'Save'}
          onPress={handleSave}
          loading={saving}
          size="lg"
          style={{ marginTop: Spacing.lg }}
        />
        <TouchableOpacity onPress={() => router.back()} style={styles.cancelWrap}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: Spacing.lg, paddingTop: Spacing.xl },
  title: {
    fontSize: FontSize.xxxl,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_900Black',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    marginBottom: Spacing.lg,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  preset: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 16,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  presetActive: {
    backgroundColor: `${Colors.primary}25`,
    borderColor: Colors.primary,
  },
  presetText: {
    fontSize: FontSize.lg,
    fontFamily: 'Outfit_700Bold',
    color: Colors.textSecondary,
  },
  presetTextActive: { color: Colors.primaryLight },
  disableRow: {
    marginTop: Spacing.md,
    paddingVertical: 14,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  disableText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
  },
  disableTextActive: { color: Colors.danger },
  note: {
    marginTop: Spacing.md,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  cancelWrap: { marginTop: Spacing.md, alignItems: 'center' },
  cancelText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontFamily: 'Inter_400Regular',
  },
});
```

- [ ] **Step 2: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/settings/reminder.tsx
git commit -m "Add daily reminder time-picker modal with presets"
```

---

### Task 5: Add SettingsRow nav for Reminder in Profile

**Files:**
- Modify: `app/(tabs)/profile.tsx`

- [ ] **Step 1: Add the row**

Open `app/(tabs)/profile.tsx`. Find the existing Haptics SettingsRow and the conditional Sign-out row. Insert a new SettingsRow between them, **before** the `authState === 'authenticated'` block:

```tsx
          <SettingsRow
            kind="nav"
            emoji="⏰"
            label="Daily reminder"
            description="Pick a time that works for you"
            rightLabel={useSettingsStore((s) => s.dailyReminderTime) ?? 'Off'}
            onPress={() => router.push('/settings/reminder')}
          />
```

The `useSettingsStore` selector inline within JSX is fine here — Zustand selectors don't break rules-of-hooks. If lint complains, hoist it to the top of the component:

```tsx
const dailyReminderTime = useSettingsStore((s) => s.dailyReminderTime);
```

…and reference `dailyReminderTime ?? 'Off'` in the row.

- [ ] **Step 2: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors. (If TS complains about the inline hook usage, hoist as described.)

- [ ] **Step 3: Commit**

```bash
git add app/\(tabs\)/profile.tsx
git commit -m "Add Daily reminder row to Profile settings"
```

---

### Task 6: Register settings stack route

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Append the new screen registration**

Open `app/_layout.tsx`. Locate the existing `<Stack>` block:

```tsx
<Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
  <Stack.Screen name="(tabs)" />
  <Stack.Screen
    name="game/session"
    options={{
      animation: 'slide_from_bottom',
      presentation: 'fullScreenModal',
    }}
  />
  <Stack.Screen
    name="auth/sign-in"
    options={{
      animation: 'slide_from_bottom',
      presentation: 'modal',
    }}
  />
</Stack>
```

Replace it with:

```tsx
<Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
  <Stack.Screen name="(tabs)" />
  <Stack.Screen
    name="game/session"
    options={{
      animation: 'slide_from_bottom',
      presentation: 'fullScreenModal',
    }}
  />
  <Stack.Screen
    name="auth/sign-in"
    options={{
      animation: 'slide_from_bottom',
      presentation: 'modal',
    }}
  />
  <Stack.Screen
    name="settings/reminder"
    options={{
      animation: 'slide_from_bottom',
      presentation: 'modal',
    }}
  />
  <Stack.Screen
    name="onboarding"
    options={{
      animation: 'fade',
      presentation: 'fullScreenModal',
    }}
  />
</Stack>
```

- [ ] **Step 2: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "Register settings/reminder modal and onboarding stack routes"
```

---

### Task 7: Build the onboarding stack — layout

**Files:**
- Create: `app/onboarding/_layout.tsx`

- [ ] **Step 1: Create the layout**

Create `app/onboarding/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="username" />
      <Stack.Screen name="sign-in-prompt" />
    </Stack>
  );
}
```

- [ ] **Step 2: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors. (Will report missing screens until Tasks 8-10; ignore for now.)

- [ ] **Step 3: Commit**

```bash
git add app/onboarding/_layout.tsx
git commit -m "Add onboarding stack layout"
```

---

### Task 8: Onboarding — welcome screen

**Files:**
- Create: `app/onboarding/welcome.tsx`

- [ ] **Step 1: Create the screen**

Create `app/onboarding/welcome.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Button } from '@/components/Button';
import { Colors, Gradients, Spacing, FontSize } from '@/constants/theme';

export default function WelcomeScreen() {
  return (
    <LinearGradient colors={Gradients.hero} style={styles.bg}>
      <SafeAreaView style={styles.container}>
        <View style={styles.body}>
          <Animated.Text entering={FadeIn.duration(400)} style={styles.emoji}>🧠</Animated.Text>
          <Animated.Text entering={FadeInDown.delay(150).springify()} style={styles.title}>
            BrainStreak
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(250).springify()} style={styles.tagline}>
            Sharpen your brain in 60 seconds a day.
          </Animated.Text>

          <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.points}>
            {[
              ['⚡', '5 questions, 15 seconds each'],
              ['🔥', 'Build a streak by playing daily'],
              ['🏆', 'Level up across 6 categories'],
            ].map(([emoji, text]) => (
              <View key={text} style={styles.point}>
                <Text style={styles.pointEmoji}>{emoji}</Text>
                <Text style={styles.pointText}>{text}</Text>
              </View>
            ))}
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(550).springify()} style={styles.footer}>
          <Button
            label="Let's go 🚀"
            onPress={() => router.push('/onboarding/username')}
            size="lg"
          />
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  container: { flex: 1 },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  emoji: { fontSize: 96 },
  title: {
    fontSize: 56,
    fontFamily: 'Outfit_900Black',
    color: Colors.textPrimary,
    letterSpacing: -1.5,
    marginTop: 8,
  },
  tagline: {
    fontSize: FontSize.lg,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  points: {
    marginTop: Spacing.lg,
    gap: 12,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.lg,
  },
  point: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pointEmoji: { fontSize: 22, width: 32 },
  pointText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontFamily: 'Inter_400Regular',
  },
  footer: { padding: Spacing.lg, paddingBottom: Spacing.xl },
});
```

- [ ] **Step 2: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/onboarding/welcome.tsx
git commit -m "Add onboarding welcome screen"
```

---

### Task 9: Onboarding — username screen

**Files:**
- Create: `app/onboarding/username.tsx`

- [ ] **Step 1: Create the screen**

Create `app/onboarding/username.tsx`:

```tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button } from '@/components/Button';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import { useUserStore } from '@/store/useUserStore';
import { DEFAULT_USERNAME } from '@/lib/storage';

export default function UsernameScreen() {
  const currentUsername = useUserStore((s) => s.profile.username);
  const setUsername = useUserStore((s) => s.setUsername);
  const [draft, setDraft] = useState(
    currentUsername === DEFAULT_USERNAME ? '' : currentUsername
  );

  const handleNext = () => {
    const trimmed = draft.trim();
    if (trimmed) {
      setUsername(trimmed.slice(0, 20));
    }
    router.push('/onboarding/sign-in-prompt');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.body}>
          <Animated.View entering={FadeInDown.springify()}>
            <Text style={styles.step}>Step 2 of 3</Text>
            <Text style={styles.title}>Pick a username</Text>
            <Text style={styles.subtitle}>
              Just for you — it shows up on your profile.
            </Text>

            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Yourname"
              placeholderTextColor={Colors.textMuted}
              maxLength={20}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              style={styles.input}
            />
            <Text style={styles.hint}>
              {draft.length}/20 — leave blank to keep "{DEFAULT_USERNAME}"
            </Text>
          </Animated.View>
        </View>

        <View style={styles.footer}>
          <Button label="Continue →" onPress={handleNext} size="lg" />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  body: { flex: 1, padding: Spacing.lg, paddingTop: Spacing.xl },
  step: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  title: {
    fontSize: FontSize.xxxl,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_900Black',
    letterSpacing: -0.5,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    marginBottom: Spacing.lg,
  },
  input: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: 16,
    paddingHorizontal: 16,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
    fontSize: FontSize.xl,
  },
  hint: {
    marginTop: 6,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontFamily: 'Inter_400Regular',
  },
  footer: { padding: Spacing.lg, paddingBottom: Spacing.xl },
});
```

- [ ] **Step 2: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/onboarding/username.tsx
git commit -m "Add onboarding username screen"
```

---

### Task 10: Onboarding — sign-in prompt screen

**Files:**
- Create: `app/onboarding/sign-in-prompt.tsx`

- [ ] **Step 1: Create the screen**

Create `app/onboarding/sign-in-prompt.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/Button';
import { Colors, Gradients, Spacing, FontSize, Radius } from '@/constants/theme';
import { useSettingsStore } from '@/store/useSettingsStore';

export default function SignInPromptScreen() {
  const setOnboarded = useSettingsStore((s) => s.setOnboarded);

  const finish = (next: 'sign-in' | 'home') => {
    setOnboarded(true);
    if (next === 'sign-in') {
      router.replace('/auth/sign-in');
    } else {
      router.replace('/(tabs)/');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.body}>
        <Animated.View entering={FadeInDown.springify()}>
          <Text style={styles.step}>Step 3 of 3</Text>
          <Text style={styles.title}>Sync across devices?</Text>
          <Text style={styles.subtitle}>
            Optional. Sign in to keep your XP, streak, and level safe on every device.
          </Text>

          <LinearGradient colors={Gradients.primary} style={styles.benefitCard}>
            {[
              ['☁️', 'Your progress in the cloud'],
              ['📱', 'Pick up where you left off on any phone'],
              ['🔒', 'Email + password only — no tracking'],
            ].map(([emoji, text]) => (
              <View key={text} style={styles.benefit}>
                <Text style={styles.benefitEmoji}>{emoji}</Text>
                <Text style={styles.benefitText}>{text}</Text>
              </View>
            ))}
          </LinearGradient>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <Button label="Sign me in" onPress={() => finish('sign-in')} size="lg" />
        <TouchableOpacity onPress={() => finish('home')} style={styles.skipWrap}>
          <Text style={styles.skipText}>Maybe later — start playing</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  body: { flex: 1, padding: Spacing.lg, paddingTop: Spacing.xl },
  step: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  title: {
    fontSize: FontSize.xxxl,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_900Black',
    letterSpacing: -0.5,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  benefitCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitEmoji: { fontSize: 22, width: 32 },
  benefitText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontFamily: 'Inter_400Regular',
  },
  footer: { padding: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.md },
  skipWrap: { alignItems: 'center', paddingVertical: 6 },
  skipText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontFamily: 'Inter_400Regular',
  },
});
```

- [ ] **Step 2: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/onboarding/sign-in-prompt.tsx
git commit -m "Add onboarding sign-in prompt screen with skip option"
```

---

### Task 11: Gate the app on `onboarded` and redirect to onboarding/welcome

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Add the redirect logic**

Open `app/_layout.tsx`. Locate the existing imports block at the top and add this import after the `useSettingsStore` import (or alongside it):

```tsx
import { router, useSegments } from 'expo-router';
```

(Both `router` and `useSegments` come from expo-router; if `Stack` is the only import currently, change `import { Stack } from 'expo-router';` to `import { Stack, router, useSegments } from 'expo-router';`.)

Inside the `RootLayout` component, after the `bootstrapAuth` selector and **before** the `ready` const, add:

```tsx
  const onboarded = useSettingsStore((s) => s.onboarded);
  const segments = useSegments();
```

Then add a new effect, after the existing `useEffect` blocks but before `if (!ready) return null;`:

```tsx
  useEffect(() => {
    if (!ready) return;
    const inOnboarding = segments[0] === 'onboarding';
    if (!onboarded && !inOnboarding) {
      router.replace('/onboarding/welcome');
    }
  }, [ready, onboarded, segments]);
```

- [ ] **Step 2: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "Redirect to onboarding/welcome on first launch when not onboarded"
```

---

### Task 12: Final verification — bundle, tests, typecheck

**Files:** none modified.

- [ ] **Step 1: Type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Run the full test suite**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npm test
```

Expected: 45 tests pass (20 trivia + 7 streak + 4 prefetch + 7 sync + 7 notification-time).

- [ ] **Step 3: Confirm bundle**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx expo export --platform android --output-dir .expo/phase5-smoke 2>&1 | tail -10
```

Expected: bundle exports without errors.

```bash
rm -rf /Users/basusingh/Desktop/Mob_App/.expo/phase5-smoke
```

- [ ] **Step 4: Confirm no direct expo-notifications imports outside lib/notifications.ts**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && grep -rn "from 'expo-notifications'" --include="*.ts" --include="*.tsx" . 2>&1 | grep -v node_modules | grep -v 'lib/notifications.ts'
```

Expected: 0 results.

- [ ] **Step 5: Final commit if any cleanup**

```bash
cd /Users/basusingh/Desktop/Mob_App && git status
```

If anything is uncommitted, commit it:

```bash
git add -A
git commit -m "Phase 5 verification cleanup"
```

If clean, skip.

---

## Self-Review Notes

- **Spec coverage:** Phase 5 scope per spec section 15 = expo-notifications daily reminder ✓ (Tasks 2, 3, 4) with skip-if-played-today via the pure helper ✓ (Task 1) and permission requested with rationale on first reminder enable ✓ (Task 4 prompts when status is `undetermined`). 3-screen onboarding ✓ (Tasks 7-10). Onboarding gate on first launch ✓ (Task 11). Spec section 11 polish: daily reminder ✓; onboarding ✓.
- **Placeholders:** none. Every step has runnable code.
- **Type consistency:** `computeNextReminder`, `NextReminderInput`, `NextReminder` defined in Task 1 and consumed in Task 2. `scheduleDailyReminder`, `cancelDailyReminder`, `getPermissionStatus`, `requestPermission` defined in Task 2, consumed in Tasks 3 and 4. `applyReminder`, `setOnboarded`, `onboarded` added to `useSettingsStore` in Task 3, consumed in Tasks 4, 10, 11. `DEFAULT_USERNAME` from Phase 1 storage used in Task 9.

---

## Plan Summary

12 tasks. After Phase 5:
- A pure, tested `computeNextReminder` decides when to fire.
- `lib/notifications.ts` wraps expo-notifications.
- Settings store schedules/cancels reminders when `dailyReminderTime` changes.
- Profile gains a "Daily reminder" entry that opens a time-picker modal with presets and a "turn off" option.
- 3-screen onboarding (welcome → username → sign-in prompt) shows on first launch.
- Root layout redirects to `/onboarding/welcome` whenever `!onboarded`.

Ready for Phase 6 (Play Store release).
