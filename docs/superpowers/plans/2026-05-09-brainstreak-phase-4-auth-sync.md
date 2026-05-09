# BrainStreak Phase 4 — Auth + Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the sign-in stub with a real Supabase email/password flow. After sign-in, sync the local `profile` to a `profiles` row using a `max(local, cloud)` merge rule on numeric fields. Add an OfflineBanner that surfaces network-loss when signed in.

**Architecture:** A thin `lib/auth.ts` wraps Supabase auth methods so screens never import `@supabase/supabase-js` directly. A pure `lib/sync.ts` defines the merge function and the orchestration helpers `pullAndMerge` and `pushProfile`. The user store gains `bootstrapAuth` to check the session on app start. Sign-in screen at `app/auth/sign-in.tsx` is a single screen with mode toggle. The `tabs/_layout.tsx` mounts a `<OfflineBanner />` above the tab bar that listens to NetInfo and only renders when signed in and offline.

**Tech Stack:** Expo SDK 54, @supabase/supabase-js (already installed), @react-native-community/netinfo (new), Zustand persist, Jest 29.

---

## File Map

**Files created in this phase:**
- `lib/auth.ts` — sign-up / sign-in / sign-out / password reset / get-session wrappers
- `lib/sync.ts` — merge rules + pull/push profile orchestration
- `lib/network.ts` — thin wrapper around NetInfo
- `components/OfflineBanner.tsx` — top banner shown when signed in but offline
- `__tests__/sync.test.ts` — merge function tests
- `docs/SUPABASE_SETUP.md` — step-by-step user instructions

**Files modified in this phase:**
- `app/auth/sign-in.tsx` — full email/password flow replacing the stub
- `store/useUserStore.ts` — add `bootstrapAuth()` and tie sign-in to sync
- `store/useGameStore.ts` — call `pushProfile()` after a successful game when authed
- `app/_layout.tsx` — call `useUserStore.getState().bootstrapAuth()` on mount
- `app/(tabs)/_layout.tsx` — render OfflineBanner above tab bar
- `app/(tabs)/profile.tsx` — surface `Sign out` for authed users
- `package.json` — add `@react-native-community/netinfo`

**Files deleted in this phase:** none.

---

### Task 1: User sets up the Supabase project

**Files:**
- Create: `docs/SUPABASE_SETUP.md`

This task can't be executed by the agent alone — it requires the human partner to create a Supabase project and paste credentials into `.env`. The agent writes step-by-step instructions and waits for confirmation.

- [ ] **Step 1: Write the setup guide**

Create `docs/SUPABASE_SETUP.md`:

```markdown
# Supabase Setup — BrainStreak v1

Five steps. ~10 minutes. Free tier is plenty.

## 1. Create the project

1. Go to https://app.supabase.com and sign in (GitHub login is fastest).
2. Click **New project**. Name it `brainstreak`. Pick the region closest to you.
3. Generate a strong database password and save it in your password manager.
4. Wait ~60s for the project to provision.

## 2. Run the SQL setup

1. In the project sidebar, open **SQL Editor → New query**.
2. Open `supabase_setup.sql` from this repo.
3. Paste its contents into the SQL editor. Click **Run**.
4. You should see `Success. No rows returned`. Verify the `profiles` table now exists under **Table Editor**.

## 3. Get your API credentials

1. In the sidebar, open **Project Settings → API**.
2. Copy the **Project URL** (looks like `https://abcdef.supabase.co`).
3. Copy the **anon public** key (the long JWT under "Project API keys").

## 4. Paste into .env

In the repo root, create a file named `.env` (it's gitignored — never commit it):

\`\`\`
EXPO_PUBLIC_SUPABASE_URL=https://abcdef.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
\`\`\`

If `.env` already exists, replace the placeholder values. Restart any running `expo start` after editing.

## 5. Configure auth email templates (optional but recommended)

1. In the sidebar, open **Authentication → Email Templates**.
2. Edit the **Confirm signup** template — set the redirect URL to `brainstreak://auth/confirmed` so the deep link reopens the app after the user clicks the email.
3. Edit the **Reset password** template — set the redirect to `brainstreak://auth/reset`.

## 6. Verify

After the agent finishes Phase 4, run the app and:

1. Open Profile → Sign in.
2. Tap **Sign up** mode. Enter a test email and password (8+ chars).
3. You should see "Check your email to confirm." Open the email, click the link.
4. Return to the app — the Profile should now show "Sync: On".

## Cost

Free tier covers up to 50,000 monthly active users and 500 MB of database. BrainStreak's per-user write volume is tiny (one row per user, a few columns).
```

- [ ] **Step 2: Tell the user to run the setup**

Print to the user (or pause execution if running interactively):

> "Phase 4 needs Supabase credentials before we can wire auth. Please follow `docs/SUPABASE_SETUP.md` (Steps 1–4 minimum) and paste your URL + anon key into `.env`. Reply 'done' when ready, or 'skip' to ship without auth — the rest of Phase 4 can land regardless; sign-in just won't work without credentials."

If running non-interactively, proceed regardless. The downstream code already gracefully no-ops when the placeholder URL is in use (see `isSupabaseConfigured` in `lib/supabase.ts`).

- [ ] **Step 3: Commit**

```bash
git add docs/SUPABASE_SETUP.md
git commit -m "Document Supabase project setup for v1"
```

---

### Task 2: Install @react-native-community/netinfo

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npm install --legacy-peer-deps @react-native-community/netinfo
```

Expected: package added under dependencies.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "Add @react-native-community/netinfo for OfflineBanner"
```

---

### Task 3: Add lib/network.ts

**Files:**
- Create: `lib/network.ts`

A thin wrapper so screens depend on a single internal API.

- [ ] **Step 1: Create lib/network.ts**

Create `lib/network.ts`:

```ts
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export type NetworkStatus = 'online' | 'offline' | 'unknown';

export function statusOf(state: NetInfoState | null): NetworkStatus {
  if (!state) return 'unknown';
  if (state.isConnected === false) return 'offline';
  if (state.isInternetReachable === false) return 'offline';
  return 'online';
}

export function subscribe(listener: (status: NetworkStatus) => void): () => void {
  return NetInfo.addEventListener((state) => {
    listener(statusOf(state));
  });
}

export async function fetchOnce(): Promise<NetworkStatus> {
  const state = await NetInfo.fetch();
  return statusOf(state);
}
```

- [ ] **Step 2: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add lib/network.ts
git commit -m "Add lib/network.ts wrapper around NetInfo"
```

---

### Task 4: Add lib/auth.ts wrapper

**Files:**
- Create: `lib/auth.ts`

- [ ] **Step 1: Create lib/auth.ts**

Create `lib/auth.ts`:

```ts
import { supabase } from '@/lib/supabase';

export interface AuthResult<T = void> {
  ok: boolean;
  data?: T;
  error?: string;
}

function asMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string') {
    return (err as any).message;
  }
  return 'Something went wrong.';
}

export async function signUpWithEmail(email: string, password: string, username?: string): Promise<AuthResult<{ userId: string | null; needsConfirmation: boolean }>> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: username ? { username } : undefined,
      },
    });
    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      data: {
        userId: data.user?.id ?? null,
        needsConfirmation: !data.session,
      },
    };
  } catch (e) {
    return { ok: false, error: asMessage(e) };
  }
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult<{ userId: string }>> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    if (!data.user) return { ok: false, error: 'Sign-in returned no user.' };
    return { ok: true, data: { userId: data.user.id } };
  } catch (e) {
    return { ok: false, error: asMessage(e) };
  }
}

export async function signOut(): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: asMessage(e) };
  }
}

export async function sendPasswordReset(email: string): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: asMessage(e) };
  }
}

export async function getCurrentSession(): Promise<{ userId: string | null }> {
  try {
    const { data } = await supabase.auth.getSession();
    return { userId: data.session?.user?.id ?? null };
  } catch {
    return { userId: null };
  }
}
```

- [ ] **Step 2: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add lib/auth.ts
git commit -m "Add lib/auth.ts — email/password auth wrappers around Supabase"
```

---

### Task 5: Add lib/sync.ts with merge logic and tests

**Files:**
- Create: `lib/sync.ts`
- Create: `__tests__/sync.test.ts`

- [ ] **Step 1: Create lib/sync.ts**

Create `lib/sync.ts`:

```ts
import { supabase } from '@/lib/supabase';
import { LocalProfile, StreakData, DEFAULT_USERNAME } from '@/lib/storage';

export interface CloudProfile {
  id: string;
  username: string;
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  games_played: number;
  updated_at: string;
}

export interface MergedProfile {
  profile: LocalProfile;
  streak: StreakData;
}

export interface MergeInput {
  local: LocalProfile;
  localStreak: StreakData;
  cloud: CloudProfile | null;
}

// Pure merge function. Numeric fields take max(local, cloud).
// Username: cloud wins unless local has been customized away from the default.
// streak.lastPlayDate: keep the more recent ISO date string.
export function mergeProfiles(input: MergeInput): MergedProfile {
  const { local, localStreak, cloud } = input;

  if (!cloud) {
    return { profile: local, streak: localStreak };
  }

  const totalXP = Math.max(local.totalXP, cloud.total_xp);
  const level = Math.max(local.level, cloud.level);
  const gamesPlayed = Math.max(local.gamesPlayed, cloud.games_played);
  const currentStreak = Math.max(localStreak.current, cloud.current_streak);
  const longestStreak = Math.max(localStreak.longest, cloud.longest_streak);

  const localCustomized = local.username !== DEFAULT_USERNAME;
  const username = localCustomized ? local.username : cloud.username;

  return {
    profile: {
      username,
      totalXP,
      level,
      gamesPlayed,
    },
    streak: {
      current: currentStreak,
      longest: longestStreak,
      lastPlayDate: localStreak.lastPlayDate, // local is the source of truth for "today played"
    },
  };
}

// Pull the user's profile row, merge with local, return merged.
export async function pullAndMerge(
  userId: string,
  local: LocalProfile,
  localStreak: StreakData
): Promise<MergedProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.warn('[sync] pull failed:', error.message);
    return { profile: local, streak: localStreak };
  }

  return mergeProfiles({ local, localStreak, cloud: (data ?? null) as CloudProfile | null });
}

// Push the merged values up. Upsert because a fresh sign-up may not yet have
// the auto-created row visible due to replication latency, even though the
// trigger creates it.
export async function pushProfile(
  userId: string,
  profile: LocalProfile,
  streak: StreakData
): Promise<{ ok: boolean; error?: string }> {
  const row = {
    id: userId,
    username: profile.username,
    total_xp: profile.totalXP,
    level: profile.level,
    games_played: profile.gamesPlayed,
    current_streak: streak.current,
    longest_streak: streak.longest,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('profiles').upsert(row, { onConflict: 'id' });
  if (error) {
    console.warn('[sync] push failed:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
```

- [ ] **Step 2: Create __tests__/sync.test.ts**

Create `__tests__/sync.test.ts`:

```ts
import { mergeProfiles, CloudProfile } from '@/lib/sync';
import { LocalProfile, StreakData, DEFAULT_USERNAME } from '@/lib/storage';

const baseLocal: LocalProfile = {
  username: DEFAULT_USERNAME,
  totalXP: 100,
  level: 2,
  gamesPlayed: 3,
};

const baseStreak: StreakData = { current: 2, longest: 5, lastPlayDate: '2026-05-09' };

const baseCloud: CloudProfile = {
  id: 'u1',
  username: 'CloudUser',
  total_xp: 50,
  level: 1,
  current_streak: 1,
  longest_streak: 3,
  games_played: 2,
  updated_at: '2026-05-08T12:00:00Z',
};

describe('mergeProfiles', () => {
  test('no cloud row → returns local unchanged', () => {
    const result = mergeProfiles({ local: baseLocal, localStreak: baseStreak, cloud: null });
    expect(result.profile).toEqual(baseLocal);
    expect(result.streak).toEqual(baseStreak);
  });

  test('numeric fields take the max across local and cloud', () => {
    const cloud: CloudProfile = { ...baseCloud, total_xp: 200, level: 4, games_played: 10, current_streak: 8, longest_streak: 8 };
    const result = mergeProfiles({ local: baseLocal, localStreak: baseStreak, cloud });
    expect(result.profile.totalXP).toBe(200);
    expect(result.profile.level).toBe(4);
    expect(result.profile.gamesPlayed).toBe(10);
    expect(result.streak.current).toBe(8);
    expect(result.streak.longest).toBe(8);
  });

  test('local wins on numerics when local is greater', () => {
    const cloud: CloudProfile = { ...baseCloud, total_xp: 0, level: 0, games_played: 0, current_streak: 0, longest_streak: 0 };
    const result = mergeProfiles({ local: baseLocal, localStreak: baseStreak, cloud });
    expect(result.profile.totalXP).toBe(100);
    expect(result.profile.level).toBe(2);
    expect(result.streak.current).toBe(2);
    expect(result.streak.longest).toBe(5);
  });

  test('cloud username wins when local username is the default', () => {
    const result = mergeProfiles({ local: baseLocal, localStreak: baseStreak, cloud: baseCloud });
    expect(result.profile.username).toBe('CloudUser');
  });

  test('local username wins when it has been customized', () => {
    const local = { ...baseLocal, username: 'CustomName' };
    const result = mergeProfiles({ local, localStreak: baseStreak, cloud: baseCloud });
    expect(result.profile.username).toBe('CustomName');
  });

  test('lastPlayDate is taken from local (source of truth for today-played)', () => {
    const result = mergeProfiles({ local: baseLocal, localStreak: baseStreak, cloud: baseCloud });
    expect(result.streak.lastPlayDate).toBe('2026-05-09');
  });

  test('null lastPlayDate from local persists when cloud has data', () => {
    const localStreak: StreakData = { current: 0, longest: 0, lastPlayDate: null };
    const result = mergeProfiles({ local: baseLocal, localStreak, cloud: baseCloud });
    expect(result.streak.lastPlayDate).toBe(null);
  });
});
```

- [ ] **Step 3: Run tests**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npm test -- __tests__/sync.test.ts
```

Expected: 7 tests pass.

- [ ] **Step 4: Commit**

```bash
git add lib/sync.ts __tests__/sync.test.ts
git commit -m "Add lib/sync.ts with mergeProfiles, pullAndMerge, pushProfile + tests"
```

---

### Task 6: Wire bootstrapAuth into useUserStore

**Files:**
- Modify: `store/useUserStore.ts`

- [ ] **Step 1: Append bootstrapAuth and signInAndSync helpers**

Replace the entire contents of `store/useUserStore.ts` with:

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
import { getCurrentSession } from '@/lib/auth';
import { pullAndMerge, pushProfile } from '@/lib/sync';

export type AuthState = 'unknown' | 'anonymous' | 'authenticated';

export interface UserState {
  profile: LocalProfile;
  streak: StreakData;
  authState: AuthState;
  authedUserId: string | null;
  hydrated: boolean;
  bootstrapped: boolean;

  setUsername: (username: string) => void;
  setProfile: (profile: LocalProfile) => void;
  setStreak: (streak: StreakData) => void;
  setAuthenticated: (userId: string) => void;
  setAnonymous: () => void;
  reset: () => void;

  bootstrapAuth: () => Promise<void>;
  signInAndSync: (userId: string) => Promise<void>;
  pushIfAuthed: () => Promise<void>;

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
    (set, get) => ({
      profile: initialProfile,
      streak: initialStreak,
      authState: 'unknown',
      authedUserId: null,
      hydrated: false,
      bootstrapped: false,

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

      bootstrapAuth: async () => {
        if (get().bootstrapped) return;
        try {
          const { userId } = await getCurrentSession();
          if (userId) {
            set({ authState: 'authenticated', authedUserId: userId });
            await get().signInAndSync(userId);
          } else if (get().authState === 'unknown') {
            set({ authState: 'anonymous' });
          }
        } finally {
          set({ bootstrapped: true });
        }
      },

      signInAndSync: async (userId) => {
        const { profile, streak } = get();
        try {
          const merged = await pullAndMerge(userId, profile, streak);
          set({
            profile: merged.profile,
            streak: merged.streak,
            authState: 'authenticated',
            authedUserId: userId,
          });
          await pushProfile(userId, merged.profile, merged.streak);
        } catch (e) {
          console.warn('[useUserStore] signInAndSync failed:', e);
        }
      },

      pushIfAuthed: async () => {
        const { authState, authedUserId, profile, streak } = get();
        if (authState !== 'authenticated' || !authedUserId) return;
        await pushProfile(authedUserId, profile, streak);
      },

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
        if (state && state.authState === 'unknown') {
          state.authState = 'anonymous';
        }
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

Expected: 0 type errors; all tests pass (38 = 31 prior + 7 sync).

- [ ] **Step 3: Commit**

```bash
git add store/useUserStore.ts
git commit -m "Wire useUserStore: bootstrapAuth, signInAndSync, pushIfAuthed"
```

---

### Task 7: Call bootstrapAuth on app start

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
  const bootstrapAuth = useUserStore((s) => s.bootstrapAuth);

  const ready = fontsLoaded && userHydrated && settingsHydrated;

  useEffect(() => {
    if (userHydrated) {
      bootstrapAuth();
    }
  }, [userHydrated]);

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
        <Stack.Screen
          name="auth/sign-in"
          options={{
            animation: 'slide_from_bottom',
            presentation: 'modal',
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
git commit -m "Call bootstrapAuth on app start to restore session and pull-merge"
```

---

### Task 8: Replace sign-in stub with real flow

**Files:**
- Modify: `app/auth/sign-in.tsx`

- [ ] **Step 1: Replace contents of app/auth/sign-in.tsx**

Replace the entire contents of `app/auth/sign-in.tsx` with:

```tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import {
  signInWithEmail,
  signUpWithEmail,
  sendPasswordReset,
} from '@/lib/auth';
import { useUserStore } from '@/store/useUserStore';
import { isSupabaseConfigured } from '@/lib/supabase';

type Mode = 'sign-in' | 'sign-up';

export default function SignInScreen() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const signInAndSync = useUserStore((s) => s.signInAndSync);
  const username = useUserStore((s) => s.profile.username);

  const handleSubmit = async () => {
    setError(null);
    setInfo(null);

    if (!isSupabaseConfigured()) {
      setError('Supabase isn’t configured yet. See docs/SUPABASE_SETUP.md.');
      return;
    }

    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'sign-in') {
        const result = await signInWithEmail(email.trim(), password);
        if (!result.ok) {
          setError(result.error ?? 'Sign-in failed.');
          return;
        }
        await signInAndSync(result.data!.userId);
        router.back();
      } else {
        const result = await signUpWithEmail(email.trim(), password, username);
        if (!result.ok) {
          setError(result.error ?? 'Sign-up failed.');
          return;
        }
        if (result.data?.needsConfirmation) {
          setInfo('Check your email to confirm your address. You can sign in once confirmed.');
        } else if (result.data?.userId) {
          await signInAndSync(result.data.userId);
          router.back();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email first, then tap Forgot password.');
      return;
    }
    setLoading(true);
    setError(null);
    setInfo(null);
    const result = await sendPasswordReset(email.trim());
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? 'Could not send reset email.');
    } else {
      setInfo('Password reset email sent. Check your inbox.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.emoji}>☁️</Text>
            <Text style={styles.title}>
              {mode === 'sign-in' ? 'Welcome back' : 'Create account'}
            </Text>
            <Text style={styles.subtitle}>
              Sync your XP, streak, and level across devices.
            </Text>
          </View>

          <View style={styles.tabs}>
            <TouchableOpacity
              onPress={() => { setMode('sign-in'); setError(null); setInfo(null); }}
              style={[styles.tab, mode === 'sign-in' && styles.tabActive]}
            >
              <Text style={[styles.tabText, mode === 'sign-in' && styles.tabTextActive]}>
                Sign in
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setMode('sign-up'); setError(null); setInfo(null); }}
              style={[styles.tab, mode === 'sign-up' && styles.tabActive]}
            >
              <Text style={[styles.tabText, mode === 'sign-up' && styles.tabTextActive]}>
                Sign up
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={styles.input}
              editable={!loading}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              style={styles.input}
              editable={!loading}
            />
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}
          {info && <Text style={styles.infoText}>{info}</Text>}

          <Button
            label={loading ? '...' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
            onPress={handleSubmit}
            loading={loading}
            size="lg"
            style={{ marginTop: Spacing.md }}
          />

          {mode === 'sign-in' && (
            <TouchableOpacity onPress={handleForgotPassword} disabled={loading} style={styles.forgotWrap}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => router.back()} style={styles.skipWrap} disabled={loading}>
            <Text style={styles.skipText}>Skip for now — keep playing on this device</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  emoji: { fontSize: 48 },
  title: {
    fontSize: FontSize.xxl,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Radius.full,
  },
  tabActive: { backgroundColor: Colors.primary },
  tabText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'Outfit_700Bold',
  },
  tabTextActive: { color: Colors.textPrimary },
  field: { marginBottom: Spacing.md, gap: 6 },
  label: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
  },
  input: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
    color: Colors.textPrimary,
    fontFamily: 'Inter_400Regular',
    fontSize: FontSize.md,
  },
  errorText: {
    color: Colors.dangerLight,
    fontSize: FontSize.sm,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 4,
  },
  infoText: {
    color: Colors.successLight,
    fontSize: FontSize.sm,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 4,
  },
  forgotWrap: { marginTop: Spacing.md, alignItems: 'center' },
  forgotText: {
    color: Colors.primaryLight,
    fontSize: FontSize.sm,
    fontFamily: 'Inter_600SemiBold',
  },
  skipWrap: { marginTop: Spacing.lg, alignItems: 'center' },
  skipText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
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
git add app/auth/sign-in.tsx
git commit -m "Replace sign-in stub with real Supabase email/password flow"
```

---

### Task 9: Add OfflineBanner component

**Files:**
- Create: `components/OfflineBanner.tsx`

- [ ] **Step 1: Create the component**

Create `components/OfflineBanner.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { Colors, Spacing, FontSize } from '@/constants/theme';
import { subscribe, fetchOnce, NetworkStatus } from '@/lib/network';
import { useUserStore } from '@/store/useUserStore';

export function OfflineBanner() {
  const authState = useUserStore((s) => s.authState);
  const [status, setStatus] = useState<NetworkStatus>('unknown');

  useEffect(() => {
    fetchOnce().then(setStatus);
    const unsub = subscribe(setStatus);
    return unsub;
  }, []);

  if (authState !== 'authenticated') return null;
  if (status !== 'offline') return null;

  return (
    <Animated.View entering={FadeInUp.duration(180)} exiting={FadeOutUp.duration(180)} style={styles.bar}>
      <Text style={styles.emoji}>📡</Text>
      <Text style={styles.text}>Offline — changes will sync when you reconnect</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    backgroundColor: Colors.bgElevated,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  emoji: { fontSize: 16 },
  text: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
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
git add components/OfflineBanner.tsx
git commit -m "Add OfflineBanner shown when signed in but offline"
```

---

### Task 10: Mount OfflineBanner above the tab bar

**Files:**
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Replace contents of app/(tabs)/_layout.tsx**

Replace the entire contents of `app/(tabs)/_layout.tsx` with:

```tsx
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius } from '@/constants/theme';
import { OfflineBanner } from '@/components/OfflineBanner';

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
    <View style={styles.root}>
      <OfflineBanner />
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
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

- [ ] **Step 2: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(tabs\)/_layout.tsx
git commit -m "Mount OfflineBanner above the tab bar"
```

---

### Task 11: Push profile to cloud after each game

**Files:**
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Update finishGame to push the merged profile**

Open `store/useGameStore.ts` and locate the `finishGame` action, currently:

```ts
  finishGame: async () => {
    const { totalScore, correctCount } = get();
    set({ phase: 'gameover' });

    try {
      const streak = await updateStreakAfterGame();
      const xp = calculateXP(totalScore, streak.current);
      await updateXP(xp);
      set({ xpEarned: xp });
    } catch (err) {
      console.warn('[GameStore] Failed to save results:', err);
    }
  },
```

Replace it with:

```ts
  finishGame: async () => {
    const { totalScore, correctCount } = get();
    set({ phase: 'gameover' });

    try {
      const streak = await updateStreakAfterGame();
      const xp = calculateXP(totalScore, streak.current);
      const updatedProfile = await updateXP(xp);
      set({ xpEarned: xp });

      // Sync useUserStore in-memory copy with what we just persisted to AsyncStorage
      const { useUserStore } = require('@/store/useUserStore');
      useUserStore.getState().setProfile(updatedProfile);
      useUserStore.getState().setStreak(streak);
      // Push to Supabase if signed in (no-op otherwise)
      await useUserStore.getState().pushIfAuthed();
    } catch (err) {
      console.warn('[GameStore] Failed to save results:', err);
    }

    // Suppress unused-var lint since correctCount is referenced for completeness
    void correctCount;
  },
```

The `require()` import is intentional: an `import` at the top would create a circular dependency between the two stores. `require` defers resolution until call time so the cycle is harmless.

- [ ] **Step 2: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add store/useGameStore.ts
git commit -m "Push profile to Supabase after each game when signed in"
```

---

### Task 12: Add Sign Out to Profile when authenticated

**Files:**
- Modify: `app/(tabs)/profile.tsx`

- [ ] **Step 1: Add sign-out handler and a SettingsRow nav for it**

Open `app/(tabs)/profile.tsx`. Find the imports block at the top and add the following after the existing import lines:

```tsx
import { signOut } from '@/lib/auth';
import { Alert } from 'react-native';
```

(If `Alert` is already imported from react-native, just add it to the existing destructure rather than re-importing.)

Inside the component, after the existing `setHapticsOn` selector lines, add:

```tsx
  const setAnonymous = useUserStore((s) => s.setAnonymous);

  const handleSignOut = () => {
    Alert.alert(
      'Sign out',
      'Your local progress stays on this device. Sign in again to resume sync.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            setAnonymous();
          },
        },
      ]
    );
  };
```

In the JSX, find the Settings section (the `<SectionHeader title="Settings" />` block followed by two `SettingsRow` toggles for sound and haptics). Add a third `SettingsRow` of kind `nav` after the haptics row, only when authenticated:

```tsx
          {authState === 'authenticated' && (
            <SettingsRow
              kind="nav"
              emoji="🚪"
              label="Sign out"
              description="Stop syncing on this device"
              onPress={handleSignOut}
            />
          )}
```

- [ ] **Step 2: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(tabs\)/profile.tsx
git commit -m "Add Sign out row to Profile when authenticated"
```

---

### Task 13: Final verification

**Files:** none modified (unless cleanup is needed).

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

Expected: 38 tests pass (20 trivia + 7 streak + 4 prefetch + 7 sync).

- [ ] **Step 3: Confirm bundle**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx expo export --platform android --output-dir .expo/phase4-smoke 2>&1 | tail -8
```

Expected: bundle exports clean.

```bash
rm -rf /Users/basusingh/Desktop/Mob_App/.expo/phase4-smoke
```

- [ ] **Step 4: Confirm no direct supabase imports outside lib/**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && grep -rn "from '@supabase/supabase-js'" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v 'lib/supabase.ts'
```

Expected: 0 results.

- [ ] **Step 5: Final commit if any cleanup**

```bash
cd /Users/basusingh/Desktop/Mob_App && git status
```

If anything is uncommitted, commit it:

```bash
git add -A
git commit -m "Phase 4 verification cleanup"
```

If clean, skip.

---

## Self-Review Notes

- **Spec coverage:** Phase 4 scope per spec section 15 = wire Supabase auth ✓ (Tasks 4, 8), implement lib/sync.ts with merge rules ✓ (Task 5), OfflineBanner ✓ (Tasks 9, 10). Spec section 8 sync rules: pull-merge-push on sign-in ✓ (Tasks 5, 6); push after every game ✓ (Task 11); never sync if anonymous ✓ (Task 6 `pushIfAuthed` early-returns). Spec section 9 auth flow: anonymous default, sign-in reachable from Profile (Phase 3 already), sign-up creates auth.users + trigger creates profiles row + app pulls/merges ✓ (Tasks 5, 6, 8); sign-out keeps local data ✓ (Task 12); password reset ✓ (Task 8). Spec section 11 polish: offline banner ✓ (Tasks 9, 10).
- **Placeholders:** none. Every step has runnable code.
- **Type consistency:** `LocalProfile`, `StreakData`, `DEFAULT_USERNAME` from `lib/storage` (Phase 1) used identically in Tasks 5, 6. `AuthResult<T>` defined in Task 4, consumed in Task 8. `CloudProfile`, `MergedProfile`, `MergeInput` defined in Task 5, consumed in Task 6 (`signInAndSync`). `bootstrapAuth`, `signInAndSync`, `pushIfAuthed` defined in Task 6, consumed in Tasks 7, 8, 11. `pullAndMerge`, `pushProfile` defined in Task 5, consumed in Task 6. `NetworkStatus`, `subscribe`, `fetchOnce` defined in Task 3, consumed in Task 9. `isSupabaseConfigured` from Phase 1's `lib/supabase.ts` used in Task 8.

---

## Plan Summary

13 tasks. After Phase 4:
- Supabase setup is documented (`docs/SUPABASE_SETUP.md`).
- `lib/auth.ts` wraps Supabase auth methods.
- `lib/sync.ts` defines a tested `mergeProfiles` plus `pullAndMerge` and `pushProfile`.
- `useUserStore.bootstrapAuth()` restores session on launch and pulls/merges.
- Sign-in screen is real: email + password, mode toggle, forgot-password, error display, skip link.
- After every game, the profile pushes to Supabase if signed in.
- OfflineBanner appears above the tabs when authenticated and offline.
- Profile gains a Sign-out action for authenticated users.

Ready for Phase 5 (Notifications + onboarding + tests).
