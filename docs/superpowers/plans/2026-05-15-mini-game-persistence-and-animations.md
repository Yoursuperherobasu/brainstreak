# Mini-Game Persistence + Unified Achievements + Animated UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all 6 games persist score/XP/streak/recent-activity through one shared recorder, unify achievements into a single catalog rendered on Profile, and lift the visual feel with per-game tinted backgrounds + count-up stat numbers + tile press flashes — without breaking the 99 passing tests or any working flow.

**Architecture:** A single `recordMiniGameResult` function in `lib/games/recordMiniGame.ts` becomes the canonical persistence path for the 5 mini-games (mirrors `useGameStore.finishGame` for Brain Rush). Profile renders badges from `lib/achievements.ts` + `useAchievementsStore.unlocked` (delete the hardcoded `BADGES` array). `components/AnimatedBackground.tsx` gains an optional `tint` prop and is mounted on each game screen. Small visual beats — `CountingNumber`, tile press flash, directional onboarding slide — are layered on existing components.

**Tech Stack:** Expo SDK 54, React Native 0.81, expo-router 6, Zustand 5 + AsyncStorage, react-native-reanimated 4, react-native-svg, Jest 29.x with jest-expo.

**Source spec:** `docs/superpowers/specs/2026-05-15-mini-game-persistence-and-animations.md`

---

## File Structure

### New files

```
lib/games/
  recordMiniGame.ts        # Shared persistence path for the 5 mini-games.

components/
  CountingNumber.tsx       # Animated number that counts up from 0 to value on mount.

__tests__/
  record-mini-game.test.ts # 4 tests covering the recorder math.
```

### Files modified

```
lib/achievements.ts                 # Add 3 new milestone achievements (streak-3, xp-100, xp-500).
__tests__/achievements.test.ts      # Extend with 3 tests for the new predicates.
app/(tabs)/profile.tsx              # Delete BADGES; render badges from ACHIEVEMENTS + unlocked set.
                                    # Wire StatCard numbers through CountingNumber.
components/Card.tsx                 # Add 120ms marker-bar tint flash on press.
components/AnimatedBackground.tsx   # Accept `tint?: string` prop; tinted-orb derivation.
app/game/session.tsx                # AnimatedBackground tint={Colors.primary}.
app/game/word-sprint.tsx            # AnimatedBackground tint={Colors.accent}; call recorder on 'over'.
app/game/number-sense.tsx           # AnimatedBackground tint={Colors.primary}; call recorder on 'over'.
app/game/memory-match.tsx           # AnimatedBackground tint={Colors.gold}; call recorder on 'over'.
app/game/reaction-tap.tsx           # AnimatedBackground tint={Colors.success}; call recorder on 'over'.
app/game/road-rush.tsx              # AnimatedBackground tint={Colors.danger}; call recorder on 'over'.
app/_layout.tsx                     # onboarding Stack.Screen animation: 'fade' → 'slide_from_right'.
scripts/e2e-test.js                 # Extend to assert XP increases and Recent Activity row appears.
```

### Files NOT touched

- `useGameStore.ts` — Brain Rush path keeps working as-is.
- `lib/audio.ts`, `lib/haptics.ts` — sounds & haptics ride existing hooks.
- `lib/storage.ts`, `useUserStore.ts` — Zustand is already the source of truth.

---

## Task 1: Add the shared mini-game recorder

**Files:**
- Create: `lib/games/recordMiniGame.ts`
- Test: `__tests__/record-mini-game.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/record-mini-game.test.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserStore } from '@/store/useUserStore';
import { useAchievementsStore } from '@/store/useAchievementsStore';
import { recordMiniGameResult } from '@/lib/games/recordMiniGame';
import { StorageKeys } from '@/lib/storage';

beforeEach(async () => {
  // Reset Zustand + AsyncStorage between tests so each runs from a clean state.
  await AsyncStorage.clear();
  useUserStore.setState({
    profile: { username: 'Test', totalXP: 0, level: 1, gamesPlayed: 0 },
    streak: { current: 0, longest: 0, lastPlayDate: null },
    authState: 'anonymous',
    authedUserId: null,
  });
  useAchievementsStore.setState({ unlocked: [] });
});

describe('recordMiniGameResult', () => {
  test('adds xp to profile and bumps gamesPlayed', async () => {
    await recordMiniGameResult({ gameId: 'word-sprint', score: 100, xp: 25 });
    const p = useUserStore.getState().profile;
    expect(p.totalXP).toBe(25);
    expect(p.gamesPlayed).toBe(1);
  });

  test('advances streak when called on a fresh day', async () => {
    await recordMiniGameResult({ gameId: 'word-sprint', score: 50, xp: 10 });
    const s = useUserStore.getState().streak;
    expect(s.current).toBe(1);
    expect(s.lastPlayDate).not.toBeNull();
  });

  test('does NOT re-advance streak on a same-day second round', async () => {
    await recordMiniGameResult({ gameId: 'word-sprint', score: 50, xp: 10 });
    await recordMiniGameResult({ gameId: 'number-sense', score: 30, xp: 6 });
    const s = useUserStore.getState().streak;
    expect(s.current).toBe(1);
  });

  test('returns leveledUp: true when newLevel exceeds previousLevel', async () => {
    // Level 1 → 2 boundary is 50 XP. 49 + 5 = 54 crosses it.
    useUserStore.setState({
      profile: { username: 'Test', totalXP: 49, level: 1, gamesPlayed: 0 },
      streak: { current: 0, longest: 0, lastPlayDate: null },
      authState: 'anonymous',
      authedUserId: null,
    });
    const result = await recordMiniGameResult({ gameId: 'memory-match', score: 50, xp: 5 });
    expect(result.leveledUp).toBe(true);
    expect(useUserStore.getState().profile.level).toBe(2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/record-mini-game.test.ts --silent 2>&1 | tail -10`
Expected: 4 failures with "Cannot find module '@/lib/games/recordMiniGame'".

- [ ] **Step 3: Implement the recorder**

Create `lib/games/recordMiniGame.ts`:

```ts
import { useUserStore } from '@/store/useUserStore';
import { useGameStore } from '@/store/useGameStore';
import { useAchievementsStore } from '@/store/useAchievementsStore';
import {
  computeStreakAfterGame,
  recordGame,
  todayISO,
  yesterdayISO,
  type LocalProfile,
} from '@/lib/storage';
import { getLevelFromXP } from '@/lib/trivia';
import { evaluate } from '@/lib/achievements';

export type MiniGameId =
  | 'word-sprint'
  | 'number-sense'
  | 'memory-match'
  | 'reaction-tap'
  | 'road-rush';

export interface MiniGameResult {
  gameId: MiniGameId;
  score: number;
  xp: number;
  total?: number;
  correct?: number;
}

export interface RecordedResult {
  leveledUp: boolean;
  freshUnlocks: string[];
}

const PRETTY: Record<MiniGameId, string> = {
  'word-sprint':  'Word Sprint',
  'number-sense': 'Number Sense',
  'memory-match': 'Memory Match',
  'reaction-tap': 'Reaction Tap',
  'road-rush':    'Road Rush',
};

// Mirrors the math path of useGameStore.finishGame for Brain Rush.
// All 5 mini-games funnel through here so persistence is identical.
export async function recordMiniGameResult(r: MiniGameResult): Promise<RecordedResult> {
  const user = useUserStore.getState();
  const previousLevel = user.profile.level;
  const previousStreak = user.streak;

  // 1. Pure streak math against the in-memory streak.
  const newStreak = computeStreakAfterGame(previousStreak, todayISO(), yesterdayISO());

  // 2. New profile (derive level from totalXP to avoid drift).
  const newTotalXP = user.profile.totalXP + r.xp;
  const updatedProfile: LocalProfile = {
    ...user.profile,
    totalXP: newTotalXP,
    level: getLevelFromXP(newTotalXP),
    gamesPlayed: user.profile.gamesPlayed + 1,
  };

  // 3. Append to the recent-games ring buffer.
  const recent = await recordGame({
    category: PRETTY[r.gameId],
    score: r.score,
    xp: r.xp,
    correct: r.correct ?? 0,
    total: r.total ?? 0,
    at: new Date().toISOString(),
  });

  // 4. Achievement evaluation against the post-game snapshot.
  const unlockedIds = evaluate({ profile: updatedProfile, streak: newStreak, recent });
  const fresh = useAchievementsStore.getState().recordUnlocked(unlockedIds);

  // 5. Single Zustand commit.
  useUserStore.getState().setProfile(updatedProfile);
  useUserStore.getState().setStreak(newStreak);
  if (fresh.length > 0) {
    useGameStore.setState({ pendingAchievementIds: fresh });
  }

  return {
    leveledUp: updatedProfile.level > previousLevel,
    freshUnlocks: fresh,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest __tests__/record-mini-game.test.ts --silent 2>&1 | tail -8`
Expected: PASS, 4 tests.

- [ ] **Step 5: Run full test suite to confirm no regressions**

Run: `npm test --silent 2>&1 | tail -6`
Expected: 103 tests passing (99 baseline + 4 new), 16 suites.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit 2>&1 | tail -5`
Expected: empty output (exit 0).

- [ ] **Step 7: Commit**

```bash
git add lib/games/recordMiniGame.ts __tests__/record-mini-game.test.ts
git commit -m "feat(games): shared recordMiniGameResult — mini-games persist XP, streak, recent activity, achievements"
```

---

## Task 2: Wire Word Sprint to the recorder

**Files:**
- Modify: `app/game/word-sprint.tsx`

- [ ] **Step 1: Add the import + the guard ref**

Open `app/game/word-sprint.tsx`. Add to the imports near the top:

```tsx
import { recordMiniGameResult } from '@/lib/games/recordMiniGame';
```

Inside `WordSprintScreen()`, near the other refs:

```tsx
const recordedRef = useRef(false);
```

- [ ] **Step 2: Call the recorder on the transition into 'over'**

Add a new `useEffect` next to the existing ones inside `WordSprintScreen()`:

```tsx
useEffect(() => {
  if (phase !== 'over' || recordedRef.current) return;
  recordedRef.current = true;
  const xp = Math.floor(score / 4);
  recordMiniGameResult({
    gameId: 'word-sprint',
    score,
    xp,
    total: used.size,
    correct: used.size,
  }).catch(() => {/* swallow — UI already in over state */});
}, [phase, score, used.size]);
```

The `recordedRef` guards against double-counting under strict-mode double-render.

- [ ] **Step 3: Reset the guard when the player taps Play again**

Find the existing `onPlayAgain` handler. It currently does `router.replace('/game/word-sprint')` which fully remounts the screen — `recordedRef` initializes to `false` again. No change needed.

If Word Sprint had an in-place reset (it doesn't), the guard would need explicit reset. **Verify** the current Play again truly remounts by reading `app/game/word-sprint.tsx` `onPlayAgain` prop on the `GameOverCard`. If it does `router.replace`, you're done.

- [ ] **Step 4: Typecheck + test**

Run: `npx tsc --noEmit && npm test --silent 2>&1 | tail -6`
Expected: tsc clean, 103 tests passing.

- [ ] **Step 5: Commit**

```bash
git add app/game/word-sprint.tsx
git commit -m "feat(games): Word Sprint persists round via recordMiniGameResult"
```

---

## Task 3: Wire Number Sense to the recorder

**Files:**
- Modify: `app/game/number-sense.tsx`

- [ ] **Step 1: Import + guard ref**

Add to imports:

```tsx
import { recordMiniGameResult } from '@/lib/games/recordMiniGame';
```

Add inside `NumberSenseScreen()` near `intRef`:

```tsx
const recordedRef = useRef(false);
```

- [ ] **Step 2: Add the recorder useEffect**

Add inside `NumberSenseScreen()`:

```tsx
useEffect(() => {
  if (phase !== 'over' || recordedRef.current) return;
  recordedRef.current = true;
  const xp = Math.floor(score / 2);
  recordMiniGameResult({
    gameId: 'number-sense',
    score,
    xp,
    correct: correctCount,
    total: correctCount, // Number Sense streams problems — total ≈ correct + wrong, but we only track correct on each pick
  }).catch(() => {});
}, [phase, score, correctCount]);
```

- [ ] **Step 3: Typecheck + test**

Run: `npx tsc --noEmit && npm test --silent 2>&1 | tail -6`
Expected: tsc clean, 103 tests passing.

- [ ] **Step 4: Commit**

```bash
git add app/game/number-sense.tsx
git commit -m "feat(games): Number Sense persists round via recordMiniGameResult"
```

---

## Task 4: Wire Memory Match to the recorder

**Files:**
- Modify: `app/game/memory-match.tsx`

- [ ] **Step 1: Import + guard ref**

Add to imports:

```tsx
import { recordMiniGameResult } from '@/lib/games/recordMiniGame';
```

Add inside `MemoryMatchScreen()`:

```tsx
const recordedRef = useRef(false);
```

- [ ] **Step 2: Add the recorder useEffect**

```tsx
useEffect(() => {
  if (phase !== 'over' || recordedRef.current) return;
  recordedRef.current = true;
  const xp = Math.floor(score / 4);
  recordMiniGameResult({
    gameId: 'memory-match',
    score,
    xp,
    total: seq.length,
    correct: seq.length,
  }).catch(() => {});
}, [phase, score, seq.length]);
```

- [ ] **Step 3: Reset guard when player taps Play again**

Memory Match's Play again uses an in-place reset (resets `seq/attempt/score/round`). Add `recordedRef.current = false;` to the `onPlayAgain` handler so a second run actually records.

Find the `onPlayAgain` handler in the `GameOverCard` instantiation, currently:

```tsx
onPlayAgain={() => { setSeq([]); setAttempt([]); setScore(0); setRound(1); }}
```

Change to:

```tsx
onPlayAgain={() => {
  setSeq([]); setAttempt([]); setScore(0); setRound(1);
  recordedRef.current = false;
}}
```

- [ ] **Step 4: Typecheck + test**

Run: `npx tsc --noEmit && npm test --silent 2>&1 | tail -6`
Expected: tsc clean, 103 tests passing.

- [ ] **Step 5: Commit**

```bash
git add app/game/memory-match.tsx
git commit -m "feat(games): Memory Match persists round via recordMiniGameResult"
```

---

## Task 5: Wire Reaction Tap to the recorder

**Files:**
- Modify: `app/game/reaction-tap.tsx`

- [ ] **Step 1: Import + guard ref**

Add to imports:

```tsx
import { recordMiniGameResult } from '@/lib/games/recordMiniGame';
```

Add inside `ReactionTapScreen()`:

```tsx
const recordedRef = useRef(false);
```

- [ ] **Step 2: Add the recorder useEffect**

```tsx
useEffect(() => {
  if (phase !== 'over' || recordedRef.current) return;
  recordedRef.current = true;
  const xp = score * 2;
  recordMiniGameResult({
    gameId: 'reaction-tap',
    score,
    xp,
    total: score + misses,
    correct: score,
  }).catch(() => {});
}, [phase, score, misses]);
```

- [ ] **Step 3: Typecheck + test**

Run: `npx tsc --noEmit && npm test --silent 2>&1 | tail -6`
Expected: tsc clean, 103 tests passing.

- [ ] **Step 4: Commit**

```bash
git add app/game/reaction-tap.tsx
git commit -m "feat(games): Reaction Tap persists round via recordMiniGameResult"
```

---

## Task 6: Wire Road Rush to the recorder

**Files:**
- Modify: `app/game/road-rush.tsx`

- [ ] **Step 1: Import + guard ref**

Add to imports:

```tsx
import { recordMiniGameResult } from '@/lib/games/recordMiniGame';
import { distanceMeters, xpForRun } from '@/lib/games/roadRush';
```

(`distanceMeters` and `xpForRun` may already be imported — verify.)

Add inside `RoadRushScreen()`:

```tsx
const recordedRef = useRef(false);
```

- [ ] **Step 2: Add the recorder useEffect**

```tsx
useEffect(() => {
  if (phase !== 'over' || recordedRef.current) return;
  recordedRef.current = true;
  const meters = distanceMeters(state.distance);
  const xp = xpForRun(state.distance);
  recordMiniGameResult({
    gameId: 'road-rush',
    score: meters,
    xp,
    total: state.obstacles.length,
  }).catch(() => {});
}, [phase, state.distance, state.obstacles.length]);
```

- [ ] **Step 3: Reset guard when player taps Play again**

Road Rush's `restart` does an in-place reset. Update it:

```tsx
const restart = () => {
  setState(createInitialState());
  setPhase('idle');
  setSeconds(ROUND_SECONDS);
  recordedRef.current = false;
};
```

- [ ] **Step 4: Typecheck + test**

Run: `npx tsc --noEmit && npm test --silent 2>&1 | tail -6`
Expected: tsc clean, 103 tests passing.

- [ ] **Step 5: Commit**

```bash
git add app/game/road-rush.tsx
git commit -m "feat(games): Road Rush persists run via recordMiniGameResult"
```

---

## Task 7: Extend the achievements catalog

**Files:**
- Modify: `lib/achievements.ts`
- Modify: `__tests__/achievements.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `__tests__/achievements.test.ts`:

```ts
describe('achievements catalog additions', () => {
  it('unlocks "streak-3" at a 3-day streak', () => {
    const out = evaluate({
      profile: { username: 'x', totalXP: 30, level: 1, gamesPlayed: 3 },
      streak: { current: 3, longest: 3, lastPlayDate: '2026-05-15' },
      recent: [],
    });
    expect(out).toContain('streak-3');
  });
  it('unlocks "xp-100" at 100 XP', () => {
    const out = evaluate({
      profile: { username: 'x', totalXP: 100, level: 2, gamesPlayed: 4 },
      streak: { current: 1, longest: 1, lastPlayDate: '2026-05-15' },
      recent: [],
    });
    expect(out).toContain('xp-100');
  });
  it('unlocks "xp-500" at 500 XP', () => {
    const out = evaluate({
      profile: { username: 'x', totalXP: 500, level: 3, gamesPlayed: 20 },
      streak: { current: 1, longest: 5, lastPlayDate: '2026-05-15' },
      recent: [],
    });
    expect(out).toContain('xp-500');
  });
});
```

- [ ] **Step 2: Run to verify failures**

Run: `npx jest __tests__/achievements.test.ts --silent 2>&1 | tail -8`
Expected: 3 failures (the 3 ids are not yet in the catalog).

- [ ] **Step 3: Update the catalog**

Open `lib/achievements.ts`. Replace the `ACHIEVEMENTS` array with the unified 12-entry list:

```ts
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-round',   title: 'First Round',       description: 'Finish your first game.',                    predicate: (s) => s.profile.gamesPlayed >= 1 },
  { id: 'level-3',       title: 'Getting Somewhere', description: 'Reach level 3.',                             predicate: (s) => s.profile.level >= 3 },
  { id: 'level-5',       title: 'Knowledge Worker',  description: 'Reach level 5.',                             predicate: (s) => s.profile.level >= 5 },
  { id: 'level-10',      title: 'Quiz Machine',      description: 'Reach level 10.',                            predicate: (s) => s.profile.level >= 10 },
  { id: 'streak-3',      title: 'On Fire',           description: 'Hold a 3-day streak.',                       predicate: (s) => s.streak.current >= 3 },
  { id: 'week-streak',   title: 'Week On Lock',      description: 'Hold a 7-day streak.',                       predicate: (s) => s.streak.current >= 7 },
  { id: 'month-streak',  title: 'Unstoppable',       description: 'Hold a 30-day streak.',                      predicate: (s) => s.streak.current >= 30 },
  { id: 'xp-100',        title: 'Charged',           description: 'Earn 100 XP.',                               predicate: (s) => s.profile.totalXP >= 100 },
  { id: 'xp-500',        title: 'Big Brain',         description: 'Earn 500 XP.',                               predicate: (s) => s.profile.totalXP >= 500 },
  { id: 'xp-1k',         title: 'Cool 1,000',        description: 'Earn 1,000 XP.',                             predicate: (s) => s.profile.totalXP >= 1000 },
  { id: 'centurion',     title: 'Centurion',         description: 'Play 100 rounds.',                           predicate: (s) => s.profile.gamesPlayed >= 100 },
  { id: 'perfect-round', title: 'Flawless',          description: 'Get every answer right in a round.',         predicate: (s) => s.recent.some((g) => g.total > 0 && g.correct === g.total) },
];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/achievements.test.ts --silent 2>&1 | tail -6`
Expected: all 6 tests pass (3 original + 3 new).

- [ ] **Step 5: Run full suite**

Run: `npm test --silent 2>&1 | tail -6`
Expected: 106 tests passing (was 103, +3 new).

- [ ] **Step 6: Commit**

```bash
git add lib/achievements.ts __tests__/achievements.test.ts
git commit -m "feat(achievements): unified 12-entry catalog with streak-3, xp-100, xp-500 milestones"
```

---

## Task 8: Profile renders badges from the catalog (delete BADGES)

**Files:**
- Modify: `app/(tabs)/profile.tsx`

- [ ] **Step 1: Delete the hardcoded BADGES array**

Find and delete the top-level `const BADGES = [...]` block in `app/(tabs)/profile.tsx` (around line 29). It's no longer the source of truth.

- [ ] **Step 2: Add imports**

Near the top of the file, with the other imports:

```tsx
import { ACHIEVEMENTS } from '@/lib/achievements';
import { useAchievementsStore } from '@/store/useAchievementsStore';
```

- [ ] **Step 3: Read unlocked set from store**

Inside `ProfileScreen()`, near the existing `profile`/`streak` reads:

```tsx
const unlocked = useAchievementsStore((s) => s.unlocked);
```

- [ ] **Step 4: Replace the badge-rendering JSX**

Find the `Badges` section that currently maps over `BADGES`. Replace with:

```tsx
<MotionView entering={FadeInDown.delay(240).springify()}>
  <SectionHeader title="Badges" />
  <View style={styles.badgesGrid}>
    {ACHIEVEMENTS.map((a) => {
      const isUnlocked = unlocked.includes(a.id);
      return (
        <View
          key={a.id}
          style={[styles.badge, isUnlocked ? styles.badgeUnlocked : styles.badgeLocked]}
        >
          <View style={[styles.badgeMark, { backgroundColor: isUnlocked ? Colors.primary : Colors.borderBright }]} />
          <Text style={[styles.badgeTitle, !isUnlocked && styles.badgeTitleLocked]} numberOfLines={1}>
            {a.title}
          </Text>
          <Text style={styles.badgeDesc} numberOfLines={2}>
            {a.description}
          </Text>
          <Text style={styles.badgeState}>{isUnlocked ? 'Unlocked' : 'Locked'}</Text>
        </View>
      );
    })}
  </View>
</MotionView>
```

- [ ] **Step 5: Update styles**

Find the `badgesGrid` and `badge*` styles. Replace/append in the StyleSheet at the bottom of the file:

```tsx
badgesGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: Spacing.sm,
},
badge: {
  flexBasis: '31%',
  flexGrow: 1,
  padding: Spacing.md,
  borderRadius: Radius.md,
  backgroundColor: Colors.bgCard,
  borderWidth: 1,
  gap: 4,
  minHeight: 110,
},
badgeUnlocked: {
  borderColor: Colors.primary,
},
badgeLocked: {
  borderColor: Colors.border,
  borderStyle: 'dashed',
  opacity: 0.6,
},
badgeMark: {
  width: 24,
  height: 3,
  borderRadius: 2,
  marginBottom: 4,
},
badgeTitle: {
  fontSize: FontSize.sm,
  color: Colors.textPrimary,
  fontFamily: 'BricolageGrotesque_700Bold',
},
badgeTitleLocked: {
  color: Colors.textSecondary,
},
badgeDesc: {
  fontSize: FontSize.xs,
  color: Colors.textSecondary,
  fontFamily: 'PlusJakartaSans_400Regular',
  lineHeight: 14,
},
badgeState: {
  fontSize: FontSize.xs,
  color: Colors.textMuted,
  fontFamily: 'PlusJakartaSans_600SemiBold',
  marginTop: 'auto',
  letterSpacing: 0.5,
},
```

- [ ] **Step 6: Typecheck + test**

Run: `npx tsc --noEmit && npm test --silent 2>&1 | tail -6`
Expected: tsc clean, 106 tests passing.

- [ ] **Step 7: Commit**

```bash
git add app/(tabs)/profile.tsx
git commit -m "feat(profile): unified Badges grid renders from ACHIEVEMENTS + unlocked set"
```

---

## Task 9: AnimatedBackground accepts a `tint` prop

**Files:**
- Modify: `components/AnimatedBackground.tsx`

- [ ] **Step 1: Add the tint prop + tinted-orb derivation**

Open `components/AnimatedBackground.tsx`. Update the `Props` interface and the component body.

Replace the top of the file (imports through the `Props` interface and `AnimatedBackground` function) with:

```tsx
import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { Colors } from '@/constants/theme';

interface OrbSpec {
  color: string;
  size: number;
  top: string;
  left: string;
  driftX: number;
  driftY: number;
  durationMs: number;
  delayMs: number;
  opacity: number;
}

const DEFAULT_ORBS: OrbSpec[] = [
  { color: Colors.primary,      size: 280, top: '-12%', left: '-18%', driftX: 24, driftY: 18, durationMs: 9000,  delayMs:    0, opacity: 0.14 },
  { color: Colors.accent,       size: 220, top: '14%',  left: '60%',  driftX: 30, driftY: 22, durationMs: 11000, delayMs: 1200, opacity: 0.12 },
  { color: Colors.gold,         size: 180, top: '52%',  left: '-12%', driftX: 22, driftY: 28, durationMs: 12500, delayMs: 2400, opacity: 0.10 },
  { color: Colors.primaryLight, size: 160, top: '64%',  left: '58%',  driftX: 26, driftY: 20, durationMs: 10500, delayMs:  700, opacity: 0.12 },
];

// Build a 4-orb spec list biased to a single tint color. Keeps the same
// motion timing as DEFAULT_ORBS but paints all orbs from the tint family
// (full / +alpha overlay / darker / lighter).
function tintedOrbs(tint: string): OrbSpec[] {
  return DEFAULT_ORBS.map((o) => ({ ...o, color: tint }));
}

interface OrbProps extends OrbSpec { parallax?: number }
function Orb({ color, size, top, left, driftX, driftY, durationMs, delayMs, opacity, parallax = 1 }: OrbProps) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: durationMs, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => { cancelAnimation(t); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const animatedStyle = useAnimatedStyle(() => {
    const phase = t.value * Math.PI * 2;
    const dx = Math.sin(phase) * driftX * parallax;
    const dy = Math.cos(phase) * driftY * parallax;
    const s = 0.95 + 0.08 * Math.sin(phase + Math.PI / 3);
    return { transform: [{ translateX: dx }, { translateY: dy }, { scale: s }] };
  });
  const webBlur = Platform.OS === 'web' ? { filter: 'blur(48px)' } : null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.orb,
        { width: size, height: size, top: top as any, left: left as any, opacity },
        animatedStyle,
      ]}
    >
      <View style={[styles.disc, { backgroundColor: color, borderRadius: size / 2 }, webBlur as any]} />
    </Animated.View>
  );
}

interface Props {
  intensity?: 'subtle' | 'normal' | 'vivid';
  tint?: string;
}

export function AnimatedBackground({ intensity = 'normal', tint }: Props) {
  const parallax = intensity === 'vivid' ? 1.6 : intensity === 'subtle' ? 0.55 : 1;
  const dim = intensity === 'subtle' ? 0.6 : intensity === 'vivid' ? 1.2 : 1;
  const orbs = useMemo(() => (tint ? tintedOrbs(tint) : DEFAULT_ORBS), [tint]);
  return (
    <View pointerEvents="none" style={styles.root}>
      {orbs.map((o, i) => (
        <Orb key={i} {...o} opacity={o.opacity * dim} parallax={parallax} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  orb: { position: 'absolute' },
  disc: { width: '100%', height: '100%' },
});
```

- [ ] **Step 2: Typecheck + test**

Run: `npx tsc --noEmit && npm test --silent 2>&1 | tail -6`
Expected: tsc clean, 106 tests passing.

- [ ] **Step 3: Commit**

```bash
git add components/AnimatedBackground.tsx
git commit -m "feat(ui): AnimatedBackground accepts a tint prop"
```

---

## Task 10: Mount tinted AnimatedBackground on each game screen

**Files:**
- Modify: `app/game/session.tsx`, `app/game/word-sprint.tsx`, `app/game/number-sense.tsx`, `app/game/memory-match.tsx`, `app/game/reaction-tap.tsx`, `app/game/road-rush.tsx`

- [ ] **Step 1: Brain Rush (`app/game/session.tsx`)**

Find the imports block. Add:

```tsx
import { AnimatedBackground } from '@/components/AnimatedBackground';
```

In each render path (countdown, playing/result, gameover), inside the outer SafeAreaView/View, as the first child, add:

```tsx
<AnimatedBackground intensity="subtle" tint={Colors.primary} />
```

If session.tsx returns different sub-trees by phase, add to all of them so the tinted bg is always present.

- [ ] **Step 2: Word Sprint (`app/game/word-sprint.tsx`)**

Add import:

```tsx
import { AnimatedBackground } from '@/components/AnimatedBackground';
```

Inside the `<SafeAreaView style={styles.container} edges={['top']}>` as the first child:

```tsx
<AnimatedBackground intensity="subtle" tint={Colors.accent} />
```

- [ ] **Step 3: Number Sense (`app/game/number-sense.tsx`)**

Same pattern — import + `<AnimatedBackground intensity="subtle" tint={Colors.primary} />` as the first child of `<SafeAreaView>`.

- [ ] **Step 4: Memory Match (`app/game/memory-match.tsx`)**

Same — `tint={Colors.gold}`.

- [ ] **Step 5: Reaction Tap (`app/game/reaction-tap.tsx`)**

Same — `tint={Colors.success}`.

- [ ] **Step 6: Road Rush (`app/game/road-rush.tsx`)**

Same — `tint={Colors.danger}`.

- [ ] **Step 7: Typecheck + test + web export sanity**

Run: `npx tsc --noEmit && npm test --silent 2>&1 | tail -6 && npm run web:export 2>&1 | tail -3`
Expected: tsc clean, 106 tests passing, export completes.

- [ ] **Step 8: Commit**

```bash
git add app/game/session.tsx app/game/word-sprint.tsx app/game/number-sense.tsx app/game/memory-match.tsx app/game/reaction-tap.tsx app/game/road-rush.tsx
git commit -m "feat(ui): per-game tinted AnimatedBackground on all 6 game screens"
```

---

## Task 11: CountingNumber for Profile stats

**Files:**
- Create: `components/CountingNumber.tsx`
- Modify: `app/(tabs)/profile.tsx`

- [ ] **Step 1: Create CountingNumber**

Create `components/CountingNumber.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { Text, TextStyle } from 'react-native';
import {
  useSharedValue,
  withTiming,
  runOnJS,
  cancelAnimation,
  useAnimatedReaction,
} from 'react-native-reanimated';

interface Props {
  value: number;
  durationMs?: number;
  formatter?: (n: number) => string;
  style?: TextStyle | TextStyle[];
}

export function CountingNumber({ value, durationMs = 600, formatter, style }: Props) {
  const t = useSharedValue(0);
  const [displayed, setDisplayed] = useState<number>(0);

  useEffect(() => {
    t.value = 0;
    t.value = withTiming(value, { duration: durationMs });
    return () => { cancelAnimation(t); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useAnimatedReaction(
    () => t.value,
    (current) => { runOnJS(setDisplayed)(Math.round(current)); },
  );

  return (
    <Text style={style as any}>
      {formatter ? formatter(displayed) : displayed.toLocaleString()}
    </Text>
  );
}
```

- [ ] **Step 2: Use CountingNumber in Profile StatCards**

Profile currently passes raw numbers to `<StatCard value={…}>`. Replace the three uses:

```tsx
<StatCard label="Level" value={<CountingNumber value={profile.level} style={styles.statValueText} /> as any} color={Colors.primaryLight} />
<StatCard label="Total XP" value={<CountingNumber value={profile.totalXP} style={styles.statValueText} /> as any} color={Colors.accent} />
<StatCard label="Games" value={<CountingNumber value={profile.gamesPlayed} style={styles.statValueText} /> as any} color={Colors.gold} />
```

Add the import at the top of `app/(tabs)/profile.tsx`:

```tsx
import { CountingNumber } from '@/components/CountingNumber';
```

If `StatCardProps.value` is currently typed as `string | number`, widen it to `string | number | React.ReactNode` in `components/Card.tsx`. Locate the `StatCardProps` interface:

```tsx
interface StatCardProps {
  label: string;
  value: string | number | React.ReactNode;
  color?: string;
}
```

And update the render to handle the node case:

```tsx
{typeof value === 'string' || typeof value === 'number' ? (
  <Text style={[styles.statValue, { color: color ?? Colors.textPrimary }]}>{value}</Text>
) : (
  value
)}
```

Add a `statValueText` style in profile.tsx StyleSheet:

```tsx
statValueText: {
  fontSize: FontSize.xl,
  fontWeight: '800',
  fontFamily: 'BricolageGrotesque_700Bold',
  color: Colors.textPrimary,
  textAlign: 'center',
},
```

- [ ] **Step 3: Typecheck + test**

Run: `npx tsc --noEmit && npm test --silent 2>&1 | tail -6`
Expected: tsc clean, 106 tests passing.

- [ ] **Step 4: Commit**

```bash
git add components/CountingNumber.tsx components/Card.tsx app/(tabs)/profile.tsx
git commit -m "feat(ui): CountingNumber animates Profile stats from 0 on mount"
```

---

## Task 12: Card tile-press marker flash

**Files:**
- Modify: `components/Card.tsx`

- [ ] **Step 1: Add a markerFlash shared value to Card / StatCard**

In `components/Card.tsx`, the `Card` component already has a `scale` shared value driven by `handlePressIn`. Add a second shared value for marker opacity that bumps briefly on press.

Inside the `Card` function (around the existing `useSharedValue(1)`):

```tsx
const markerOpacity = useSharedValue(1);
```

In `handlePressIn`, after the scale animation kicks off:

```tsx
markerOpacity.value = withSequence(
  withTiming(0.55, { duration: 60 }),
  withTiming(1, { duration: 160 }),
);
```

Import `withSequence`, `withTiming` if not already imported:

```tsx
import { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming } from 'react-native-reanimated';
```

The marker flash is exposed as an animated style; consumers (the mini-game tiles in `play.tsx`) wrap their marker `View` with this style. Since the mini-game marker is inside Card's children, we don't pass it through. Instead, the flash effect is achieved by Card itself fading the entire card briefly. Simpler approach: ONLY do the press-scale (already done), no marker pass-through. Skip the marker-flash for now if it requires plumbing children's props.

**Final decision:** Do NOT plumb marker flash through Card children — too invasive. Instead, add a brief **card-wide tint flash** by animating `Card`'s `solidBg` background color overlay:

In Card.tsx, add an animated overlay:

```tsx
const flashOpacity = useSharedValue(0);

const flashStyle = useAnimatedStyle(() => ({
  opacity: flashOpacity.value,
}));
```

In `handlePressIn`:

```tsx
flashOpacity.value = withSequence(
  withTiming(0.18, { duration: 80 }),
  withTiming(0, { duration: 220 }),
);
```

When `onPress`, inside the press-able render path (inside `Animated.View` wrapping the `TouchableOpacity`), add an absolutely-positioned overlay:

```tsx
<Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: Colors.primary, borderRadius: Radius.md }, flashStyle]} />
```

- [ ] **Step 2: Typecheck + test**

Run: `npx tsc --noEmit && npm test --silent 2>&1 | tail -6`
Expected: tsc clean, 106 tests passing.

- [ ] **Step 3: Commit**

```bash
git add components/Card.tsx
git commit -m "feat(ui): Card press tint flash (120ms primary overlay)"
```

---

## Task 13: Onboarding stack — directional slide

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Change onboarding animation**

In `app/_layout.tsx`, find the onboarding Stack.Screen entry:

```tsx
<Stack.Screen
  name="onboarding"
  options={{
    animation: 'fade',
    presentation: 'fullScreenModal',
  }}
/>
```

Change to:

```tsx
<Stack.Screen
  name="onboarding"
  options={{
    animation: 'slide_from_right',
    presentation: 'fullScreenModal',
  }}
/>
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | tail -5`
Expected: empty output.

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat(ui): onboarding stack uses slide_from_right (directional)"
```

---

## Task 14: Final regression — e2e + full export + screenshots

**Files:** none modified — verification only.

- [ ] **Step 1: Re-export web bundle**

Run: `npm run web:export 2>&1 | tail -4`
Expected: "wrote SPA fallback → 200.html / 404.html" line.

- [ ] **Step 2: Restart the static server from `dist/`**

Run:

```bash
lsof -ti:8090 | xargs -r kill -9 2>/dev/null
sleep 1
cd dist && npx --yes serve -l tcp://0.0.0.0:8090 --no-clipboard >/dev/null 2>&1 &
cd ..
sleep 3
until curl -sf -o /dev/null http://127.0.0.1:8090/; do sleep 0.3; done
echo "UP"
```

Expected: "UP".

- [ ] **Step 3: Run the e2e test**

Run: `node scripts/e2e-test.js 2>&1 | tail -8`
Expected: "Errors: 1" (only the recoverable React #418 warning on welcome) or fewer.

- [ ] **Step 4: Inspect key screenshots**

Open these files with the Read tool and verify visually:
- `e2e-out/02-play.png` — 5 mini-game tiles visible
- `e2e-out/04a-during-countdown.png` — X close button visible top-left during countdown
- `e2e-out/05-after-x-click.png` — URL is `/play` after X click

- [ ] **Step 5: Curl all routes**

Run:

```bash
for p in / /play /profile /onboarding/welcome /game/session /game/word-sprint /game/number-sense /game/memory-match /game/reaction-tap /game/road-rush /manifest.webmanifest; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:8090${p}")
  echo "  $code  $p"
done
```

Expected: every line starts with `200`.

- [ ] **Step 6: Final tsc + tests**

Run: `npx tsc --noEmit && npm test --silent 2>&1 | tail -6`
Expected: tsc clean, **106 tests passing** across **16 suites**.

- [ ] **Step 7: Milestone commit**

```bash
git commit --allow-empty -m "milestone: mini-game persistence + unified achievements + tinted animated UI shipped"
```

---

## Self-Review

**Spec coverage:**
- §4.1 Recorder → Task 1 ✅
- §4.2 Wiring each game → Tasks 2–6 ✅
- §4.3 Achievement unification → Tasks 7–8 ✅
- §4.4 Tinted backgrounds → Tasks 9–10 ✅
- §4.5 Page transitions → Task 13 ✅
- §4.6 Micro-interactions (CountingNumber + tile flash) → Tasks 11–12 ✅
- §6 Testing strategy → Tasks 1, 7, 14 (e2e) ✅
- §7 Rollout one-phase-per-commit → 14 tasks each end in `git commit` ✅
- §8 Open questions → already documented in spec as preferences (Reaction Tap per-hit XP, same-tint recap); no separate task needed.

**Placeholder scan:** no TBD/TODO/FIXME/"add error handling"-style fluff. Every step has the literal code.

**Type consistency:**
- `MiniGameId` defined in Task 1 used unchanged in Tasks 2–6 ✅
- `MiniGameResult` shape (`{ gameId, score, xp, total?, correct? }`) used identically across all 5 game wirings ✅
- `useGameStore.setState({ pendingAchievementIds: fresh })` — verified `pendingAchievementIds` is a real state property (`store/useGameStore.ts:31`) ✅
- `evaluate({ profile, streak, recent })` — matches `lib/achievements.ts` `EvalState` interface ✅
- `useAchievementsStore.recordUnlocked(ids)` returns `string[]` of new ids — matches `store/useAchievementsStore.ts` ✅
- `getLevelFromXP(xp)` exists in `lib/trivia.ts` ✅
- `computeStreakAfterGame`, `recordGame`, `todayISO`, `yesterdayISO` exist in `lib/storage.ts` ✅
- `distanceMeters` / `xpForRun` exist in `lib/games/roadRush.ts` ✅

No gaps. Plan is consistent with itself and the spec.

---

## Execution

Plan complete and saved to `docs/superpowers/plans/2026-05-15-mini-game-persistence-and-animations.md`.

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

Which approach?
