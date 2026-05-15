# Functional Gaps + Animation Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining functional gaps and add the final animation polish that takes BrainStreak from "code-ready" to "production-grade Android app users actually want to open daily."

**Architecture:** Additive, layered. A single `constants/games.ts` centralizes game metadata. `lib/audio.ts` switches from silent-on-native to real bundled mp3s. A new `lib/usePausableInterval.ts` hook makes round timers AppState-aware. A new `store/usePersonalBestStore.ts` tracks per-game bests. The 5 mini-game screens read the `leveledUp` field already returned by the recorder and mount a `ConfettiBurst` accordingly. New shared components (`RollingNumber`, `OnboardingDots`) deliver the digit-roll and progress indicator. `GameOverCard` gains optional `leveledUp` / `newBest` / `delta` props for the celebratory flourish. Profile gets a live-unlock badge animation by diffing the unlocked set on focus.

**Tech Stack:** Expo SDK 54, React Native 0.81, expo-router 6, Zustand 5 + AsyncStorage, react-native-reanimated 4, react-native-confetti-cannon, expo-audio, Jest 29.x. Sound effects generated with ffmpeg (CC0, reproducible).

**Source spec:** `docs/superpowers/specs/2026-05-16-functional-and-animation-polish.md`

---

## File Structure

### New files

```
constants/games.ts                       # Single source of truth for game metadata (id/title/sub/color/path).
lib/usePausableInterval.ts               # AppState-aware setInterval replacement.
store/usePersonalBestStore.ts            # Per-game personal best persistence.
components/OnboardingDots.tsx            # 2-dot progress indicator.
components/RollingNumber.tsx             # Number that rolls/flips on change.

assets/sounds/tap.mp3                    # 60ms 440Hz square pop
assets/sounds/select.mp3                 # 180ms rising chirp 620→820Hz
assets/sounds/tick.mp3                   # 35ms 1100Hz countdown tick
assets/sounds/correct.mp3                # 420ms ascending triad (C5→E5→G5)
assets/sounds/wrong.mp3                  # 330ms descending sawtooth
assets/sounds/levelup.mp3                # 700ms triumphant triad
assets/sounds/crash.mp3                  # 340ms low sawtooth thud

scripts/generate-sounds.sh               # ffmpeg synthesis recipe (reproducible).

__tests__/use-pausable-interval.test.ts  # 6 tests covering pause/resume math.
__tests__/personal-best.test.ts          # 5 tests covering store semantics.
__tests__/audio.test.ts                  # 2 tests covering audio init + soundOff gate.
```

### Files modified

```
lib/audio.ts                                       # Uncomment SOURCES entries; load real mp3s on native.
app/game/session.tsx                               # Use usePausableInterval.
app/game/word-sprint.tsx                           # usePausableInterval + leveledUp confetti.
app/game/number-sense.tsx                          # usePausableInterval + leveledUp confetti.
app/game/memory-match.tsx                          # leveledUp confetti (no round timer).
app/game/reaction-tap.tsx                          # usePausableInterval + leveledUp confetti.
app/game/road-rush.tsx                             # usePausableInterval + leveledUp confetti.
lib/games/recordMiniGame.ts                        # Update personal best store inside the recorder.
store/useGameStore.ts                              # Update personal best for Brain Rush in finishGame.
components/games/GameOverCard.tsx                  # Add optional leveledUp/newBest/delta props + flourish.
app/onboarding/welcome.tsx                         # Mount OnboardingDots step=1; add B-logo pulse.
app/onboarding/username.tsx                        # Mount OnboardingDots step=2.
app/(tabs)/play.tsx                                # Read mini-game tiles from constants/games.ts.
app/(tabs)/profile.tsx                             # Read personal bests + live badge unlock animation.
app/(tabs)/_layout.tsx                             # Tab bar slide animation.
components/DailyChallengeCard.tsx                  # Wiggle until tapped today; read titles from constants/games.ts.
components/StreakBadge.tsx                         # Use RollingNumber for the streak digit.
store/useSettingsStore.ts                          # Add lastDailyChallengeTappedDate.
```

### Files NOT touched (stable surface)

- `lib/storage.ts`, `lib/achievements.ts`, `lib/dailyChallenge.ts`, `lib/quiz-bank.ts`, `lib/trivia.ts`
- `lib/games/roadRush.ts`, `lib/games/wordSprint.ts`, `lib/games/numberSense.ts`, `lib/games/memoryMatch.ts`, `lib/games/reactionTap.ts`
- `store/useUserStore.ts`, `store/useAchievementsStore.ts`
- `components/AnimatedBackground.tsx`, `components/HeroSheen.tsx`, `components/Card.tsx`, `components/CountingNumber.tsx`, `components/Button.tsx`, `components/CategoryTile.tsx`, `components/AchievementToast.tsx`, `components/SkeletonCard.tsx`, `components/BubbleField.tsx`, `components/MotionView.tsx`, `components/ErrorBoundary.tsx`
- All 9 routes; no route renames

---

## Task 1: Centralize game metadata in `constants/games.ts`

**Files:**
- Create: `constants/games.ts`
- Modify: `app/(tabs)/play.tsx` (use the new constant)
- Modify: `components/DailyChallengeCard.tsx` (use the new constant)

This task is the cross-cutting refactor that Tasks 7 and 12 depend on. Lands first.

- [ ] **Step 1: Create `constants/games.ts`**

```ts
import { Colors } from '@/constants/theme';

export type GameId =
  | 'brain-rush'
  | 'word-sprint'
  | 'number-sense'
  | 'memory-match'
  | 'reaction-tap'
  | 'road-rush';

export interface GameMeta {
  id: GameId;
  title: string;
  sub: string;
  color: string;
  path: string;  // navigation target
}

// Single source of truth for game metadata. Play tab, DailyChallengeCard,
// and Profile's Personal Bests section all read from here.
export const GAMES: ReadonlyArray<GameMeta> = [
  { id: 'brain-rush',   title: 'Brain Rush',   sub: '5 questions · 15s each',  color: Colors.primary,      path: '/play' },
  { id: 'word-sprint',  title: 'Word Sprint',  sub: '60s anagram chase',        color: Colors.accent,       path: '/game/word-sprint' },
  { id: 'number-sense', title: 'Number Sense', sub: '30s math drill',           color: Colors.primaryLight, path: '/game/number-sense' },
  { id: 'memory-match', title: 'Memory Match', sub: 'Simon-style sequence',     color: Colors.gold,         path: '/game/memory-match' },
  { id: 'reaction-tap', title: 'Reaction Tap', sub: 'Tap before it vanishes',   color: Colors.success,      path: '/game/reaction-tap' },
  { id: 'road-rush',    title: 'Road Rush',    sub: 'Dodge traffic, no chill',  color: Colors.danger,       path: '/game/road-rush' },
];

// Convenience accessor — undefined if id isn't a registered game.
export function gameMeta(id: GameId): GameMeta | undefined {
  return GAMES.find((g) => g.id === id);
}

// Mini-games only (everything except brain-rush).
export const MINI_GAMES = GAMES.filter((g) => g.id !== 'brain-rush') as ReadonlyArray<GameMeta>;
```

- [ ] **Step 2: Update `app/(tabs)/play.tsx` to read from the constant**

Find the inline array in the Mini-games grid:

```tsx
            {(
              [
                { id: 'word-sprint',  title: 'Word Sprint',  sub: '60s anagram chase',       color: Colors.accent  },
                { id: 'number-sense', title: 'Number Sense', sub: '30s math drill',          color: Colors.primaryLight },
                { id: 'memory-match', title: 'Memory Match', sub: 'Simon-style sequence',    color: Colors.gold    },
                { id: 'reaction-tap', title: 'Reaction Tap', sub: 'Tap before it vanishes',  color: Colors.success },
                { id: 'road-rush',    title: 'Road Rush',    sub: 'Dodge traffic, no chill', color: Colors.danger  },
              ] as const
            ).map((g) => (
```

Replace with:

```tsx
            {MINI_GAMES.map((g) => (
```

Add to imports at top:

```tsx
import { MINI_GAMES } from '@/constants/games';
```

- [ ] **Step 3: Update `components/DailyChallengeCard.tsx` to read from the constant**

Find the existing TITLES record:

```tsx
const TITLES: Record<GameId, string> = {
  'brain-rush': 'Brain Rush',
  'word-sprint': 'Word Sprint',
  'number-sense': 'Number Sense',
  'memory-match': 'Memory Match',
  'reaction-tap': 'Reaction Tap',
  'road-rush': 'Road Rush',
};
```

Replace with:

```tsx
import { GAMES } from '@/constants/games';

const TITLES: Record<string, string> = Object.fromEntries(
  GAMES.map((g) => [g.id, g.title]),
);
```

Or even simpler — delete `TITLES` entirely and use `gameMeta(id)?.title ?? id` at the call site. Keep TITLES if existing code reads it elsewhere; simpler path is the in-place map above.

The import for `GameId` from `@/lib/dailyChallenge` still stands — that re-exports the same string union.

- [ ] **Step 4: Typecheck + tests**

```
cd /Users/basusingh/Desktop/Mob_App
npx tsc --noEmit 2>&1 | tail -5
npm test --silent 2>&1 | tail -6
```

Expected: tsc clean; 106/106 tests passing.

- [ ] **Step 5: Commit**

```bash
git add constants/games.ts app/\(tabs\)/play.tsx components/DailyChallengeCard.tsx
git commit -m "refactor: centralize game metadata in constants/games.ts"
```

---

## Task 2: Bundle native mp3 sound effects

**Files:**
- Create: `scripts/generate-sounds.sh`
- Create: `assets/sounds/*.mp3` (7 files)
- Modify: `lib/audio.ts` (uncomment SOURCES)
- Test: `__tests__/audio.test.ts`

ffmpeg must be installed. If `which ffmpeg` returns nothing, the implementer runs `brew install ffmpeg` first (interactive). Tell the controller via NEEDS_CONTEXT if you can't install it.

- [ ] **Step 1: Create `scripts/generate-sounds.sh`**

```bash
#!/usr/bin/env bash
# Generate the 7 BrainStreak sound effects via ffmpeg sine/sawtooth synthesis.
# Reproducible, CC0, license-clean. Run from the repo root: bash scripts/generate-sounds.sh
set -euo pipefail

OUT="assets/sounds"
mkdir -p "$OUT"

# Common params for short utility sfx: mono 22050Hz 64kbps mp3.
ENC="-ac 1 -ar 22050 -b:a 64k"

# tap.mp3 — quick 440Hz square pop, 60ms with fade in/out.
ffmpeg -y -f lavfi -i "sine=frequency=440:duration=0.06" \
  -af "afade=t=in:d=0.003,afade=t=out:st=0.05:d=0.01,volume=0.35" \
  $ENC "$OUT/tap.mp3"

# select.mp3 — rising chirp 620→820Hz, 180ms.
ffmpeg -y -f lavfi -i "sine=frequency=620:duration=0.08" -f lavfi -i "sine=frequency=820:duration=0.1" \
  -filter_complex "[0:a]afade=t=out:st=0.07:d=0.01[a];[1:a]afade=t=in:d=0.005,afade=t=out:st=0.09:d=0.01[b];[a][b]concat=n=2:v=0:a=1,volume=0.35" \
  $ENC "$OUT/select.mp3"

# tick.mp3 — sharp 1100Hz click, 35ms.
ffmpeg -y -f lavfi -i "sine=frequency=1100:duration=0.035" \
  -af "afade=t=in:d=0.003,afade=t=out:st=0.025:d=0.01,volume=0.4" \
  $ENC "$OUT/tick.mp3"

# correct.mp3 — ascending C5(523)→E5(659)→G5(784) triad, 420ms.
ffmpeg -y \
  -f lavfi -i "sine=frequency=523:duration=0.12" \
  -f lavfi -i "sine=frequency=659:duration=0.12" \
  -f lavfi -i "sine=frequency=784:duration=0.18" \
  -filter_complex "[0:a]afade=t=in:d=0.005,afade=t=out:st=0.11:d=0.01[a]; \
                   [1:a]afade=t=in:d=0.005,afade=t=out:st=0.11:d=0.01[b]; \
                   [2:a]afade=t=in:d=0.005,afade=t=out:st=0.17:d=0.01[c]; \
                   [a][b][c]concat=n=3:v=0:a=1,volume=0.4" \
  $ENC "$OUT/correct.mp3"

# wrong.mp3 — descending sawtooth 320→180Hz, 330ms.
ffmpeg -y \
  -f lavfi -i "lavfi=aevalsrc='0.4*sin(2*PI*320*t)*exp(-3*t):s=22050:d=0.11'" \
  -f lavfi -i "lavfi=aevalsrc='0.4*sin(2*PI*180*t)*exp(-3*t):s=22050:d=0.22'" \
  -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1,volume=0.5" \
  $ENC "$OUT/wrong.mp3"

# levelup.mp3 — triumphant ascending C5→E5→G5→C6, 700ms.
ffmpeg -y \
  -f lavfi -i "sine=frequency=523:duration=0.12" \
  -f lavfi -i "sine=frequency=659:duration=0.12" \
  -f lavfi -i "sine=frequency=784:duration=0.14" \
  -f lavfi -i "sine=frequency=1046:duration=0.32" \
  -filter_complex "[0:a]afade=t=in:d=0.005,afade=t=out:st=0.11:d=0.01[a]; \
                   [1:a]afade=t=in:d=0.005,afade=t=out:st=0.11:d=0.01[b]; \
                   [2:a]afade=t=in:d=0.005,afade=t=out:st=0.13:d=0.01[c]; \
                   [3:a]afade=t=in:d=0.005,afade=t=out:st=0.30:d=0.02[d]; \
                   [a][b][c][d]concat=n=4:v=0:a=1,volume=0.45" \
  $ENC "$OUT/levelup.mp3"

# crash.mp3 — low decaying sawtooth 180→90Hz, 340ms.
ffmpeg -y \
  -f lavfi -i "lavfi=aevalsrc='0.5*sin(2*PI*180*t)*exp(-2.5*t):s=22050:d=0.12'" \
  -f lavfi -i "lavfi=aevalsrc='0.5*sin(2*PI*90*t)*exp(-2.5*t):s=22050:d=0.22'" \
  -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1,volume=0.5" \
  $ENC "$OUT/crash.mp3"

echo "Generated 7 sound files in $OUT"
ls -lh "$OUT"
```

- [ ] **Step 2: Run the generator**

```bash
cd /Users/basusingh/Desktop/Mob_App
bash scripts/generate-sounds.sh
```

Expected output: 7 files in `assets/sounds/`, each between 1-5 KB. If `ffmpeg` is not installed, run `brew install ffmpeg` first.

If the `aevalsrc` lavfi filter form errors (older ffmpeg), substitute with `aevalsrc=...` as standalone (drop the `lavfi=` wrapper). Different ffmpeg versions accept slightly different syntax.

- [ ] **Step 3: Update `lib/audio.ts` SOURCES to point at the real files**

Find this block in `lib/audio.ts`:

```ts
const SOURCES: Partial<Record<SoundKey, number>> = {
  // Uncomment as each mp3 lands in assets/sounds/.
  // tap: require('@/assets/sounds/tap.mp3'),
  // select: require('@/assets/sounds/select.mp3'),
  // tick: require('@/assets/sounds/tick.mp3'),
  // correct: require('@/assets/sounds/correct.mp3'),
  // wrong: require('@/assets/sounds/wrong.mp3'),
  // levelup: require('@/assets/sounds/levelup.mp3'),
  // crash: require('@/assets/sounds/crash.mp3'),
  // bg: require('@/assets/sounds/bg.mp3'),
};
```

Replace with:

```ts
const SOURCES: Partial<Record<SoundKey, number>> = {
  tap:     require('@/assets/sounds/tap.mp3'),
  select:  require('@/assets/sounds/select.mp3'),
  tick:    require('@/assets/sounds/tick.mp3'),
  correct: require('@/assets/sounds/correct.mp3'),
  wrong:   require('@/assets/sounds/wrong.mp3'),
  levelup: require('@/assets/sounds/levelup.mp3'),
  crash:   require('@/assets/sounds/crash.mp3'),
  // bg deliberately omitted — web uses procedural drone; native gets silence
  // on bg loop until a curated mp3 is sourced.
};
```

- [ ] **Step 4: Add audio init test**

Create `__tests__/audio.test.ts`:

```ts
import { audio } from '@/lib/audio';
import { useSettingsStore } from '@/store/useSettingsStore';

describe('audio module', () => {
  beforeEach(() => {
    useSettingsStore.setState({ soundOn: true });
  });

  test('exposes the documented keys', () => {
    expect(typeof audio.tap).toBe('function');
    expect(typeof audio.select).toBe('function');
    expect(typeof audio.tick).toBe('function');
    expect(typeof audio.correct).toBe('function');
    expect(typeof audio.wrong).toBe('function');
    expect(typeof audio.levelup).toBe('function');
    expect(typeof audio.crash).toBe('function');
    expect(typeof audio.bgStart).toBe('function');
    expect(typeof audio.bgStop).toBe('function');
  });

  test('calls are no-ops when soundOn is false', () => {
    useSettingsStore.setState({ soundOn: false });
    // None of these should throw or attempt to play. We just verify they
    // return without error (Web Audio path is skipped at the enabled() gate).
    expect(() => audio.tap()).not.toThrow();
    expect(() => audio.correct()).not.toThrow();
    expect(() => audio.levelup()).not.toThrow();
  });
});
```

- [ ] **Step 5: Run tests**

```
cd /Users/basusingh/Desktop/Mob_App
npx jest __tests__/audio.test.ts --silent 2>&1 | tail -6
npm test --silent 2>&1 | tail -6
```

Expected: audio.test passes both cases; full suite at 108/108 (was 106 + 2 new).

- [ ] **Step 6: Typecheck**

```
cd /Users/basusingh/Desktop/Mob_App
npx tsc --noEmit 2>&1 | tail -5
```

Expected: empty.

- [ ] **Step 7: Commit**

```bash
git add scripts/generate-sounds.sh assets/sounds/ lib/audio.ts __tests__/audio.test.ts
git commit -m "feat(audio): bundle native mp3 sound effects (CC0, ffmpeg-generated)"
```

---

## Task 3: `usePausableInterval` hook

**Files:**
- Create: `lib/usePausableInterval.ts`
- Test: `__tests__/use-pausable-interval.test.ts`

- [ ] **Step 1: Write failing tests at `__tests__/use-pausable-interval.test.ts`**

```ts
import { renderHook, act } from '@testing-library/react-hooks';
import { AppState } from 'react-native';
import { usePausableInterval } from '@/lib/usePausableInterval';

// Helper: capture the AppState 'change' subscription so we can fire it manually.
let appStateListener: ((s: string) => void) | null = null;
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    AppState: {
      currentState: 'active',
      addEventListener: (event: string, cb: (s: string) => void) => {
        if (event === 'change') appStateListener = cb;
        return { remove: () => { appStateListener = null; } };
      },
    },
  };
});

describe('usePausableInterval', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    appStateListener = null;
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('calls onTick at the expected cadence and onComplete at duration', () => {
    const onTick = jest.fn();
    const onComplete = jest.fn();
    renderHook(() =>
      usePausableInterval({ durationMs: 1000, tickMs: 200, onTick, onComplete, enabled: true })
    );
    act(() => { jest.advanceTimersByTime(200); });
    expect(onTick).toHaveBeenCalledTimes(1);
    act(() => { jest.advanceTimersByTime(800); });
    expect(onTick).toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  test('pauses when AppState goes to background', () => {
    const onTick = jest.fn();
    renderHook(() =>
      usePausableInterval({ durationMs: 1000, tickMs: 100, onTick, onComplete: () => {}, enabled: true })
    );
    act(() => { jest.advanceTimersByTime(300); });
    const ticksBeforeBackground = onTick.mock.calls.length;
    act(() => { appStateListener?.('background'); });
    act(() => { jest.advanceTimersByTime(500); });
    expect(onTick).toHaveBeenCalledTimes(ticksBeforeBackground);  // no new ticks while backgrounded
  });

  test('resumes from the remaining time after background→active', () => {
    const onTick = jest.fn();
    const onComplete = jest.fn();
    renderHook(() =>
      usePausableInterval({ durationMs: 1000, tickMs: 100, onTick, onComplete, enabled: true })
    );
    act(() => { jest.advanceTimersByTime(400); });
    act(() => { appStateListener?.('background'); });
    act(() => { jest.advanceTimersByTime(10_000); });  // long background
    act(() => { appStateListener?.('active'); });
    act(() => { jest.advanceTimersByTime(600); });
    expect(onComplete).toHaveBeenCalledTimes(1);  // 400 + 600 = 1000ms of FOREGROUND time
  });

  test('does nothing when enabled is false', () => {
    const onTick = jest.fn();
    renderHook(() =>
      usePausableInterval({ durationMs: 1000, tickMs: 100, onTick, onComplete: () => {}, enabled: false })
    );
    act(() => { jest.advanceTimersByTime(2000); });
    expect(onTick).not.toHaveBeenCalled();
  });

  test('reset() restarts from full duration', () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() =>
      usePausableInterval({ durationMs: 1000, tickMs: 100, onTick: () => {}, onComplete, enabled: true })
    );
    act(() => { jest.advanceTimersByTime(700); });
    act(() => { result.current.reset(); });
    act(() => { jest.advanceTimersByTime(900); });
    expect(onComplete).not.toHaveBeenCalled();  // only 900ms since reset; need 1000
    act(() => { jest.advanceTimersByTime(200); });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  test('handles rapid background/foreground oscillation', () => {
    const onTick = jest.fn();
    const onComplete = jest.fn();
    renderHook(() =>
      usePausableInterval({ durationMs: 1000, tickMs: 100, onTick, onComplete, enabled: true })
    );
    act(() => { jest.advanceTimersByTime(200); });
    act(() => { appStateListener?.('background'); });
    act(() => { appStateListener?.('active'); });
    act(() => { appStateListener?.('background'); });
    act(() => { appStateListener?.('active'); });
    act(() => { jest.advanceTimersByTime(800); });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
```

This test file requires `@testing-library/react-hooks` as a devDependency. Install if missing:

```bash
cd /Users/basusingh/Desktop/Mob_App
npm install --save-dev @testing-library/react-hooks
```

If `@testing-library/react-hooks` doesn't compile with React 19, fall back to `@testing-library/react`:

```bash
npm install --save-dev @testing-library/react
```

And replace the `renderHook` import with `import { renderHook, act } from '@testing-library/react';`.

- [ ] **Step 2: Run tests to verify failures**

```
cd /Users/basusingh/Desktop/Mob_App
npx jest __tests__/use-pausable-interval.test.ts --silent 2>&1 | tail -10
```

Expected: 6 failures with "Cannot find module '@/lib/usePausableInterval'".

- [ ] **Step 3: Create `lib/usePausableInterval.ts`**

```ts
import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export interface PausableIntervalConfig {
  durationMs: number;
  tickMs: number;
  onTick: (remainingMs: number) => void;
  onComplete: () => void;
  enabled: boolean;
}

export interface PausableInterval {
  reset: () => void;
}

// AppState-aware setInterval. Pauses when the app backgrounds; resumes
// from the remaining time on return. Calls onTick(remainingMs) at the
// configured cadence; calls onComplete() exactly once when remaining
// hits 0 (or less). Use `reset()` to restart with full durationMs.
export function usePausableInterval(config: PausableIntervalConfig): PausableInterval {
  const { durationMs, tickMs, enabled } = config;
  // Keep the callbacks in a ref so a re-render with new closures doesn't
  // restart the interval — the interval reads the latest at tick time.
  const onTickRef = useRef(config.onTick);
  const onCompleteRef = useRef(config.onComplete);
  onTickRef.current = config.onTick;
  onCompleteRef.current = config.onComplete;

  // The clock is anchored by `endAt`: a wall-clock instant when the timer
  // should fire onComplete. While running, endAt is in the future. While
  // paused, we capture `pausedRemainingMs` and clear endAt.
  const endAtRef = useRef<number | null>(null);
  const pausedRemainingRef = useRef<number>(durationMs);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);

  // Bump this to force the start effect to restart with full duration.
  const [resetNonce, setResetNonce] = useState(0);

  const startInterval = useCallback((remainingMs: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    completedRef.current = false;
    endAtRef.current = Date.now() + remainingMs;
    intervalRef.current = setInterval(() => {
      const end = endAtRef.current;
      if (end == null) return;
      const remaining = end - Date.now();
      if (remaining <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        endAtRef.current = null;
        if (!completedRef.current) {
          completedRef.current = true;
          onCompleteRef.current();
        }
        return;
      }
      onTickRef.current(remaining);
    }, tickMs);
  }, [tickMs]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      endAtRef.current = null;
      pausedRemainingRef.current = durationMs;
      completedRef.current = false;
      return;
    }
    startInterval(durationMs);
    pausedRemainingRef.current = durationMs;

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        // Resume from remaining time.
        if (!completedRef.current && pausedRemainingRef.current > 0) {
          startInterval(pausedRemainingRef.current);
        }
      } else {
        // Pause. Capture remaining time.
        if (endAtRef.current != null) {
          pausedRemainingRef.current = Math.max(0, endAtRef.current - Date.now());
        }
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        endAtRef.current = null;
      }
    });

    return () => {
      sub.remove();
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      endAtRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, durationMs, resetNonce, startInterval]);

  const reset = useCallback(() => {
    pausedRemainingRef.current = durationMs;
    completedRef.current = false;
    setResetNonce((n) => n + 1);
  }, [durationMs]);

  return { reset };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
cd /Users/basusingh/Desktop/Mob_App
npx jest __tests__/use-pausable-interval.test.ts --silent 2>&1 | tail -8
```

Expected: 6 passes.

- [ ] **Step 5: Full suite**

```
cd /Users/basusingh/Desktop/Mob_App
npm test --silent 2>&1 | tail -6
```

Expected: 114 tests (108 baseline after Task 2 + 6 new).

- [ ] **Step 6: Typecheck**

```
cd /Users/basusingh/Desktop/Mob_App
npx tsc --noEmit 2>&1 | tail -5
```

Expected: empty.

- [ ] **Step 7: Commit**

```bash
git add lib/usePausableInterval.ts __tests__/use-pausable-interval.test.ts package.json package-lock.json
git commit -m "feat: usePausableInterval — AppState-aware setInterval replacement"
```

---

## Task 4: Apply `usePausableInterval` in all 5 timer-driven game screens

**Files:**
- Modify: `app/game/session.tsx`, `app/game/word-sprint.tsx`, `app/game/number-sense.tsx`, `app/game/reaction-tap.tsx`, `app/game/road-rush.tsx`. (Memory Match has no round timer — skip.)

This task swaps each existing `setInterval` round timer for the new hook. Behavior remains identical when the app stays foreground; backgrounding now pauses cleanly.

For each file, the pattern is the same:
1. Import `usePausableInterval`.
2. Remove the old `useEffect` that creates `setInterval` for the round timer.
3. Replace with a `usePausableInterval(...)` call.

- [ ] **Step 1: word-sprint.tsx**

Find the existing seconds-countdown effect:

```tsx
useEffect(() => {
  intervalRef.current = setInterval(() => {
    setSeconds((s) => {
      if (s <= 1) {
        clearInterval(intervalRef.current!);
        setPhase('over');
        return 0;
      }
      return s - 1;
    });
  }, 1000);
  return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
}, []);
```

Replace with:

```tsx
usePausableInterval({
  durationMs: ROUND_SECONDS * 1000,
  tickMs: 1000,
  enabled: phase === 'playing',
  onTick: (remainingMs) => {
    setSeconds(Math.ceil(remainingMs / 1000));
  },
  onComplete: () => {
    setPhase('over');
    setSeconds(0);
  },
});
```

Add to imports:

```tsx
import { usePausableInterval } from '@/lib/usePausableInterval';
```

Remove the `const intervalRef = useRef<...>` if it's no longer referenced.

- [ ] **Step 2: number-sense.tsx**

Identical pattern. Find:

```tsx
intRef.current = setInterval(() => {
  setSeconds((s) => {
    if (s <= 1) { clearInterval(intRef.current!); setPhase('over'); return 0; }
    return s - 1;
  });
}, 1000);
```

Replace the surrounding `useEffect` with:

```tsx
usePausableInterval({
  durationMs: ROUND_SECONDS * 1000,
  tickMs: 1000,
  enabled: phase === 'playing',
  onTick: (remainingMs) => setSeconds(Math.ceil(remainingMs / 1000)),
  onComplete: () => { setPhase('over'); setSeconds(0); },
});
```

Add the import. Remove the now-unused `intRef`.

- [ ] **Step 3: reaction-tap.tsx**

Same pattern. Replace the round-timer `setInterval` block with the hook. The respawn-timer `setTimeout` block is SEPARATE — leave it as-is.

```tsx
usePausableInterval({
  durationMs: ROUND_SECONDS * 1000,
  tickMs: 1000,
  enabled: phase === 'playing',
  onTick: (remainingMs) => setSeconds(Math.ceil(remainingMs / 1000)),
  onComplete: () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setPhase('over');
    setSeconds(0);
  },
});
```

- [ ] **Step 4: road-rush.tsx**

Same. Replace the `secRef.current = setInterval(...)` block with the hook. Note Road Rush has a SECOND `setInterval` for the game-loop frames (every 30ms) — leave that loop as-is, only the round-timer is replaced.

```tsx
usePausableInterval({
  durationMs: ROUND_SECONDS * 1000,
  tickMs: 1000,
  enabled: phase === 'playing',
  onTick: (remainingMs) => setSeconds(Math.ceil(remainingMs / 1000)),
  onComplete: () => setPhase('over'),
});
```

- [ ] **Step 5: session.tsx (Brain Rush)**

The session.tsx timer is per-question, not per-round. It runs at 200ms cadence checking elapsed via `startTimeRef.current`. This logic is significantly different from the simple round timers. **Skip the conversion for session.tsx in this task.** Per-question time-elapsed is naturally interrupted by a background event (the user's score for the current question is whatever's elapsed when they tap back).

If a future refinement needs Brain Rush to pause-per-question, it gets its own task. For now, the 5 mini-game timers benefit from the pausable-interval and that's the main user-visible win.

- [ ] **Step 6: Typecheck + tests**

```
cd /Users/basusingh/Desktop/Mob_App
npx tsc --noEmit 2>&1 | tail -5
npm test --silent 2>&1 | tail -6
```

Expected: tsc clean; 114/114 tests passing.

- [ ] **Step 7: Commit**

```bash
git add app/game/word-sprint.tsx app/game/number-sense.tsx app/game/reaction-tap.tsx app/game/road-rush.tsx
git commit -m "feat(games): pause round timers when app backgrounds (4 mini-games)"
```

---

## Task 5: Mini-game level-up celebration

**Files:**
- Modify: `app/game/word-sprint.tsx`, `app/game/number-sense.tsx`, `app/game/memory-match.tsx`, `app/game/reaction-tap.tsx`, `app/game/road-rush.tsx`

Each game currently calls `recordMiniGameResult(...).catch(...)`. Change to capture the resolved value and pop confetti + play `audio.levelup()` when `leveledUp` is true.

The 5 games each get the same change. Pattern shown for word-sprint; replicate for the others.

- [ ] **Step 1: word-sprint.tsx**

Add to top imports:

```tsx
import { ConfettiBurst } from '@/components/ConfettiBurst';
```

Add state inside `WordSprintScreen()`:

```tsx
const [leveledUp, setLeveledUp] = useState(false);
```

Find the existing recorder useEffect:

```tsx
useEffect(() => {
  if (phase !== 'over' || recordedRef.current) return;
  recordedRef.current = true;
  const xp = Math.floor(score / 4);
  recordMiniGameResult({
    gameId: 'word-sprint',
    score,
    xp,
  }).catch(() => {/* swallow — UI already in over state */});
}, [phase, score]);
```

Change to:

```tsx
useEffect(() => {
  if (phase !== 'over' || recordedRef.current) return;
  recordedRef.current = true;
  const xp = Math.floor(score / 4);
  recordMiniGameResult({
    gameId: 'word-sprint',
    score,
    xp,
  }).then((res) => {
    if (res.leveledUp) {
      setLeveledUp(true);
      audio.levelup();
    }
  }).catch(() => {/* swallow — UI already in over state */});
}, [phase, score]);
```

In the render path where `phase === 'over'`, add at the top of the over-state block:

```tsx
{leveledUp && <ConfettiBurst trigger={true} />}
```

Add to top imports if not already there:

```tsx
import { audio } from '@/lib/audio';
```

- [ ] **Step 2: number-sense.tsx**

Same pattern. Find:

```tsx
recordMiniGameResult({
  gameId: 'number-sense',
  score,
  xp,
}).catch(() => {});
```

Change to:

```tsx
recordMiniGameResult({
  gameId: 'number-sense',
  score,
  xp,
}).then((res) => {
  if (res.leveledUp) {
    setLeveledUp(true);
    audio.levelup();
  }
}).catch(() => {});
```

Add state + import + render same as Task 5 Step 1.

- [ ] **Step 3: memory-match.tsx**

Same. The recorder call is in the existing useEffect. Reset `setLeveledUp(false)` in `onPlayAgain` alongside the existing resets:

```tsx
onPlayAgain={() => {
  setSeq([]); setAttempt([]); setScore(0); setRound(1);
  recordedRef.current = false;
  setLeveledUp(false);
}}
```

- [ ] **Step 4: reaction-tap.tsx**

Same.

- [ ] **Step 5: road-rush.tsx**

Same. In the `restart` handler, add `setLeveledUp(false)`:

```tsx
const restart = () => {
  setState(createInitialState());
  setPhase('idle');
  setSeconds(ROUND_SECONDS);
  recordedRef.current = false;
  setLeveledUp(false);
};
```

- [ ] **Step 6: Typecheck + tests**

```
cd /Users/basusingh/Desktop/Mob_App
npx tsc --noEmit 2>&1 | tail -5
npm test --silent 2>&1 | tail -6
```

Expected: tsc clean; 114/114 tests passing.

- [ ] **Step 7: Commit**

```bash
git add app/game/word-sprint.tsx app/game/number-sense.tsx app/game/memory-match.tsx app/game/reaction-tap.tsx app/game/road-rush.tsx
git commit -m "feat(games): level-up confetti + audio for all 5 mini-games (Brain Rush parity)"
```

---

## Task 6: `usePersonalBestStore` + tests

**Files:**
- Create: `store/usePersonalBestStore.ts`
- Test: `__tests__/personal-best.test.ts`

- [ ] **Step 1: Failing tests at `__tests__/personal-best.test.ts`**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePersonalBestStore } from '@/store/usePersonalBestStore';

beforeEach(async () => {
  await AsyncStorage.clear();
  usePersonalBestStore.setState({ bests: {}, hydrated: true });
});

describe('usePersonalBestStore', () => {
  test('first score sets the best for that game', () => {
    const r = usePersonalBestStore.getState().recordScore('word-sprint', 100);
    expect(r.wasNewBest).toBe(true);
    expect(r.previousBest).toBe(0);
    expect(usePersonalBestStore.getState().bests['word-sprint'].bestScore).toBe(100);
  });

  test('higher score replaces the existing best', () => {
    usePersonalBestStore.getState().recordScore('word-sprint', 100);
    const r = usePersonalBestStore.getState().recordScore('word-sprint', 250);
    expect(r.wasNewBest).toBe(true);
    expect(r.previousBest).toBe(100);
    expect(usePersonalBestStore.getState().bests['word-sprint'].bestScore).toBe(250);
  });

  test('lower score is a no-op (best stays)', () => {
    usePersonalBestStore.getState().recordScore('word-sprint', 250);
    const r = usePersonalBestStore.getState().recordScore('word-sprint', 100);
    expect(r.wasNewBest).toBe(false);
    expect(r.previousBest).toBe(250);
    expect(usePersonalBestStore.getState().bests['word-sprint'].bestScore).toBe(250);
  });

  test('equal score is a no-op (tie is not a new best)', () => {
    usePersonalBestStore.getState().recordScore('word-sprint', 100);
    const r = usePersonalBestStore.getState().recordScore('word-sprint', 100);
    expect(r.wasNewBest).toBe(false);
  });

  test('per-game tracking is independent', () => {
    usePersonalBestStore.getState().recordScore('word-sprint', 100);
    usePersonalBestStore.getState().recordScore('number-sense', 50);
    const b = usePersonalBestStore.getState().bests;
    expect(b['word-sprint'].bestScore).toBe(100);
    expect(b['number-sense'].bestScore).toBe(50);
  });
});
```

- [ ] **Step 2: Run failing tests**

```
cd /Users/basusingh/Desktop/Mob_App
npx jest __tests__/personal-best.test.ts --silent 2>&1 | tail -8
```

Expected: 5 failures with "Cannot find module".

- [ ] **Step 3: Create `store/usePersonalBestStore.ts`**

```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GameId } from '@/constants/games';

interface PersonalBestEntry {
  bestScore: number;
  bestAt: string;  // ISO timestamp
}

export type PersonalBests = Partial<Record<GameId, PersonalBestEntry>>;

export interface PersonalBestState {
  bests: PersonalBests;
  hydrated: boolean;
  recordScore: (
    gameId: GameId,
    score: number,
  ) => { wasNewBest: boolean; previousBest: number };
  _setHydrated: (v: boolean) => void;
}

export const usePersonalBestStore = create<PersonalBestState>()(
  persist(
    (set, get) => ({
      bests: {},
      hydrated: false,

      recordScore: (gameId, score) => {
        const current = get().bests[gameId];
        const previousBest = current?.bestScore ?? 0;
        if (score > previousBest) {
          set({
            bests: {
              ...get().bests,
              [gameId]: { bestScore: score, bestAt: new Date().toISOString() },
            },
          });
          return { wasNewBest: true, previousBest };
        }
        return { wasNewBest: false, previousBest };
      },

      _setHydrated: (v) => set({ hydrated: v }),
    }),
    {
      name: '@brainstreak/personal-bests',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ bests: s.bests }),
      onRehydrateStorage: () => (s) => s?._setHydrated(true),
    },
  ),
);
```

- [ ] **Step 4: Run tests to verify pass**

```
cd /Users/basusingh/Desktop/Mob_App
npx jest __tests__/personal-best.test.ts --silent 2>&1 | tail -6
```

Expected: 5 passes.

- [ ] **Step 5: Full suite**

```
cd /Users/basusingh/Desktop/Mob_App
npm test --silent 2>&1 | tail -6
```

Expected: 119/119 tests passing (114 + 5 new).

- [ ] **Step 6: Typecheck**

```
cd /Users/basusingh/Desktop/Mob_App
npx tsc --noEmit 2>&1 | tail -5
```

- [ ] **Step 7: Commit**

```bash
git add store/usePersonalBestStore.ts __tests__/personal-best.test.ts
git commit -m "feat: usePersonalBestStore — per-game best score persistence"
```

---

## Task 7: Wire personal-best into recorder + GameOverCard + Profile

**Files:**
- Modify: `lib/games/recordMiniGame.ts`
- Modify: `store/useGameStore.ts` (Brain Rush path)
- Modify: `components/games/GameOverCard.tsx`
- Modify: All 5 mini-game screens
- Modify: `app/(tabs)/profile.tsx`

- [ ] **Step 1: Update `lib/games/recordMiniGame.ts`**

Add import:

```ts
import { usePersonalBestStore } from '@/store/usePersonalBestStore';
```

Extend `RecordedResult`:

```ts
export interface RecordedResult {
  leveledUp: boolean;
  freshUnlocks: string[];
  wasNewBest: boolean;
  previousBest: number;
}
```

Inside `recordMiniGameResult`, after the existing `useUserStore.setState({ profile, streak })` line, add:

```ts
const pb = usePersonalBestStore.getState().recordScore(r.gameId, r.score);
```

Update the return:

```ts
return {
  leveledUp: updatedProfile.level > previousLevel,
  freshUnlocks: fresh,
  wasNewBest: pb.wasNewBest,
  previousBest: pb.previousBest,
};
```

- [ ] **Step 2: Update `store/useGameStore.ts::finishGame` for Brain Rush**

Find the existing `finishGame` action. Near the end (after the achievement evaluation), insert:

```ts
// Brain Rush personal best
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { usePersonalBestStore } = require('@/store/usePersonalBestStore');
const pb = usePersonalBestStore.getState().recordScore('brain-rush', totalScore);
```

And update the atomic `set` to include the new best signal (if you want to surface a "NEW BEST!" banner on the Brain Rush recap, which we will — same pattern as mini-games):

```ts
set({
  phase: 'gameover',
  xpEarned: xp,
  leveledUp: updatedProfile.level > previousLevel,
  newBest: pb.wasNewBest,
  previousBest: pb.previousBest,
  ...(fresh.length > 0 ? { pendingAchievementIds: fresh } : {}),
});
```

Add to GameState shape near the existing fields:

```ts
newBest: boolean;
previousBest: number;
```

Initialize defaults to `false` and `0` respectively. Reset them in `resetGame()`.

- [ ] **Step 3: Update `components/games/GameOverCard.tsx`**

Add optional props:

```ts
interface Props {
  title: string;
  score: number;
  stats: Stat[];
  onPlayAgain: () => void;
  onExit: () => void;
  newBest?: boolean;
  delta?: number;       // current score - previousBest, only meaningful if newBest
  leveledUp?: boolean;  // controls confetti
}
```

In the render, before the action `row`, add:

```tsx
{newBest && (
  <View style={styles.newBest}>
    <Text style={styles.newBestText}>NEW BEST!{delta != null && delta > 0 ? ` +${delta}` : ''}</Text>
  </View>
)}
```

Add to styles:

```ts
newBest: {
  backgroundColor: Colors.gold,
  paddingHorizontal: Spacing.md,
  paddingVertical: 6,
  borderRadius: Radius.sm,
  marginTop: 4,
  alignSelf: 'center',
},
newBestText: {
  color: '#FFFFFF',
  fontSize: FontSize.sm,
  fontFamily: 'BricolageGrotesque_700Bold',
  letterSpacing: 0.5,
},
```

Mount ConfettiBurst inside the card when `leveledUp`:

```tsx
{leveledUp && <ConfettiBurst trigger={true} />}
```

Add import:

```tsx
import { ConfettiBurst } from '@/components/ConfettiBurst';
```

- [ ] **Step 4: Update each mini-game screen to pass the new props**

For each of 5 game screens, expand the recorder `.then` to capture `wasNewBest` + `previousBest`, store in component state, pass to GameOverCard.

Example (word-sprint.tsx):

```tsx
const [leveledUp, setLeveledUp] = useState(false);
const [newBest, setNewBest] = useState(false);
const [prevBest, setPrevBest] = useState(0);

// in the recorder useEffect:
recordMiniGameResult({...}).then((res) => {
  if (res.leveledUp) {
    setLeveledUp(true);
    audio.levelup();
  }
  if (res.wasNewBest) {
    setNewBest(true);
    setPrevBest(res.previousBest);
  }
}).catch(() => {});

// in render:
<GameOverCard
  title="Time!"
  score={score}
  stats={[...]}
  onPlayAgain={() => router.replace('/game/word-sprint')}
  onExit={() => router.replace('/play')}
  newBest={newBest}
  delta={score - prevBest}
  leveledUp={leveledUp}
/>
```

Repeat for number-sense, memory-match, reaction-tap, road-rush — including the in-place restart resets for the games that have them (memory-match, road-rush).

Remove the previously-mounted standalone `<ConfettiBurst>` from Task 5; it now lives INSIDE GameOverCard.

- [ ] **Step 5: Profile "Personal bests" section**

In `app/(tabs)/profile.tsx`, add imports:

```tsx
import { usePersonalBestStore } from '@/store/usePersonalBestStore';
import { GAMES } from '@/constants/games';
```

Read state:

```tsx
const bests = usePersonalBestStore((s) => s.bests);
```

In the render, after the Stats `<MotionView>` block, add:

```tsx
<MotionView entering={FadeInDown.delay(180).springify()}>
  <SectionHeader title="Personal bests" />
  <View style={styles.bestsGrid}>
    {GAMES.map((g) => {
      const b = bests[g.id];
      return (
        <View key={g.id} style={styles.bestCard}>
          <View style={[styles.bestMarker, { backgroundColor: g.color }]} />
          <Text style={styles.bestTitle} numberOfLines={1}>{g.title}</Text>
          <Text style={styles.bestValue}>{b ? b.bestScore.toLocaleString() : '—'}</Text>
        </View>
      );
    })}
  </View>
</MotionView>
```

Add styles:

```ts
bestsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
bestCard: {
  flexBasis: '31%',
  flexGrow: 1,
  padding: Spacing.md,
  borderRadius: Radius.md,
  backgroundColor: Colors.bgCard,
  borderWidth: 1,
  borderColor: Colors.border,
  gap: 4,
},
bestMarker: { width: 18, height: 3, borderRadius: 2 },
bestTitle: { fontSize: FontSize.xs, color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_600SemiBold' },
bestValue: { fontSize: FontSize.lg, color: Colors.textPrimary, fontFamily: 'BricolageGrotesque_800ExtraBold' },
```

- [ ] **Step 6: Typecheck + tests**

```
cd /Users/basusingh/Desktop/Mob_App
npx tsc --noEmit 2>&1 | tail -5
npm test --silent 2>&1 | tail -6
```

Expected: tsc clean; 119/119 tests still pass (no new tests added in this task; integration covered by e2e in Task 15).

- [ ] **Step 7: Commit**

```bash
git add lib/games/recordMiniGame.ts store/useGameStore.ts components/games/GameOverCard.tsx app/game/*.tsx app/\(tabs\)/profile.tsx
git commit -m "feat(games): personal best tracking on game-over + Profile section"
```

---

## Task 8: Onboarding progress dots

**Files:**
- Create: `components/OnboardingDots.tsx`
- Modify: `app/onboarding/welcome.tsx`, `app/onboarding/username.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/OnboardingDots.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';
import { Colors, Spacing } from '@/constants/theme';

interface Props {
  step: number;        // 1-based
  total: number;
}

interface DotProps { active: boolean }

function Dot({ active }: DotProps) {
  const width = useSharedValue(active ? 24 : 8);

  useEffect(() => {
    width.value = withTiming(active ? 24 : 8, { duration: 200 });
  }, [active]);

  const animStyle = useAnimatedStyle(() => ({ width: width.value }));

  return (
    <Animated.View
      style={[
        styles.dot,
        animStyle,
        { backgroundColor: active ? Colors.primary : Colors.borderBright },
      ]}
    />
  );
}

export function OnboardingDots({ step, total }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <Dot key={i} active={i + 1 === step} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.xs, alignItems: 'center' },
  dot: { height: 8, borderRadius: 4 },
});
```

- [ ] **Step 2: Mount on Welcome**

In `app/onboarding/welcome.tsx`, add import:

```tsx
import { OnboardingDots } from '@/components/OnboardingDots';
```

Inside the body, at the top (right after the SafeAreaView opens), add:

```tsx
<View style={{ alignItems: 'center', marginTop: Spacing.lg, marginBottom: Spacing.md }}>
  <OnboardingDots step={1} total={2} />
</View>
```

If the welcome body uses a flex centered layout, place the dots above the brand mark to give them room. The exact insertion point: find `<View style={styles.body}>` and make `<OnboardingDots>` the first child.

- [ ] **Step 3: Mount on Username**

In `app/onboarding/username.tsx`, add import + same wrapper, with `step={2}`. Replace the existing "Last step" Text element or place the dots above it:

```tsx
<OnboardingDots step={2} total={2} />
<Text style={styles.step}>Last step</Text>
```

- [ ] **Step 4: Typecheck + tests**

```
cd /Users/basusingh/Desktop/Mob_App
npx tsc --noEmit 2>&1 | tail -5
npm test --silent 2>&1 | tail -6
```

Expected: tsc clean; 119/119 tests passing.

- [ ] **Step 5: Commit**

```bash
git add components/OnboardingDots.tsx app/onboarding/welcome.tsx app/onboarding/username.tsx
git commit -m "feat(ui): 2-dot onboarding progress indicator"
```

---

## Task 9: Settings completeness audit

**Files:**
- Read-only audit (no production code change unless something is missing).

The state-side already exposes `soundOn`, `hapticsOn`, `dailyReminderTime`, `onboarded`. Profile already wires `soundOn` and `hapticsOn` via `<SettingsRow>` (verified earlier — Profile lines around 215-225 reference both). Daily reminder is in `app/settings/reminder.tsx`.

- [ ] **Step 1: Verify every settings field is exposed in UI**

```bash
cd /Users/basusingh/Desktop/Mob_App
grep -n "soundOn\|hapticsOn\|dailyReminderTime" app/\(tabs\)/profile.tsx app/settings/reminder.tsx
```

Expected: every settings field except `onboarded` (internal) has a corresponding UI control somewhere.

- [ ] **Step 2: If any setting is exposed in state but not UI, add a SettingsRow for it.**

Almost certainly no-op. If you find a gap, expose it as a `SettingsRow` in `app/(tabs)/profile.tsx` matching the existing soundOn pattern.

- [ ] **Step 3: Add a documenting comment to `store/useSettingsStore.ts`**

At the top of the file, just below the imports:

```ts
// Settings state surface. Every field except `hydrated` MUST be exposed in
// the Profile screen OR a dedicated settings sub-screen — kept in sync with
// the audit done on YYYY-MM-DD as part of the v1.1 polish spec.
//
//   soundOn               → Profile SettingsRow "Sound effects"
//   hapticsOn             → Profile SettingsRow "Haptics"
//   dailyReminderTime     → /settings/reminder
//   onboarded             → internal, set by onboarding flow
//   lastDailyChallengeTappedDate → set by DailyChallengeCard (no UI exposure)
```

Replace YYYY-MM-DD with the actual date.

- [ ] **Step 4: Commit (even if no production code changed — comment-only)**

```bash
git add store/useSettingsStore.ts
git commit -m "docs(settings): audit complete — all state fields exposed in UI"
```

---

## Task 10: Tab bar slide-fade animation

**Files:**
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Read the current `_layout.tsx`**

```bash
cat /Users/basusingh/Desktop/Mob_App/app/\(tabs\)/_layout.tsx | head -40
```

- [ ] **Step 2: Add the tab-switch animation**

`expo-router`'s `Tabs` uses `react-native-screens`. The supported options field is `animation: 'shift'` in expo-router v3+. Update the `<Tabs screenOptions={{...}}>` block:

```tsx
<Tabs
  screenOptions={{
    headerShown: false,
    animation: 'shift',
    /* preserve other existing options like tabBarStyle */
  }}
>
```

If `animation: 'shift'` causes a typecheck error (older version), fall back: wrap each tab screen's render root in a `<MotionView entering={FadeInRight.duration(200)}>`. Implement only one of the two — try `'shift'` first.

- [ ] **Step 3: Typecheck + tests**

```
cd /Users/basusingh/Desktop/Mob_App
npx tsc --noEmit 2>&1 | tail -5
npm test --silent 2>&1 | tail -6
```

- [ ] **Step 4: Visual verification**

Re-export and reload `localhost:8090`. Tap Home → Play → Profile and confirm the tab transition feels like a slide-fade, not a flat instant swap.

- [ ] **Step 5: Commit**

```bash
git add app/\(tabs\)/_layout.tsx
git commit -m "feat(ui): tab bar slide-fade animation between Home/Play/Profile"
```

---

## Task 11: GameOverCard flourish (CountingNumber + stat stagger)

**Files:**
- Modify: `components/games/GameOverCard.tsx`

- [ ] **Step 1: Replace the static score with CountingNumber**

Find:

```tsx
<Text style={styles.score}>{score.toLocaleString()}</Text>
```

Replace with:

```tsx
<CountingNumber
  value={score}
  durationMs={800}
  formatter={(n) => n.toLocaleString()}
  style={styles.score}
/>
```

Add import:

```tsx
import { CountingNumber } from '@/components/CountingNumber';
```

- [ ] **Step 2: Stagger the stat rows**

Find:

```tsx
<View style={styles.stats}>
  {stats.map((s) => (
    <View key={s.label} style={styles.stat}>
      <Text style={styles.statValue}>{s.value}</Text>
      <Text style={styles.statLabel}>{s.label}</Text>
    </View>
  ))}
</View>
```

Replace with:

```tsx
<View style={styles.stats}>
  {stats.map((s, i) => (
    <MotionView
      key={s.label}
      entering={FadeInRight.delay(150 + i * 80).springify()}
      style={styles.stat}
    >
      <Text style={styles.statValue}>{s.value}</Text>
      <Text style={styles.statLabel}>{s.label}</Text>
    </MotionView>
  ))}
</View>
```

Add imports:

```tsx
import { MotionView } from '@/components/MotionView';
import { FadeInRight } from 'react-native-reanimated';
```

- [ ] **Step 3: Typecheck + tests**

```
cd /Users/basusingh/Desktop/Mob_App
npx tsc --noEmit 2>&1 | tail -5
npm test --silent 2>&1 | tail -6
```

Expected: 119/119 tests passing.

- [ ] **Step 4: Commit**

```bash
git add components/games/GameOverCard.tsx
git commit -m "feat(ui): GameOverCard flourish — counting-up score + staggered stat rows"
```

---

## Task 12: Profile badge live unlock animation

**Files:**
- Modify: `app/(tabs)/profile.tsx`

- [ ] **Step 1: Track newly-unlocked badges on focus**

Add to imports:

```tsx
import { useFocusEffect } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, withSequence } from 'react-native-reanimated';
```

Inside `ProfileScreen()`, alongside the existing `unlocked` read:

```tsx
const prevUnlockedRef = useRef<Set<string> | null>(null);
const [newlyUnlocked, setNewlyUnlocked] = useState<Set<string>>(new Set());

useFocusEffect(
  React.useCallback(() => {
    const curr = new Set(unlocked);
    if (prevUnlockedRef.current == null) {
      // First focus: seed the ref with the current state. Don't animate
      // existing unlocks as "newly unlocked".
      prevUnlockedRef.current = curr;
      return;
    }
    const fresh = new Set<string>();
    curr.forEach((id) => {
      if (!prevUnlockedRef.current!.has(id)) fresh.add(id);
    });
    if (fresh.size > 0) {
      setNewlyUnlocked(fresh);
      const t = setTimeout(() => setNewlyUnlocked(new Set()), 1400);
      prevUnlockedRef.current = curr;
      return () => clearTimeout(t);
    }
    prevUnlockedRef.current = curr;
  }, [unlocked])
);
```

- [ ] **Step 2: Replace the badge `<View>` wrapper with an animated wrapper that springs when newly unlocked**

Find the existing `ACHIEVEMENTS.map((a) => { ... <View style={[styles.badge, ...]}> ... })`. Wrap the `<View>` body in `<AnimatedBadge isUnlocked={isUnlocked} highlight={newlyUnlocked.has(a.id)} ...>`. Or inline:

```tsx
{ACHIEVEMENTS.map((a) => {
  const isUnlocked = unlocked.includes(a.id);
  const isHighlight = newlyUnlocked.has(a.id);
  return (
    <BadgeItem
      key={a.id}
      achievement={a}
      isUnlocked={isUnlocked}
      isHighlight={isHighlight}
    />
  );
})}
```

Define `BadgeItem` as a local component above the `ProfileScreen` function:

```tsx
function BadgeItem({
  achievement,
  isUnlocked,
  isHighlight,
}: {
  achievement: { id: string; title: string; description: string };
  isUnlocked: boolean;
  isHighlight: boolean;
}) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (isHighlight) {
      scale.value = withSequence(
        withSpring(1.1, { damping: 8, stiffness: 200 }),
        withSpring(1, { damping: 12, stiffness: 180 })
      );
    }
  }, [isHighlight]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.badge,
        isUnlocked ? styles.badgeUnlocked : styles.badgeLocked,
        isHighlight && styles.badgeGlow,
        animStyle,
      ]}
    >
      <View style={[styles.badgeMark, { backgroundColor: isUnlocked ? Colors.primary : Colors.borderBright }]} />
      <Text style={[styles.badgeTitle, !isUnlocked && styles.badgeTitleLocked]} numberOfLines={1}>
        {achievement.title}
      </Text>
      <Text style={styles.badgeDesc} numberOfLines={2}>
        {achievement.description}
      </Text>
      <Text style={styles.badgeState}>{isUnlocked ? 'Unlocked' : 'Locked'}</Text>
    </Animated.View>
  );
}
```

Add a new style:

```ts
badgeGlow: {
  borderColor: Colors.gold,
  borderWidth: 2,
  shadowColor: Colors.gold,
  shadowOpacity: 0.5,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 0 },
},
```

- [ ] **Step 3: Typecheck + tests**

```
cd /Users/basusingh/Desktop/Mob_App
npx tsc --noEmit 2>&1 | tail -5
npm test --silent 2>&1 | tail -6
```

Expected: 119/119 tests passing.

- [ ] **Step 4: Commit**

```bash
git add app/\(tabs\)/profile.tsx
git commit -m "feat(ui): Profile live badge unlock animation (spring + glow on focus diff)"
```

---

## Task 13: `RollingNumber` + streak digit roll

**Files:**
- Create: `components/RollingNumber.tsx`
- Modify: `components/StreakBadge.tsx`
- Modify: `app/(tabs)/index.tsx` (hero streak digit)
- Modify: `app/(tabs)/profile.tsx` (streak card big number)

- [ ] **Step 1: Create `components/RollingNumber.tsx`**

```tsx
import React, { useEffect, useState, useRef } from 'react';
import { Text, TextStyle, View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface Props {
  value: number;
  style?: TextStyle | TextStyle[];
  durationMs?: number;
}

// Number that rolls/flips on change. Renders two stacked Text elements; on
// value change, the outgoing element slides up + fades out while the
// incoming element slides up from below into the slot.
export function RollingNumber({ value, style, durationMs = 300 }: Props) {
  const [prev, setPrev] = useState(value);
  const [next, setNext] = useState(value);
  const [animKey, setAnimKey] = useState(0);
  const y = useSharedValue(0);
  const opacity = useSharedValue(1);
  const incomingY = useSharedValue(0);
  const incomingOpacity = useSharedValue(0);
  const valueRef = useRef(value);

  useEffect(() => {
    if (value === valueRef.current) return;
    setPrev(valueRef.current);
    setNext(value);
    valueRef.current = value;
    const direction = value > prev ? 1 : -1;  // up for increment, down for decrement
    y.value = 0;
    opacity.value = 1;
    incomingY.value = direction * 16;
    incomingOpacity.value = 0;
    setAnimKey((k) => k + 1);
    y.value = withTiming(-direction * 16, { duration: durationMs, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(0, { duration: durationMs });
    incomingY.value = withTiming(0, { duration: durationMs, easing: Easing.out(Easing.cubic) });
    incomingOpacity.value = withTiming(1, { duration: durationMs });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const outgoingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
    opacity: opacity.value,
  }));
  const incomingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: incomingY.value }],
    opacity: incomingOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.Text key={`out-${animKey}`} style={[style as any, styles.layer, outgoingStyle]}>
        {prev}
      </Animated.Text>
      <Animated.Text key={`in-${animKey}`} style={[style as any, incomingStyle]}>
        {next}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative' },
  layer: { position: 'absolute', left: 0, right: 0 },
});
```

- [ ] **Step 2: Use it in StreakBadge for the number display**

Open `components/StreakBadge.tsx`. Find the existing `<Text>` element that renders `streak` and replace with `<RollingNumber value={streak} style={...} />`. Keep the same style.

Add import:

```tsx
import { RollingNumber } from '@/components/RollingNumber';
```

- [ ] **Step 3: Use it in the Home hero**

In `app/(tabs)/index.tsx`, find the existing hero streak number render. Replace with `<RollingNumber value={streak.current} style={styles.heroStreakNumber} />`.

- [ ] **Step 4: Use it in Profile streak card**

In `app/(tabs)/profile.tsx`, find the `<Text style={styles.streakBigNum}>{streak.current}</Text>` and replace with the RollingNumber wrapper.

- [ ] **Step 5: Typecheck + tests**

```
cd /Users/basusingh/Desktop/Mob_App
npx tsc --noEmit 2>&1 | tail -5
npm test --silent 2>&1 | tail -6
```

- [ ] **Step 6: Commit**

```bash
git add components/RollingNumber.tsx components/StreakBadge.tsx app/\(tabs\)/index.tsx app/\(tabs\)/profile.tsx
git commit -m "feat(ui): RollingNumber for streak digit transitions"
```

---

## Task 14: Welcome B-logo pulse + Daily Challenge wiggle

**Files:**
- Modify: `app/onboarding/welcome.tsx` (B-logo pulse)
- Modify: `components/DailyChallengeCard.tsx` (wiggle)
- Modify: `store/useSettingsStore.ts` (add `lastDailyChallengeTappedDate`)

- [ ] **Step 1: Add `lastDailyChallengeTappedDate` to `useSettingsStore`**

In `store/useSettingsStore.ts`, find `SettingsState`:

```ts
export interface SettingsState {
  soundOn: boolean;
  hapticsOn: boolean;
  dailyReminderTime: string | null;
  onboarded: boolean;
  hydrated: boolean;
  // ...
}
```

Add new field + setter:

```ts
  lastDailyChallengeTappedDate: string | null;
  setLastDailyChallengeTappedDate: (value: string | null) => void;
```

In the create body, add default:

```ts
  lastDailyChallengeTappedDate: null,
  setLastDailyChallengeTappedDate: (value) => set({ lastDailyChallengeTappedDate: value }),
```

In the `partialize`:

```ts
partialize: (state) => ({
  soundOn: state.soundOn,
  hapticsOn: state.hapticsOn,
  dailyReminderTime: state.dailyReminderTime,
  onboarded: state.onboarded,
  lastDailyChallengeTappedDate: state.lastDailyChallengeTappedDate,
}),
```

- [ ] **Step 2: Wire wiggle in DailyChallengeCard**

In `components/DailyChallengeCard.tsx`, add imports:

```tsx
import { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { useSettingsStore } from '@/store/useSettingsStore';
```

Inside the component:

```tsx
const lastTapped = useSettingsStore((s) => s.lastDailyChallengeTappedDate);
const setLastTapped = useSettingsStore((s) => s.setLastDailyChallengeTappedDate);
const today = todayISO();
const isFreshChallenge = lastTapped !== today;

const rot = useSharedValue(0);
useEffect(() => {
  if (!isFreshChallenge) {
    cancelAnimation(rot);
    rot.value = 0;
    return;
  }
  rot.value = withRepeat(
    withSequence(
      withTiming(8, { duration: 110 }),
      withTiming(-8, { duration: 110 }),
      withTiming(0, { duration: 110 }),
      withTiming(0, { duration: 3500 }),
    ),
    -1,
    false,
  );
  return () => { cancelAnimation(rot); };
}, [isFreshChallenge]);

const animStyle = useAnimatedStyle(() => ({
  transform: [{ rotateZ: `${rot.value}deg` }],
}));
```

Wrap the existing `<Button>` element in `<Animated.View style={animStyle}>`. On the Button onPress handler, ALSO call `setLastTapped(today)`:

```tsx
<Animated.View style={animStyle}>
  <Button
    label="Start"
    onPress={() => {
      setLastTapped(today);
      router.push(path as any);
    }}
  />
</Animated.View>
```

- [ ] **Step 3: Welcome B-logo pulse**

In `app/onboarding/welcome.tsx`, find the existing float-animation shared value and `floatStyle`. Add a second shared value for pulse:

```tsx
const pulse = useSharedValue(1);
React.useEffect(() => {
  pulse.value = withRepeat(
    withTiming(1.06, { duration: 1750, easing: Easing.inOut(Easing.sin) }),
    -1,
    true,
  );
}, []);
```

Update `floatStyle` to combine both:

```tsx
const floatStyle = useAnimatedStyle(() => ({
  transform: [
    { translateY: float.value },
    { scale: pulse.value },
  ],
}));
```

Make sure `withRepeat`, `withTiming`, `Easing` are in the imports (most likely already there).

- [ ] **Step 4: Typecheck + tests**

```
cd /Users/basusingh/Desktop/Mob_App
npx tsc --noEmit 2>&1 | tail -5
npm test --silent 2>&1 | tail -6
```

Expected: 119/119 tests passing.

- [ ] **Step 5: Commit**

```bash
git add store/useSettingsStore.ts components/DailyChallengeCard.tsx app/onboarding/welcome.tsx
git commit -m "feat(ui): Welcome B-logo pulse + Daily Challenge wiggle until tapped today"
```

---

## Task 15: Final regression sweep

**Files:** none modified — verification only.

- [ ] **Step 1: tsc + tests**

```
cd /Users/basusingh/Desktop/Mob_App
npx tsc --noEmit 2>&1 | tail -5
npm test --silent 2>&1 | tail -6
```

Expected: tsc clean, **119/119 tests** passing across 18 suites.

- [ ] **Step 2: Web export**

```
cd /Users/basusingh/Desktop/Mob_App
npm run web:export 2>&1 | tail -4
```

Expected: "wrote SPA fallback → 200.html / 404.html" line.

- [ ] **Step 3: Restart server from `dist/`**

```bash
lsof -ti:8090 | xargs -r kill -9 2>/dev/null
sleep 1
cd /Users/basusingh/Desktop/Mob_App/dist
npx --yes serve -l tcp://0.0.0.0:8090 --no-clipboard >/dev/null 2>&1 &
cd /Users/basusingh/Desktop/Mob_App
sleep 3
until curl -sf -o /dev/null http://127.0.0.1:8090/; do sleep 0.3; done
echo "UP"
```

- [ ] **Step 4: Run e2e**

```
node /Users/basusingh/Desktop/Mob_App/scripts/e2e-test.js 2>&1 | tail -8
```

Expected: every flow passes ("Errors: 1" — only the recoverable React #418 from Reanimated SSR).

- [ ] **Step 5: Run QA full suite**

```
BASE=http://127.0.0.1:8090 node /Users/basusingh/Desktop/Mob_App/scripts/qa-full.js 2>&1 | tail -10
```

Expected: 14/15 PASS (the offline-cold-nav fail is web-only and a known non-blocker).

- [ ] **Step 6: Curl every route**

```bash
for p in / /play /profile /onboarding/welcome /game/session /game/word-sprint /game/number-sense /game/memory-match /game/reaction-tap /game/road-rush /manifest.webmanifest; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:8090${p}")
  echo "  $code  $p"
done
```

Expected: every line starts with `200`.

- [ ] **Step 7: Visual smoke** — open `http://localhost:8090` in your browser and verify:
  - Welcome shows the **B logo pulsing** (subtle scale up/down) on top of the existing float
  - Welcome and Username screens show the **2 dots** progress indicator
  - Home Daily Challenge button **wiggles** until tapped, then stops for the day
  - Playing through a mini-game and reaching game-over: the score **counts up** from 0; stat rows **stagger** in from the right; if leveled up: **confetti**; if a new best: **"NEW BEST! +N" gold badge**
  - Profile: "Personal bests" section shows the 6 games with whatever scores you've achieved
  - Profile: switching tabs feels like a **slide**, not an instant fade

- [ ] **Step 8: Audio smoke** — open the page on your phone (LAN URL) and confirm sounds play on:
  - any button tap
  - selecting a category
  - countdown ticks
  - correct/wrong answer
  - level up (play through enough rounds to trigger one)
  - crash (Road Rush)

Sound on web is procedural (Web Audio). Native plays the mp3s after eas-build.

- [ ] **Step 9: Final milestone commit**

```bash
git commit --allow-empty -m "milestone: v1.1 polish complete — sound effects, pausable timers, level-up celebrations, personal bests, animation polish"
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task(s) |
|---|---|
| §4.1 Native sound effects | Task 2 ✅ |
| §4.2 Pausable round timer | Task 3 (hook) + Task 4 (apply) ✅ |
| §4.3 Mini-game level-up celebration | Task 5 + Task 7 (lives in GameOverCard now) ✅ |
| §4.4 Per-game personal best | Task 6 (store) + Task 7 (recorder + UI) ✅ |
| §4.5 Onboarding progress dots | Task 8 ✅ |
| §4.6 Settings completeness | Task 9 ✅ |
| §5.1 Tab bar slide-fade | Task 10 ✅ |
| §5.2 GameOverCard flourish | Task 11 + Task 7 (newBest badge + leveledUp confetti) ✅ |
| §5.3 Profile badge live unlock | Task 12 ✅ |
| §5.4 Streak digit roll (RollingNumber) | Task 13 ✅ |
| §5.5 Welcome B-logo pulse | Task 14 ✅ |
| §5.6 Daily Challenge wiggle | Task 14 ✅ |
| §6 constants/games.ts refactor | Task 1 ✅ |
| §7 Tests | Task 2 (audio), Task 3 (pausable), Task 6 (personal-best) + Task 15 regression ✅ |
| §8 Rollout one-phase-per-commit | All 15 tasks each end in a commit ✅ |

No gaps.

**Placeholder scan:** clean — no TBD/TODO/FIXME/"add error handling"-style fluff. Every step has explicit code.

**Type consistency:**
- `GameId` defined in `constants/games.ts` (Task 1); same type used in `usePersonalBestStore` (Task 6) and `recordMiniGameResult` extension (Task 7). ✅
- `RecordedResult` shape extended in Task 7 with `wasNewBest` + `previousBest`; all 5 mini-game callers consume the same. ✅
- `GameOverCard` new props (`newBest?`, `delta?`, `leveledUp?`) all optional and consistently passed in Task 7 callers. ✅
- `PersonalBests` keyed by `GameId` — consistent. ✅
- `OnboardingDots` Props (`step`, `total`) used in both welcome.tsx and username.tsx mounts. ✅
- `RollingNumber` Props (`value`, `style?`, `durationMs?`) consistently used by StreakBadge, Home hero, Profile streak card. ✅
- `lastDailyChallengeTappedDate: string | null` matches `todayISO()` format used in `lib/storage.ts`. ✅

No drift. Plan is internally consistent and faithful to the spec.

---

## Execution

Plan complete and saved to `docs/superpowers/plans/2026-05-16-functional-and-animation-polish.md`.

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Same pattern as yesterday's plan that landed cleanly.

**2. Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

Which approach?
