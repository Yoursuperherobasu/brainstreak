# Functional Gaps + Animation Polish — Design Spec

**Date:** 2026-05-16
**Status:** Approved
**Author:** Claude (with user)
**Project:** BrainStreak (this repo, Mob_App)

**Predecessors:**
- `docs/superpowers/specs/2026-05-09-brainstreak-design.md` — original v1 design.
- `docs/superpowers/specs/2026-05-15-mini-game-persistence-and-animations.md` — shipped persistence + first animation pass.

---

## 1. Background

BrainStreak is feature-complete and tests pass at 106/106. The previous spec closed the major architectural gaps (mini-game persistence, unified achievements, tinted AnimatedBackground per game). What remains are the polish items that move it from "100% code-ready" to "feels like a 2026 Play-Store-quality app the user actually wants to open daily."

Audit of remaining gaps identified six **functional** items that a production-grade Android app should ship with (silent native audio, runaway timers when the app backgrounds, no level-up flourish on mini-games, no per-game personal best, missing onboarding progress indicator, settings completeness) and six **animation polish** items that make the UI feel alive (tab bar slide, animated game-over recap, live badge unlock animation, streak digit roll, welcome logo pulse, daily-challenge wiggle).

All twelve items are additive — no architectural rewrites. Each lands as its own commit; each is independently revertable.

---

## 2. Goals & non-goals

### Goals

- Bundle real native sound effects so the Android APK is not silent.
- Pause round timers when the user backgrounds the app; resume cleanly on return.
- Mini-game level-up triggers the same confetti + audio flourish that Brain Rush already does.
- Track and display per-game personal best.
- Visual onboarding progress (2 dots).
- Confirm every existing setting toggles its real state and is exposed in UI.
- Tab navigation has motion (not just an instant fade).
- Game-over recap feels celebratory (count-up XP, staggered stat rows, level-up confetti, new-best badge).
- Profile badges unlock live in-session with a spring-zoom (not just on next focus).
- Streak digit transitions feel intentional (roll/flip, not swap-replace).
- Welcome logo and daily-challenge CTA have subtle attention-grabbing motion.
- All existing 106/106 tests stay green. New tests cover the new logic.
- One phase per commit; revertable.

### Non-goals

- Multiplayer / leaderboards / friends.
- Ads / monetization (separate spec later).
- New games beyond the 6 already shipped.
- Cloud sync rewrite (sign-in is still hidden; anonymous-only remains the only ship path).
- Service worker for offline web (Android is the ship target).
- Architectural refactor of the phase-gated returns in `app/game/session.tsx`.

---

## 3. Architecture overview

Layered, additive:

```
┌────────────────────────────────────────────────────────────────┐
│ UI: tab bar slide, recap flourish, badge unlock pop, streak    │
│ roll, welcome pulse, daily-challenge wiggle, onboarding dots   │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ New shared components:                                         │
│ - components/RollingNumber.tsx                                 │
│ - components/OnboardingDots.tsx                                │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ New hooks:                                                     │
│ - lib/usePausableInterval.ts (AppState-aware setInterval)      │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ New stores:                                                    │
│ - store/usePersonalBestStore.ts (Zustand + AsyncStorage)       │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ Assets:                                                        │
│ - assets/sounds/{tap,select,tick,correct,wrong,levelup,        │
│   crash,bg}.mp3 — generated via ffmpeg, CC0                    │
└────────────────────────────────────────────────────────────────┘
```

---

## 4. Detailed design — Functional fixes

### 4.1 Native sound effects (mp3 bundling)

**Files:**
- New: 8 small mp3s under `assets/sounds/` (tap, select, tick, correct, wrong, levelup, crash, bg).
- Modify: `lib/audio.ts` — uncomment the `SOURCES` map entries.
- Modify: `scripts/generate-sounds.sh` (new) — ffmpeg one-liner that regenerates each file from scratch (sine sweeps + envelope). Reproducible, license-clean.

**Generation strategy:** ffmpeg synthesizes each sound as a sine-wave envelope:

```bash
# tap.mp3 — 440Hz square 60ms
ffmpeg -f lavfi -i "sine=frequency=440:duration=0.06" -af "afade=t=in:d=0.005,afade=t=out:st=0.05:d=0.01" -b:a 64k tap.mp3
# correct.mp3 — C5→E5→G5 chord arpeggio
# wrong.mp3 — descending sawtooth
# (...etc for the 8 files)
```

Each file ends up < 20 KB. Total: ~80 KB added to the AAB. Web bundle is unaffected (Web Audio path stays primary on web).

**Backward compat:** `lib/audio.ts` continues to call the same `audio.tap()` / `audio.correct()` / etc. surface. The change is purely in the SOURCES map — switching from `undefined` (silent on native) to a require() of the bundled file.

**Tests:** `__tests__/audio.test.ts` (new) verifies that `audio.tap()` returns truthy after init (player created from a real source). Doesn't play sound in jest (would need to mock `expo-audio`).

### 4.2 Pausable round timer

**Files:**
- New: `lib/usePausableInterval.ts`
- New: `__tests__/use-pausable-interval.test.ts`
- Modify: `app/game/session.tsx`, `app/game/word-sprint.tsx`, `app/game/number-sense.tsx`, `app/game/reaction-tap.tsx`, `app/game/road-rush.tsx`. (Memory Match has no round timer — uses round-by-round logic.)

**API:**

```ts
export interface PausableIntervalConfig {
  durationMs: number;       // total round duration
  tickMs: number;           // tick frequency
  onTick: (remainingMs: number) => void;
  onComplete: () => void;
  enabled: boolean;
}

export function usePausableInterval(c: PausableIntervalConfig): { reset: () => void };
```

**Algorithm:**
1. Internal state: `startedAt: number | null`, `remainingMs: number`.
2. Mount: if `enabled`, set `startedAt = Date.now()`, `remainingMs = durationMs`, start `setInterval(tick, tickMs)`.
3. Tick: compute `elapsed = Date.now() - startedAt`; `remaining = durationMs - elapsed`. If `remaining <= 0`, clear interval, call `onComplete`. Else call `onTick(remaining)`.
4. `AppState.change → background`: clear interval; capture `remainingMs = durationMs - (Date.now() - startedAt)`.
5. `AppState.change → active` (returning from background): set `startedAt = Date.now() - (durationMs - remainingMs)` (logical restart of clock so the existing tick math still works); restart `setInterval`.
6. Unmount / `enabled=false`: clear interval, remove AppState listener.
7. `reset()`: clear interval, restart with full `durationMs`.

**Tests** (using `jest.useFakeTimers()` + `AppState` mock):
- ticks at the expected cadence
- background pause stops ticks
- foreground resume continues from the right `remainingMs`
- completes when remaining hits 0
- handles rapid background/foreground oscillation
- `reset()` clears state and restarts

### 4.3 Mini-game level-up celebration

**Files:**
- Modify: `app/game/word-sprint.tsx`, `app/game/number-sense.tsx`, `app/game/memory-match.tsx`, `app/game/reaction-tap.tsx`, `app/game/road-rush.tsx`.

Each game's `recordMiniGameResult(...).then((res) => { ... })` block (or stored result via state) reads `res.leveledUp`. When true:
- mount `<ConfettiBurst>` overlay above the GameOverCard for 1.6s (reuse the existing component used by Brain Rush)
- play `audio.levelup()` once

Implementation pattern, applied to each of the 5 games:

```tsx
const [leveledUp, setLeveledUp] = useState(false);

useEffect(() => {
  if (phase !== 'over' || recordedRef.current) return;
  recordedRef.current = true;
  recordMiniGameResult({ /* … */ }).then((res) => {
    if (res.leveledUp) {
      setLeveledUp(true);
      audio.levelup();
    }
  }).catch(() => {});
}, [/* deps */]);

// in render, when phase === 'over':
{leveledUp && <ConfettiBurst />}
```

`recordedRef.current = false` is also reset in any in-place restart handlers (Memory Match, Road Rush) — same pattern from the previous spec.

### 4.4 Per-game personal best tracking

**Files:**
- New: `store/usePersonalBestStore.ts`
- New: `__tests__/personal-best.test.ts`
- Modify: `lib/games/recordMiniGame.ts` — update personal best as part of the recorder flow.
- Modify: `store/useGameStore.ts::finishGame` — same hook for Brain Rush.
- Modify: `components/games/GameOverCard.tsx` — display "Best: N" + "NEW BEST!" badge when applicable.
- Modify: `app/(tabs)/profile.tsx` — new "Personal bests" section.

**Store shape:**

```ts
export type GameId =
  | 'brain-rush' | 'word-sprint' | 'number-sense'
  | 'memory-match' | 'reaction-tap' | 'road-rush';

interface PersonalBests { [gameId: string]: { bestScore: number; bestAt: string } }

interface PersonalBestState {
  bests: PersonalBests;
  hydrated: boolean;
  recordScore: (gameId: GameId, score: number) => { wasNewBest: boolean; previousBest: number };
}
```

`recordScore` atomically compares and updates. Returns whether the new score beat the prior best AND the prior value (for "NEW BEST! +N" display).

**Persistence:** Zustand `persist` middleware, key `@brainstreak/personal-bests`, full state partialize.

**Profile section:**

```tsx
<MotionView entering={FadeInDown.delay(260).springify()}>
  <SectionHeader title="Personal bests" />
  <View style={styles.bestsGrid}>
    {GAMES.map((g) => {
      const b = bests[g.id];
      return (
        <View key={g.id} style={styles.bestCard}>
          <View style={[styles.bestMarker, { backgroundColor: g.color }]} />
          <Text style={styles.bestTitle}>{g.title}</Text>
          <Text style={styles.bestValue}>{b ? b.bestScore.toLocaleString() : '—'}</Text>
        </View>
      );
    })}
  </View>
</MotionView>
```

`GAMES` is a small static array of {id, title, color} pulled from existing CATEGORIES / mini-game tile catalog. **For consistency** this is centralized in a new constants file `constants/games.ts` so both Play tab and Profile read the same source — see §6.

### 4.5 Onboarding progress dots

**Files:**
- New: `components/OnboardingDots.tsx`
- Modify: `app/onboarding/welcome.tsx`, `app/onboarding/username.tsx` — render `<OnboardingDots step={1} total={2} />` / `step={2}`.

**Component:**

```tsx
interface Props { step: number; total: number }
export function OnboardingDots({ step, total }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            i + 1 === step ? styles.dotActive : styles.dotInactive,
          ]}
        />
      ))}
    </View>
  );
}
```

Active dot is wider (24px) and primary-colored; inactive dots are 8px circles in `Colors.borderBright`. The transition uses reanimated `withTiming` on width + bg color over 200ms.

### 4.6 Settings completeness audit

**Read-only audit task** (no production code change unless I find a missing wire-up). I'll read `app/(tabs)/profile.tsx`, `app/settings/reminder.tsx`, and `store/useSettingsStore.ts`. For every field in the store, verify there's a UI control somewhere. If there's `hapticsOn` in the store but no toggle, add one to Profile alongside the existing Sound toggle.

If everything is already wired, this task is "verify + write a one-line confirmation in the plan's report and commit a comment in `useSettingsStore.ts` documenting the mapping."

---

## 5. Detailed design — Animation polish

### 5.1 Tab bar slide-fade

**Files:**
- Modify: `app/(tabs)/_layout.tsx`

Switch from default fade to a slide + fade combo. expo-router's `Tabs` uses `react-native-screens` internally; tab transitions are configured via `screenOptions`:

```tsx
<Tabs
  screenOptions={{
    headerShown: false,
    tabBarStyle: { /* existing */ },
    animation: 'shift',  // expo-router supports 'shift' which combines slide + fade
  }}
>
```

If `animation: 'shift'` isn't supported by the installed expo-router version, fall back to wrapping each tab's root in a Reanimated `<Animated.View>` with `entering={FadeInRight.duration(200)}` etc. — verify via `npx expo customize@~14 --version-check` or just read `node_modules/expo-router/build/types.d.ts` for the option.

**Tests:** no new unit tests (animation is visual). Verified via screenshot smoke test in §7.

### 5.2 Game-over recap flourish

**Files:**
- Modify: `components/games/GameOverCard.tsx`

Current `GameOverCard` shows `<Text>{score}</Text>` and a row of stats. Updated render:

```tsx
<View style={styles.card}>
  <MotionView entering={FadeInDown.springify()}>
    <Text style={styles.title}>{title}</Text>
  </MotionView>

  <CountingNumber
    value={score}
    durationMs={800}
    formatter={(n) => n.toLocaleString()}
    style={styles.score}
  />

  <View style={styles.stats}>
    {stats.map((s, i) => (
      <MotionView key={s.label} entering={FadeInRight.delay(150 + i * 80).springify()} style={styles.stat}>
        <Text style={styles.statValue}>{s.value}</Text>
        <Text style={styles.statLabel}>{s.label}</Text>
      </MotionView>
    ))}
  </View>

  {newBest && (
    <Animated.View entering={ZoomIn.springify()} style={styles.newBest}>
      <Text style={styles.newBestText}>NEW BEST! +{delta}</Text>
    </Animated.View>
  )}

  {leveledUp && <ConfettiBurst />}

  <View style={styles.row}>
    <Button label="Play again" onPress={onPlayAgain} />
    <Button label="Done" onPress={onExit} variant="secondary" />
  </View>
</View>
```

New props on `GameOverCard`: `leveledUp?: boolean`, `newBest?: boolean`, `delta?: number`. Backward-compatible — all optional.

Callers (5 mini-game screens + Brain Rush recap) pass these from the recorder return value (§4.3, §4.4).

### 5.3 Profile badge live unlock animation

**Files:**
- Modify: `app/(tabs)/profile.tsx`

Track the previous unlocked set with a ref; on every Profile focus, diff against the current set. Newly-unlocked ids get a 600ms spring-zoom + brief border-glow.

```tsx
const prevUnlockedRef = useRef<Set<string>>(new Set());
const unlocked = useAchievementsStore((s) => s.unlocked);
const [newlyUnlocked, setNewlyUnlocked] = useState<Set<string>>(new Set());

useFocusEffect(useCallback(() => {
  const curr = new Set(unlocked);
  const fresh = new Set<string>();
  curr.forEach((id) => { if (!prevUnlockedRef.current.has(id)) fresh.add(id); });
  if (fresh.size > 0) {
    setNewlyUnlocked(fresh);
    setTimeout(() => setNewlyUnlocked(new Set()), 1200);
  }
  prevUnlockedRef.current = curr;
}, [unlocked]));

// in badge render:
<Animated.View
  style={[
    styles.badge,
    isUnlocked ? styles.badgeUnlocked : styles.badgeLocked,
    newlyUnlocked.has(a.id) && styles.badgeGlow,
    /* + shared value animation if newlyUnlocked.has(a.id) */
  ]}
>
```

Badge wrapper gets a Reanimated shared scale value that springs from 0.92 → 1.08 → 1.0 over 600ms when it's in the `newlyUnlocked` set. Glow style is a brighter border + box-shadow for ~1200ms.

### 5.4 Streak digit roll

**Files:**
- New: `components/RollingNumber.tsx`
- Modify: `components/StreakBadge.tsx` (number display), `app/(tabs)/index.tsx` (hero streak digit), `app/(tabs)/profile.tsx` (streak card big number).

```tsx
interface Props {
  value: number;
  style?: TextStyle | TextStyle[];
  durationMs?: number;  // default 300
}

export function RollingNumber({ value, style, durationMs = 300 }: Props) {
  // Two stacked Text elements: outgoing (value-1) slides up + fades out;
  // incoming (value) slides up from below into the slot. Stack uses
  // `position: 'absolute'` + parent measured height.
}
```

When `value` changes, both halves animate via reanimated shared values; on completion the outgoing element unmounts. If `value` decreases (rare — only on reset), it rolls in the opposite direction.

**Tests:** Pure visual; no unit test. Verified via the e2e screenshot after playing one round on a fresh day.

### 5.5 Welcome B-logo subtle pulse

**Files:**
- Modify: `app/onboarding/welcome.tsx`

Existing animation: float (translateY ±12 over 1.4s). Add a second shared value `pulse` driving scale 1.0 → 1.06 over 3.5s with `Easing.inOut(Easing.sin)`. Combined transform: `[{ translateY }, { scale }]`.

Trivial change — ~5 lines.

### 5.6 Daily Challenge wiggle until tapped today

**Files:**
- Modify: `store/useSettingsStore.ts` — add `lastDailyChallengeTappedDate: string | null` (ISO date string).
- Modify: `components/DailyChallengeCard.tsx` — read the field; if `null` OR not today, run a wiggle on the Button. When the user taps Start, set the field to today's ISO.

```tsx
const lastTapped = useSettingsStore((s) => s.lastDailyChallengeTappedDate);
const setLastTapped = useSettingsStore((s) => s.setLastDailyChallengeTappedDate);
const today = todayISO();

const rot = useSharedValue(0);
useEffect(() => {
  if (lastTapped === today) return;  // already engaged today
  rot.value = withRepeat(
    withSequence(
      withTiming(8, { duration: 110 }),
      withTiming(-8, { duration: 110 }),
      withTiming(0, { duration: 110 }),
      withTiming(0, { duration: 3500 }),   // long pause between wiggles
    ),
    -1,
    false,
  );
  return () => { cancelAnimation(rot); };
}, [lastTapped, today]);

const animStyle = useAnimatedStyle(() => ({ transform: [{ rotateZ: `${rot.value}deg` }] }));
```

The wiggle wraps the Button via `<Animated.View style={animStyle}>`. On Start tap, the existing handler now also calls `setLastTapped(today)`.

---

## 6. Cross-cutting refactor — `constants/games.ts`

**Files:**
- New: `constants/games.ts`
- Modify: `app/(tabs)/play.tsx`, `app/(tabs)/profile.tsx`, `components/DailyChallengeCard.tsx`

`Play tab`, `DailyChallengeCard`, and the new "Personal bests" section on Profile all hardcode the same list of 6 games (id, title, sub, color). Centralize into:

```ts
export const GAMES: ReadonlyArray<{
  id: GameId;          // matches MiniGameId + 'brain-rush'
  title: string;
  sub: string;
  color: string;
  path: string;        // route, e.g. '/game/word-sprint' or '/play' for brain rush
}> = [ ... ];
```

Each consumer imports `GAMES` and filters/maps as needed. Source of truth for game metadata. Adding a 7th game later becomes a one-line edit instead of three.

This is a small refactor in service of §4.4 and §5.x; not a separate animation/functional item.

---

## 7. Testing strategy

### 7.1 New unit tests

- `__tests__/use-pausable-interval.test.ts` — 6 tests (cadence, pause, resume, completion, oscillation, reset).
- `__tests__/personal-best.test.ts` — 5 tests (insert, overwrite when higher, no-op when lower, returns wasNewBest+previousBest, persists across reload).
- `__tests__/audio.test.ts` — 2 tests (init returns players for all SOURCES keys; play() is no-op when soundOn=false).

Expected delta: 106 → 119.

### 7.2 Regression net

`scripts/e2e-test.js` (existing) + `scripts/qa-full.js` (existing) re-run after each phase. All flows must stay green.

### 7.3 Visual smoke

After all 12 phases land, re-run the Playwright headless suite and capture screenshots of:
- Onboarding (verify dots indicator on welcome and username)
- Welcome screen (verify B logo is visible — pulse is hard to detect from a still)
- Home (daily challenge button, streak digit unchanged in screenshot but render correct)
- Play tab (verify Mini-games grid sources from new constants/games.ts cleanly)
- Game-over recap for one mini-game (verify CountingNumber and stat stagger)
- Profile (verify Personal bests section renders)

### 7.4 Audio smoke

Run the app on the Android emulator (or QR-installed APK) and confirm each sound key triggers. **This requires the user (you) since it's a physical / emulator gate. The plan includes it as a manual checklist item in the final task.**

---

## 8. Risk & rollout

| Risk | Mitigation |
|---|---|
| ffmpeg-generated mp3s sound bad | Listen to each before commit; tweak the synthesis recipe if any sounds harsh. They're meant to be utility sfx, not Spotify-quality. |
| AppState listener fires too aggressively (e.g. during permission prompts) | The existing notifications module already uses AppState — same pattern, same risk profile. |
| Tab bar `animation: 'shift'` not supported in expo-router 6 | Fallback: wrap each tab screen in a Reanimated `FadeInRight` entering animation. Plan includes both paths. |
| Live badge unlock animation triggers spuriously on first focus | `prevUnlockedRef` initialized to empty Set; first focus correctly considers ALL current unlocks as "newly unlocked" — undesirable. Initialize the ref to the unlocked set on first mount (before any diff). |
| Streak roll animation looks wrong when value drops | Detect direction; animate up for increments, down for decrements (rare; only happens on reset). |
| Daily challenge wiggle never stops | Guard on date equality; verify via test that `lastDailyChallengeTappedDate === todayISO()` short-circuits. |

**Rollout — one phase per commit, 14 total commits:**

1. `constants/games.ts` (cross-cutting refactor)
2. `assets/sounds/*.mp3` + `lib/audio.ts` wire-up
3. `lib/usePausableInterval.ts` + tests
4. Apply pausable interval to all 6 game screens
5. Mini-game level-up celebration (5 screens read `leveledUp` from the recorder)
6. `store/usePersonalBestStore.ts` + tests
7. Wire personal-best into recorder + GameOverCard "Best:" display + Profile section
8. `components/OnboardingDots.tsx` + welcome & username use it
9. Settings completeness audit + any missing toggles
10. Tab bar slide-fade
11. GameOverCard flourish (CountingNumber + stat stagger)
12. Profile badge live unlock animation
13. `components/RollingNumber.tsx` + streak number uses it
14. Welcome B pulse + Daily Challenge wiggle
15. Final regression (tsc + tests + e2e + screenshots + audio smoke)

**What stays unchanged:**
- `useGameStore.finishGame` math (Brain Rush)
- `recordMiniGameResult` math (mini-games)
- `lib/achievements.ts` catalog
- 12-badge grid layout shape
- AnimatedBackground, HeroSheen, Card press-flash
- All 9 routes; no route renames
- All existing tests

---

## 9. Open questions

None. All scope decisions captured. Two implementation choices to make at execution time:

- **Tab bar:** `animation: 'shift'` vs. per-screen `FadeInRight`. Decided in code; both work.
- **mp3 length for `bg`:** if we even need a native bg loop file. Web does its own oscillator drone. On native, an mp3 bg loop is ~30 KB but optional. Default decision: **omit `bg.mp3`** for now; native gets silence on game bg until the user requests it. Web's procedural drone still plays.

---

## 10. Glossary

- **Brain Rush** — original 5-question trivia game at `/game/session`.
- **Mini-game** — one of Word Sprint, Number Sense, Memory Match, Reaction Tap, Road Rush.
- **Recorder** — `lib/games/recordMiniGame.ts::recordMiniGameResult`.
- **Pausable interval** — the new AppState-aware `setInterval` replacement.
- **Personal best** — highest score per game, persisted across sessions.
- **Wiggle** — the gentle rotation animation on the daily-challenge Start button.
