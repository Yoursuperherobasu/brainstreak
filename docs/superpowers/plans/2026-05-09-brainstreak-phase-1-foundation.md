# BrainStreak Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the BrainStreak codebase from "scaffolded with boilerplate and out-of-scope code" to a clean foundation: jest-expo testing, persisted Zustand stores, scope-trimmed schema and storage layer, and settings-aware haptics — ready for Phase 2 game-loop polish.

**Architecture:** Local-first state via Zustand `persist` middleware (AsyncStorage adapter). Two stores: `useUserStore` (profile, streak, auth state) and `useSettingsStore` (sound, haptics, reminder time). Supabase schema reduced to a single `profiles` table for v1 — `scores` and `habits` are commented out for v2 reference. Tests run on Node via `jest-expo` with `@testing-library/react-native` available for component tests in Phase 2.

**Tech Stack:** Expo SDK 54, React Native 0.81, expo-router 55, Zustand 5 with persist middleware, AsyncStorage, jest-expo, TypeScript 5.9.

---

## File Map

**Files created in this phase:**
- `constants/config.ts` — timing & feature constants
- `constants/typography.ts` — text style presets
- `lib/haptics.ts` — settings-aware haptics wrapper
- `store/useSettingsStore.ts` — sound, haptics, reminder
- `store/useUserStore.ts` — profile, streak, auth state
- `jest.config.js` — jest-expo config
- `jest.setup.ts` — AsyncStorage mock setup
- `__tests__/trivia.test.ts` — scoring/XP/level tests
- `__tests__/streak.test.ts` — streak rollover tests

**Files modified in this phase:**
- `app/(tabs)/_layout.tsx` — drop habits + leaderboard screens
- `app/_layout.tsx` — await store hydration before hiding splash
- `lib/storage.ts` — remove habit code, keep streak/profile
- `lib/supabase.ts` — drop Score and Habit types
- `supabase_setup.sql` — profiles-only with v2 sections commented
- `components/Button.tsx` — use lib/haptics.ts
- `components/StreakBadge.tsx` — minor cleanup (no haptics here, just confirm import-free)
- `package.json` — add jest-expo deps and `test` script

**Files deleted in this phase:**
- `App.tsx` — boilerplate; entry is `index.ts → expo-router/entry`
- `app/(tabs)/habits.tsx` — out of v1 scope
- `app/(tabs)/leaderboard.tsx` — out of v1 scope
- `test/logic.test.js` — superseded by jest tests in `__tests__/`

---

### Task 1: Install jest-expo and configure

**Files:**
- Modify: `package.json`
- Create: `jest.config.js`
- Create: `jest.setup.ts`

- [ ] **Step 1: Install jest-expo and matchers**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npm install --save-dev jest-expo jest @types/jest @testing-library/react-native @testing-library/jest-native
```

Expected: dependencies install. May see peer warnings — acceptable.

- [ ] **Step 2: Add `test` script and jest config block to package.json**

Edit `package.json`. Modify the `scripts` block to add `test` and `test:watch`:

```json
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "test": "jest",
    "test:watch": "jest --watch"
  },
```

- [ ] **Step 3: Create jest.config.js**

Create `jest.config.js`:

```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEach: ['<rootDir>/jest.setup.ts'],
  setupFiles: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/.expo/', '/test/logic.test.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg))',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
```

- [ ] **Step 4: Create jest.setup.ts with AsyncStorage mock**

Create `jest.setup.ts`:

```ts
import '@testing-library/jest-native/extend-expect';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
}));
```

- [ ] **Step 5: Verify jest is wired up by running the test command (no tests yet)**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npm test -- --passWithNoTests
```

Expected: `No tests found, exiting with code 0` (or similar) — the harness runs.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json jest.config.js jest.setup.ts
git commit -m "Add jest-expo testing infrastructure with AsyncStorage and haptics mocks"
```

---

### Task 2: Write jest tests for lib/trivia.ts scoring math

**Files:**
- Create: `__tests__/trivia.test.ts`

- [ ] **Step 1: Write the failing test file**

Create `__tests__/trivia.test.ts`:

```ts
import {
  calculatePoints,
  calculateXP,
  getLevelFromXP,
  getXPForNextLevel,
} from '@/lib/trivia';

describe('calculatePoints', () => {
  test('wrong answer returns 0', () => {
    expect(calculatePoints(false, 'easy', 5)).toBe(0);
    expect(calculatePoints(false, 'hard', 0)).toBe(0);
  });

  test('easy + instant answer = base 100 + max bonus 50 = 150', () => {
    expect(calculatePoints(true, 'easy', 0)).toBe(150);
  });

  test('easy + no time left = base only (100)', () => {
    expect(calculatePoints(true, 'easy', 15)).toBe(100);
  });

  test('medium + instant = 150 + 75 = 225', () => {
    expect(calculatePoints(true, 'medium', 0)).toBe(225);
  });

  test('hard + instant = 250 + 125 = 375', () => {
    expect(calculatePoints(true, 'hard', 0)).toBe(375);
  });

  test('half-time bonus is between base and max', () => {
    const half = calculatePoints(true, 'easy', 7, 15);
    expect(half).toBeGreaterThan(100);
    expect(half).toBeLessThan(150);
  });

  test('unknown difficulty falls back to medium base (150)', () => {
    expect(calculatePoints(true, 'impossible' as any, 15)).toBe(150);
  });

  test('overshoot timeTaken (>limit) does not produce negative bonus', () => {
    expect(calculatePoints(true, 'easy', 30, 15)).toBe(100);
  });
});

describe('calculateXP', () => {
  test('zero score = 0 XP regardless of streak', () => {
    expect(calculateXP(0, 0)).toBe(0);
    expect(calculateXP(0, 50)).toBe(0);
  });

  test('streak 0 multiplier = 1x', () => {
    expect(calculateXP(500, 0)).toBe(50);
    expect(calculateXP(1000, 0)).toBe(100);
  });

  test('streak 5 multiplier = 1.5x', () => {
    expect(calculateXP(500, 5)).toBe(75);
  });

  test('streak 10 multiplier hits the 2x cap', () => {
    expect(calculateXP(500, 10)).toBe(100);
  });

  test('streak 20 still capped at 2x', () => {
    expect(calculateXP(500, 20)).toBe(100);
  });
});

describe('getLevelFromXP', () => {
  test('level is always at least 1', () => {
    expect(getLevelFromXP(0)).toBe(1);
    expect(getLevelFromXP(-100)).toBe(1);
  });

  test('XP 50 hits level 2', () => {
    expect(getLevelFromXP(50)).toBe(2);
  });

  test('XP 200 hits level 3', () => {
    expect(getLevelFromXP(200)).toBe(3);
  });

  test('XP 800 hits level 5', () => {
    expect(getLevelFromXP(800)).toBe(5);
  });
});

describe('getXPForNextLevel', () => {
  test('level 1 → 50 XP', () => {
    expect(getXPForNextLevel(1)).toBe(50);
  });

  test('level 2 → 200 XP', () => {
    expect(getXPForNextLevel(2)).toBe(200);
  });

  test('level 3 → 450 XP', () => {
    expect(getXPForNextLevel(3)).toBe(450);
  });
});
```

- [ ] **Step 2: Run the tests**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npm test -- __tests__/trivia.test.ts
```

Expected: tests pass. The functions in `lib/trivia.ts` already exist with the correct math (verified during planning).

If `getLevelFromXP(-100)` fails because `Math.sqrt` of a negative is NaN, fix `lib/trivia.ts`:

Change from:
```ts
export function getLevelFromXP(xp: number): number {
  return Math.floor(Math.sqrt(xp / 50)) + 1;
}
```

To:
```ts
export function getLevelFromXP(xp: number): number {
  if (xp <= 0) return 1;
  return Math.floor(Math.sqrt(xp / 50)) + 1;
}
```

- [ ] **Step 3: Commit**

```bash
git add __tests__/trivia.test.ts lib/trivia.ts
git commit -m "Add jest tests for scoring, XP, and level math"
```

---

### Task 3: Delete App.tsx boilerplate

**Files:**
- Delete: `App.tsx`

- [ ] **Step 1: Verify index.ts is the real entry**

Run:
```bash
cat /Users/basusingh/Desktop/Mob_App/index.ts
```

Expected:
```
import 'expo-router/entry';
```

(Confirms `App.tsx` is unused.)

- [ ] **Step 2: Delete the file**

Run:
```bash
rm /Users/basusingh/Desktop/Mob_App/App.tsx
```

- [ ] **Step 3: Verify the app still type-checks**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors. (If errors mention App.tsx, something in the project still imports it — search and remove the import.)

- [ ] **Step 4: Commit**

```bash
git add -u App.tsx
git commit -m "Remove unused App.tsx boilerplate (entry is index.ts via expo-router)"
```

---

### Task 4: Drop Habits and Leaderboard tabs

**Files:**
- Delete: `app/(tabs)/habits.tsx`
- Delete: `app/(tabs)/leaderboard.tsx`
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Delete the two tab screens**

Run:
```bash
rm /Users/basusingh/Desktop/Mob_App/app/\(tabs\)/habits.tsx /Users/basusingh/Desktop/Mob_App/app/\(tabs\)/leaderboard.tsx
```

- [ ] **Step 2: Update tabs layout to drop the deleted screens**

Replace the entire contents of `app/(tabs)/_layout.tsx` with:

```tsx
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius } from '@/constants/theme';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={[styles.tab, focused && styles.tabActive]}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.tabLabel, { color: focused ? Colors.primaryLight : Colors.textMuted }]}>
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="play"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🎮" label="Play" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: 72,
    paddingBottom: 8,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    gap: 2,
  },
  tabActive: {
    backgroundColor: `${Colors.primary}20`,
  },
  emoji: {
    fontSize: 22,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});
```

- [ ] **Step 3: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors. (Note: `index.tsx`, `play.tsx`, `profile.tsx` already exist as placeholder screens — they stay.)

- [ ] **Step 4: Commit**

```bash
git add -A app/\(tabs\)/
git commit -m "Drop Habits and Leaderboard tabs (out of v1 scope)"
```

---

### Task 5: Strip habit code from lib/storage.ts

**Files:**
- Modify: `lib/storage.ts`

- [ ] **Step 1: Replace lib/storage.ts with the trimmed version**

Replace the entire contents of `lib/storage.ts` with:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Storage Keys ────────────────────────────────────────────────────────────
export const StorageKeys = {
  STREAK: '@brainstreak/streak',
  PROFILE: '@brainstreak/profile',
  SETTINGS: '@brainstreak/settings',
  RECENT_GAMES: '@brainstreak/recent_games',
  ONBOARDED: '@brainstreak/onboarded',
} as const;

// ─── Streak Logic ────────────────────────────────────────────────────────────

export interface StreakData {
  current: number;
  longest: number;
  lastPlayDate: string | null; // ISO date YYYY-MM-DD in device local timezone
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export async function getStreakData(): Promise<StreakData> {
  try {
    const raw = await AsyncStorage.getItem(StorageKeys.STREAK);
    if (!raw) return { current: 0, longest: 0, lastPlayDate: null };
    return JSON.parse(raw) as StreakData;
  } catch {
    return { current: 0, longest: 0, lastPlayDate: null };
  }
}

export function computeStreakAfterGame(prev: StreakData, today: string, yesterday: string): StreakData {
  let newCurrent = prev.current;
  if (prev.lastPlayDate === today) {
    // already played today
  } else if (prev.lastPlayDate === yesterday) {
    newCurrent += 1;
  } else {
    newCurrent = 1;
  }
  return {
    current: newCurrent,
    longest: Math.max(newCurrent, prev.longest),
    lastPlayDate: today,
  };
}

export async function updateStreakAfterGame(): Promise<StreakData> {
  const prev = await getStreakData();
  const updated = computeStreakAfterGame(prev, todayISO(), yesterdayISO());
  await AsyncStorage.setItem(StorageKeys.STREAK, JSON.stringify(updated));
  return updated;
}

export async function isStreakBroken(): Promise<boolean> {
  const streak = await getStreakData();
  if (!streak.lastPlayDate) return false;
  return streak.lastPlayDate !== todayISO() && streak.lastPlayDate !== yesterdayISO();
}

export async function hasPlayedToday(): Promise<boolean> {
  const streak = await getStreakData();
  return streak.lastPlayDate === todayISO();
}

// ─── Local Profile ───────────────────────────────────────────────────────────

export interface LocalProfile {
  username: string;
  totalXP: number;
  level: number;
  gamesPlayed: number;
}

export const DEFAULT_USERNAME = 'BrainPlayer';

export async function getLocalProfile(): Promise<LocalProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(StorageKeys.PROFILE);
    if (!raw) return null;
    return JSON.parse(raw) as LocalProfile;
  } catch {
    return null;
  }
}

export async function saveLocalProfile(profile: LocalProfile): Promise<void> {
  await AsyncStorage.setItem(StorageKeys.PROFILE, JSON.stringify(profile));
}

export async function updateXP(xpToAdd: number): Promise<LocalProfile> {
  const profile = (await getLocalProfile()) ?? {
    username: DEFAULT_USERNAME,
    totalXP: 0,
    level: 1,
    gamesPlayed: 0,
  };
  const newXP = profile.totalXP + xpToAdd;
  const newLevel = newXP <= 0 ? 1 : Math.floor(Math.sqrt(newXP / 50)) + 1;
  const updated: LocalProfile = {
    ...profile,
    totalXP: newXP,
    level: newLevel,
    gamesPlayed: profile.gamesPlayed + 1,
  };
  await saveLocalProfile(updated);
  return updated;
}
```

- [ ] **Step 2: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: errors will appear in any file that imported `LocalHabit`, `getHabits`, `addHabit`, `completeHabit`, or `deleteHabit`. Search and confirm none import them after the deletions in Task 4:

```bash
cd /Users/basusingh/Desktop/Mob_App && grep -rn "LocalHabit\|getHabits\|addHabit\|completeHabit\|deleteHabit" --include="*.ts" --include="*.tsx" .
```

Expected: 0 results. If any appear, they are stale — remove them.

- [ ] **Step 3: Commit**

```bash
git add lib/storage.ts
git commit -m "Strip habit code from storage layer (out of v1 scope)"
```

---

### Task 6: Strip Score and Habit types from lib/supabase.ts

**Files:**
- Modify: `lib/supabase.ts`

- [ ] **Step 1: Replace contents of lib/supabase.ts**

Replace the entire contents of `lib/supabase.ts` with:

```ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ─── Supabase Configuration ─────────────────────────────────────────────────
// Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env
// Get them from: https://app.supabase.com → Project Settings → API
//
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key';

const storage =
  Platform.OS === 'web'
    ? undefined
    : {
        getItem: (key: string) => AsyncStorage.getItem(key),
        setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
        removeItem: (key: string) => AsyncStorage.removeItem(key),
      };

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: storage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

export function isSupabaseConfigured(): boolean {
  return (
    !!process.env.EXPO_PUBLIC_SUPABASE_URL &&
    !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.EXPO_PUBLIC_SUPABASE_URL.includes('placeholder')
  );
}

// ─── Database Types (v1) ─────────────────────────────────────────────────────
// v1 ships only `profiles`. `scores` and `habits` are deferred to v2.

export interface Profile {
  id: string;
  username: string;
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  games_played: number;
  updated_at: string;
}
```

- [ ] **Step 2: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors. (If anything imports `Score` or `Habit` from `lib/supabase`, remove the imports.)

- [ ] **Step 3: Commit**

```bash
git add lib/supabase.ts
git commit -m "Trim supabase types to Profile only; v2 types deferred"
```

---

### Task 7: Simplify supabase_setup.sql to profiles-only

**Files:**
- Modify: `supabase_setup.sql`

- [ ] **Step 1: Replace contents of supabase_setup.sql**

Replace the entire contents of `supabase_setup.sql` with:

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- BrainStreak v1 — Supabase Setup SQL
-- Run this once in your Supabase project: Dashboard → SQL Editor → New Query
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Profiles table — one row per signed-in user
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        TEXT NOT NULL DEFAULT 'BrainPlayer',
  total_xp        INTEGER NOT NULL DEFAULT 0,
  level           INTEGER NOT NULL DEFAULT 1,
  current_streak  INTEGER NOT NULL DEFAULT 0,
  longest_streak  INTEGER NOT NULL DEFAULT 0,
  games_played    INTEGER NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Trigger to auto-create a profile row on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'BrainPlayer'));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Row Level Security — users can only see and modify their own row
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read own profile" ON public.profiles;
CREATE POLICY "Read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Insert own profile" ON public.profiles;
CREATE POLICY "Insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Update own profile" ON public.profiles;
CREATE POLICY "Update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────────────────────
-- v2 reference (DO NOT RUN until v2):
-- ─────────────────────────────────────────────────────────────────────────────
-- CREATE TABLE IF NOT EXISTS public.scores (
--   id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id           UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
--   score             INTEGER NOT NULL DEFAULT 0,
--   xp_earned         INTEGER NOT NULL DEFAULT 0,
--   category          TEXT NOT NULL DEFAULT 'Mixed',
--   questions_correct INTEGER NOT NULL DEFAULT 0,
--   questions_total   INTEGER NOT NULL DEFAULT 5,
--   created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
-- );
-- CREATE INDEX IF NOT EXISTS idx_scores_score      ON public.scores(score DESC);
-- CREATE INDEX IF NOT EXISTS idx_scores_created_at ON public.scores(created_at DESC);
-- CREATE INDEX IF NOT EXISTS idx_scores_user_id    ON public.scores(user_id);
--
-- CREATE OR REPLACE FUNCTION get_daily_leaderboard()
-- RETURNS TABLE(rank BIGINT, username TEXT, score INTEGER, category TEXT)
-- LANGUAGE SQL AS $$
--   SELECT ROW_NUMBER() OVER (ORDER BY s.score DESC) AS rank,
--          p.username, s.score, s.category
--   FROM public.scores s
--   JOIN public.profiles p ON p.id = s.user_id
--   WHERE s.created_at >= CURRENT_DATE
--   ORDER BY s.score DESC
--   LIMIT 20;
-- $$;
```

- [ ] **Step 2: Commit**

```bash
git add supabase_setup.sql
git commit -m "Simplify supabase setup to profiles-only with auto-create trigger; v2 schema in comments"
```

---

### Task 8: Add constants/config.ts and constants/typography.ts

**Files:**
- Create: `constants/config.ts`
- Create: `constants/typography.ts`

- [ ] **Step 1: Create constants/config.ts**

Create `constants/config.ts`:

```ts
// BrainStreak — Feature flags and timing constants

export const Config = {
  // Game
  ROUND_TIME_SECONDS: 15,
  QUESTIONS_PER_GAME: 5,
  COUNTDOWN_SECONDS: 3,
  RESULT_PAUSE_MS: 1500,

  // Recent games stored locally
  MAX_RECENT_GAMES: 20,

  // Reminders
  DEFAULT_REMINDER_HHMM: '19:00',

  // App
  APP_VERSION: '1.0.0',
  ANDROID_PACKAGE: 'com.brainstreak.app',
} as const;
```

- [ ] **Step 2: Create constants/typography.ts**

Create `constants/typography.ts`:

```ts
import { TextStyle } from 'react-native';
import { Colors, FontSize } from './theme';

// Reusable text style presets. Component code should compose these via array spread.
export const Typography: Record<string, TextStyle> = {
  hero: {
    fontFamily: 'Outfit_900Black',
    fontSize: FontSize.hero,
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  h1: {
    fontFamily: 'Outfit_700Bold',
    fontSize: FontSize.xxxl,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: 'Outfit_700Bold',
    fontSize: FontSize.xxl,
    color: Colors.textPrimary,
  },
  h3: {
    fontFamily: 'Outfit_700Bold',
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
  },
  body: {
    fontFamily: 'Inter_400Regular',
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  bodyEmphasis: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  caption: {
    fontFamily: 'Inter_400Regular',
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  number: {
    fontFamily: 'Outfit_900Black',
    color: Colors.textPrimary,
  },
};
```

- [ ] **Step 3: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add constants/config.ts constants/typography.ts
git commit -m "Add config constants and typography presets"
```

---

### Task 9: Create lib/haptics.ts wrapper (settings-unaware first pass)

**Files:**
- Create: `lib/haptics.ts`

- [ ] **Step 1: Create lib/haptics.ts**

Create `lib/haptics.ts`. The settings check goes in here in Task 11 once `useSettingsStore` exists; for now this is a thin wrapper.

```ts
import * as Haptics from 'expo-haptics';

// Settings-aware haptics. Wired to useSettingsStore in a follow-up.
// Centralizing here means the rest of the app never imports expo-haptics directly.

let enabled = true;

export function setHapticsEnabled(value: boolean) {
  enabled = value;
}

export function isHapticsEnabled() {
  return enabled;
}

function safe(fn: () => Promise<unknown>) {
  if (!enabled) return;
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
```

- [ ] **Step 2: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add lib/haptics.ts
git commit -m "Add haptics wrapper with enable/disable gate"
```

---

### Task 10: Create store/useSettingsStore.ts

**Files:**
- Create: `store/useSettingsStore.ts`

- [ ] **Step 1: Create the settings store**

Create `store/useSettingsStore.ts`:

```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '@/constants/config';
import { StorageKeys } from '@/lib/storage';

export interface SettingsState {
  soundOn: boolean;
  hapticsOn: boolean;
  dailyReminderTime: string | null; // 'HH:MM' or null = disabled
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
```

- [ ] **Step 2: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add store/useSettingsStore.ts
git commit -m "Add useSettingsStore with AsyncStorage persistence"
```

---

### Task 11: Wire lib/haptics.ts to useSettingsStore

**Files:**
- Modify: `lib/haptics.ts`

- [ ] **Step 1: Replace lib/haptics.ts to read from settings**

Replace the entire contents of `lib/haptics.ts` with:

```ts
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
```

- [ ] **Step 2: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add lib/haptics.ts
git commit -m "Wire haptics wrapper to useSettingsStore"
```

---

### Task 12: Update Button.tsx to use lib/haptics.ts

**Files:**
- Modify: `components/Button.tsx`

- [ ] **Step 1: Replace the haptics import and call**

In `components/Button.tsx`, change line 17 from:

```ts
import * as Haptics from 'expo-haptics';
```

To:

```ts
import { haptics } from '@/lib/haptics';
```

- [ ] **Step 2: Replace the haptics call**

In `components/Button.tsx`, change the line inside `handlePress`:

```ts
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
```

To:

```ts
    haptics.light();
```

- [ ] **Step 3: Verify no other components still import expo-haptics directly**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && grep -rn "expo-haptics" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v lib/haptics.ts
```

Expected: 0 results. (If any appear in `components/` or `app/`, repeat the same swap. The session screen at `app/game/session.tsx` may still import expo-haptics — leave it for now if it does; Phase 2 fully reworks that screen.)

- [ ] **Step 4: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add components/Button.tsx
git commit -m "Route Button haptics through settings-aware wrapper"
```

---

### Task 13: Create store/useUserStore.ts

**Files:**
- Create: `store/useUserStore.ts`

- [ ] **Step 1: Create the user store**

Create `store/useUserStore.ts`:

```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  StorageKeys,
  StreakData,
  LocalProfile,
  DEFAULT_USERNAME,
} from '@/lib/storage';

export type AuthState = 'unknown' | 'anonymous' | 'authenticated';

export interface UserState {
  profile: LocalProfile;
  streak: StreakData;
  authState: AuthState;
  authedUserId: string | null;
  hydrated: boolean;

  setUsername: (username: string) => void;
  setProfile: (profile: LocalProfile) => void;
  setStreak: (streak: StreakData) => void;
  setAuthenticated: (userId: string) => void;
  setAnonymous: () => void;
  reset: () => void;
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
    (set) => ({
      profile: initialProfile,
      streak: initialStreak,
      authState: 'unknown',
      authedUserId: null,
      hydrated: false,

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
        // If a hydrated profile exists, default to anonymous when unknown.
        if (state && state.authState === 'unknown') {
          state.authState = 'anonymous';
        }
        state?._setHydrated(true);
      },
    }
  )
);
```

- [ ] **Step 2: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add store/useUserStore.ts
git commit -m "Add useUserStore for profile, streak, and auth state"
```

---

### Task 14: Wire root layout to await store hydration before hiding splash

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Replace contents of app/_layout.tsx**

Replace the entire contents of `app/_layout.tsx` with:

```tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useFonts, Outfit_400Regular, Outfit_700Bold, Outfit_900Black } from '@expo-google-fonts/outfit';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Colors } from '@/constants/theme';
import { useUserStore } from '@/store/useUserStore';
import { useSettingsStore } from '@/store/useSettingsStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_700Bold,
    Outfit_900Black,
    Inter_400Regular,
    Inter_600SemiBold,
  });

  const userHydrated = useUserStore((s) => s.hydrated);
  const settingsHydrated = useSettingsStore((s) => s.hydrated);

  const ready = fontsLoaded && userHydrated && settingsHydrated;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" backgroundColor={Colors.bg} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="game/session"
          options={{
            animation: 'slide_from_bottom',
            presentation: 'fullScreenModal',
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
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
git add app/_layout.tsx
git commit -m "Hold splash until fonts and persisted stores hydrate"
```

---

### Task 15: Add jest tests for streak rollover logic

**Files:**
- Create: `__tests__/streak.test.ts`

- [ ] **Step 1: Write the test file**

Create `__tests__/streak.test.ts`:

```ts
import { computeStreakAfterGame, StreakData } from '@/lib/storage';

const TODAY = '2026-05-09';
const YESTERDAY = '2026-05-08';
const TWO_DAYS_AGO = '2026-05-07';

describe('computeStreakAfterGame', () => {
  test('first play ever → streak = 1, longest = 1', () => {
    const prev: StreakData = { current: 0, longest: 0, lastPlayDate: null };
    const next = computeStreakAfterGame(prev, TODAY, YESTERDAY);
    expect(next.current).toBe(1);
    expect(next.longest).toBe(1);
    expect(next.lastPlayDate).toBe(TODAY);
  });

  test('consecutive day → streak increments', () => {
    const prev: StreakData = { current: 1, longest: 1, lastPlayDate: YESTERDAY };
    const next = computeStreakAfterGame(prev, TODAY, YESTERDAY);
    expect(next.current).toBe(2);
    expect(next.longest).toBe(2);
  });

  test('same-day re-play → no change to current streak', () => {
    const prev: StreakData = { current: 5, longest: 5, lastPlayDate: TODAY };
    const next = computeStreakAfterGame(prev, TODAY, YESTERDAY);
    expect(next.current).toBe(5);
    expect(next.longest).toBe(5);
  });

  test('gap of 2+ days → streak resets to 1', () => {
    const prev: StreakData = { current: 10, longest: 10, lastPlayDate: TWO_DAYS_AGO };
    const next = computeStreakAfterGame(prev, TODAY, YESTERDAY);
    expect(next.current).toBe(1);
    expect(next.longest).toBe(10);
  });

  test('historical longest is preserved through resets', () => {
    const prev: StreakData = { current: 3, longest: 30, lastPlayDate: '2026-04-01' };
    const next = computeStreakAfterGame(prev, TODAY, YESTERDAY);
    expect(next.current).toBe(1);
    expect(next.longest).toBe(30);
  });

  test('new streak surpasses old longest → longest updates', () => {
    const prev: StreakData = { current: 9, longest: 9, lastPlayDate: YESTERDAY };
    const next = computeStreakAfterGame(prev, TODAY, YESTERDAY);
    expect(next.current).toBe(10);
    expect(next.longest).toBe(10);
  });

  test('lastPlayDate always set to today', () => {
    const prev: StreakData = { current: 0, longest: 0, lastPlayDate: null };
    const next = computeStreakAfterGame(prev, TODAY, YESTERDAY);
    expect(next.lastPlayDate).toBe(TODAY);
  });
});
```

- [ ] **Step 2: Run the tests**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npm test -- __tests__/streak.test.ts
```

Expected: all 7 tests pass.

- [ ] **Step 3: Commit**

```bash
git add __tests__/streak.test.ts
git commit -m "Add streak rollover unit tests"
```

---

### Task 16: Remove the old test/logic.test.js script (superseded)

**Files:**
- Delete: `test/logic.test.js`

- [ ] **Step 1: Confirm no references to it**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && grep -rn "test/logic.test" . --include="*.json" --include="*.ts" --include="*.tsx" --include="*.js" | grep -v node_modules | grep -v jest.config.js
```

Expected: 0 results outside node_modules and jest.config.js.

- [ ] **Step 2: Delete the file and the now-empty directory**

Run:
```bash
rm /Users/basusingh/Desktop/Mob_App/test/logic.test.js && rmdir /Users/basusingh/Desktop/Mob_App/test
```

- [ ] **Step 3: Remove the testPathIgnorePatterns entry referring to it**

Edit `jest.config.js`. Change:

```js
  testPathIgnorePatterns: ['/node_modules/', '/.expo/', '/test/logic.test.js'],
```

To:

```js
  testPathIgnorePatterns: ['/node_modules/', '/.expo/'],
```

- [ ] **Step 4: Verify the test suite still passes**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npm test
```

Expected: all tests in `__tests__/` pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Remove legacy node-runner test/logic.test.js (superseded by jest)"
```

---

### Task 17: Final verification

**Files:** none modified.

- [ ] **Step 1: Type-check the whole project**

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

Expected: all tests pass. Snapshot of suites:
- `__tests__/trivia.test.ts` — scoring/XP/level
- `__tests__/streak.test.ts` — streak rollover

- [ ] **Step 3: Confirm Expo bundles**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && timeout 30 npx expo export --platform android --output-dir .expo/phase1-smoke 2>&1 | tail -30
```

Expected: build completes (or runs the full 30s without bundle errors). Any errors must be fixed before declaring Phase 1 done.

Clean up the smoke export directory:
```bash
rm -rf /Users/basusingh/Desktop/Mob_App/.expo/phase1-smoke
```

- [ ] **Step 4: Confirm no residual habit/leaderboard references**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && grep -rn "habits\|leaderboard\|LocalHabit\|getHabits" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v docs/superpowers
```

Expected: 0 results in source code. Spec/plan files in `docs/superpowers/` are filtered out and may legitimately mention these terms.

- [ ] **Step 5: Final commit (if any cleanup needed)**

If verification surfaced fixes, commit them:

```bash
git add -A
git commit -m "Phase 1 verification cleanup"
```

If no cleanup needed, skip this step.

---

## Self-Review Notes

- **Spec coverage:** Phase 1 scope per spec section 15 = strip App.tsx ✓ (Task 3), refine root layout ✓ (Task 14), add useUserStore + useSettingsStore ✓ (Tasks 10, 13), finalize theme/typography ✓ (Task 8), add jest-expo ✓ (Task 1). Phase 1 also covers spec section 6 file deletions (App.tsx, habits.tsx, leaderboard.tsx) and the `scores`-table simplification per spec section 7. Component refinement of Button uses haptics wrapper (Task 12); StreakBadge does not use haptics directly (verified during planning) so no changes needed for that component in Phase 1. Card and Timer also do not use haptics directly. QuestionCard / AnswerButton / TimerRing / XPBar are deferred to Phase 2 per the spec.
- **Placeholders:** none. Every task has concrete code or commands.
- **Type consistency:** `StorageKeys` is defined in `lib/storage.ts` (Task 5) and consumed in `useSettingsStore` and `useUserStore` (Tasks 10, 13). `LocalProfile` and `StreakData` exported from `lib/storage.ts` (Task 5) and consumed in `useUserStore` (Task 13). `computeStreakAfterGame` (Task 5) is consumed in tests (Task 15). `haptics` export shape (Task 9) is the same after Task 11 rewrite.

---

## Plan Summary

17 tasks. Each produces one focused commit. Ordering keeps the project type-clean at every step:

1. Add jest-expo infra
2. Trivia tests (proves jest works against existing math)
3. Delete App.tsx
4. Drop habits + leaderboard tabs
5. Strip habit code from storage
6. Strip Score/Habit types from supabase
7. Simplify SQL setup
8. Add config + typography constants
9. Add haptics wrapper (settings-unaware)
10. Add useSettingsStore
11. Wire haptics to settings store
12. Switch Button to haptics wrapper
13. Add useUserStore
14. Wait for store hydration in root layout
15. Streak unit tests
16. Remove legacy node test runner
17. Final verification (tsc + jest + expo export)

After Phase 1, the project has: clean entry, 3 tabs, jest test suite, two persisted Zustand stores, settings-aware haptics, profiles-only Supabase schema. Ready for Phase 2 (game-loop polish).
