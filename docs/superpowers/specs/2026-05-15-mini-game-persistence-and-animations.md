# Mini-Game Persistence, Unified Achievements & Animated UI — Design Spec

**Date:** 2026-05-15
**Status:** Approved
**Author:** Claude (with user)
**Implements:** the bug findings from the audit ("scores thrown away", "fragmented achievement system") plus the user's primary ask: noticeable but tasteful background animations and smooth page transitions, without breaking anything.

---

## 1. Background

BrainStreak ships 6 playable games today:

- **Brain Rush** (`/game/session`) — the original 5-question trivia loop. Already correctly persists score → XP → streak → recent activity → achievements via `useGameStore.finishGame`.
- **Word Sprint**, **Number Sense**, **Memory Match**, **Reaction Tap**, **Road Rush** — five mini-games. Each renders a final-score card with an XP value, but **the value is never written anywhere**. Profile shows 0 XP, 0 games played, streak does not advance. Achievement evaluation never fires.

In parallel, the Profile screen hardcodes a list of `BADGES` (`first_game`, `streak_3`, `xp_100`, …) whose ids do **not** match anything in the runtime catalog at `lib/achievements.ts` (`first-round`, `level-3`, `week-streak`, `xp-1k`, …). The two systems are completely disconnected — unlocking via the toast does not change what Profile shows.

The user also wants the UI to feel "noticeably alive" — vivid (but not noisy) background animations on every screen, smooth page transitions, and small celebratory micro-interactions — without regressing the 99 passing tests or any user-visible flow.

The audit's fourth finding — speed-bonus rounding — is already fixed (`app/game/session.tsx:192` uses float seconds). No work here.

Ads are explicitly **out of scope** for this spec; they go into a separate brainstorming cycle later.

---

## 2. Goals & non-goals

### Goals

- Every game's outcome flows through the same persistence path: bump XP, derive level, advance streak, append to recent activity, evaluate achievements, single Zustand transaction.
- Profile shows one source of truth for achievements, rendered from the runtime catalog with live unlock state.
- Background animations: vivid per-game tint on each game screen; multi-color drift on Welcome; subtle ambient on Home / Play / Profile.
- Page transitions: snappy (220ms, kept) and directional (forward = slide-right, back = reverse).
- Small celebratory beats: count-up on Profile stat numbers, brief tint flash on tile press, achievement-unlock confetti retained.
- All 99 existing tests stay green. Headless `scripts/e2e-test.js` walks the full flow without errors.

### Non-goals

- Ads or any other monetization (deferred).
- Multiplayer / leaderboards.
- New games beyond the 6 already shipped.
- Native Android build / submission.
- Replacing the audio engine.
- Sign-in / cloud sync (already removed).

---

## 3. Architecture overview

Three layers of change, all additive:

```
┌─────────────────────────────────────────────────────────────┐
│ UI: per-game tinted backgrounds, count-up stat numbers,     │
│ tile-press tint flash, directional onboarding slide         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Game-over hook: every mini-game's `phase: 'over'` calls     │
│ recordMiniGameResult({ gameId, score, xp, total?, correct? })│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Shared recorder: lib/games/recordMiniGame.ts                │
│ Same math path as useGameStore.finishGame for Brain Rush.   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Persistence: useUserStore.setProfile / setStreak (Zustand   │
│ persist); recordGame (AsyncStorage ring buffer);            │
│ useAchievementsStore.recordUnlocked                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ UI consumption: Profile reads ACHIEVEMENTS + unlocked set   │
│ and renders one unified Badges grid (no hardcoded BADGES).  │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Detailed design

### 4.1 Shared mini-game recorder

**File (new):** `lib/games/recordMiniGame.ts`

**Public API:**

```ts
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
  total?: number;    // total questions / actions attempted (if meaningful)
  correct?: number;  // correct count (if meaningful)
}

export interface RecordedResult {
  leveledUp: boolean;
  freshUnlocks: string[];
}

export async function recordMiniGameResult(r: MiniGameResult): Promise<RecordedResult>;
```

**Algorithm** (mirrors `useGameStore.finishGame` for Brain Rush):

1. `user = useUserStore.getState()` — capture `previousLevel = user.profile.level`, `previousStreak = user.streak`.
2. `newStreak = computeStreakAfterGame(previousStreak, todayISO(), yesterdayISO())` — pure.
3. `newTotalXP = user.profile.totalXP + r.xp`; `newLevel = getLevelFromXP(newTotalXP)`; `newGamesPlayed = user.profile.gamesPlayed + 1`.
4. `recent = await recordGame({ category: prettyName(r.gameId), score: r.score, xp: r.xp, correct: r.correct ?? 0, total: r.total ?? 0, at: new Date().toISOString() })` — ring buffer write.
5. `unlocked = evaluate({ profile: updatedProfile, streak: newStreak, recent })`.
6. `fresh = useAchievementsStore.getState().recordUnlocked(unlocked)`.
7. Single `set()` on the user store for profile + streak; single `set()` on game store for `pendingAchievementIds`.
8. Return `{ leveledUp: newLevel > previousLevel, freshUnlocks: fresh }`.

**Pretty names** (for the "Recent activity" card on Home — uses these labels):
`word-sprint → "Word Sprint"`, `number-sense → "Number Sense"`, `memory-match → "Memory Match"`, `reaction-tap → "Reaction Tap"`, `road-rush → "Road Rush"`.

**Why not extend `useGameStore.finishGame`?** finishGame is tightly coupled to Brain Rush state (`questions`, `correctCount`, `totalScore`, `phase` transitions). Mini-games have their own per-game state machines. A side-by-side recorder is cleaner than threading every game's state through one omnibus action.

### 4.2 Wiring each mini-game

Each game screen has a `phase: 'playing' | 'over'` (some have `'idle'` too). When the screen transitions to `'over'`, it calls `recordMiniGameResult` once with the values it already shows on its game-over card. Guard with a `recordedRef` so it can never double-count under React strict mode or fast re-renders.

| Game | Score input | XP formula | total | correct |
|---|---|---|---|---|
| Word Sprint  | `score` | `floor(score/4)` | `used.size` (words found) | `used.size` |
| Number Sense | `score` | `floor(score/2)` | derived per-round | `correctCount` |
| Memory Match | `score` | `floor(score/4)` | `seq.length` | `seq.length` |
| Reaction Tap | `score` (hits) | `score * 2`     | `score + misses` | `score` |
| Road Rush    | `distance_m` | `floor(distance_m/10)` | `obstacles.length` | — |

These exactly match the values each game already displays on its game-over card today — no change to player-visible numbers.

**Edge case:** if `r.xp === 0` AND `r.score === 0`, still call the recorder (so `gamesPlayed` and `streak` advance — finishing a round is the unit, not winning). This matches Brain Rush behavior.

### 4.3 Achievement catalog unification

**Delete:** the `BADGES` array at top of `app/(tabs)/profile.tsx`.

**Render badges from `ACHIEVEMENTS` (in `lib/achievements.ts`):**

```tsx
import { ACHIEVEMENTS } from '@/lib/achievements';
import { useAchievementsStore } from '@/store/useAchievementsStore';

const unlocked = useAchievementsStore((s) => s.unlocked);
const unlockedSet = new Set(unlocked);

// 4-row × 3-col grid; locked vs unlocked clearly different.
{ACHIEVEMENTS.map((a) => {
  const isUnlocked = unlockedSet.has(a.id);
  return (
    <BadgeCard
      key={a.id}
      title={a.title}
      description={a.description}
      unlocked={isUnlocked}
    />
  );
})}
```

**Catalog updates in `lib/achievements.ts`** — add three milestone achievements to fill the grid evenly to 12, and rename a couple titles for friendlier copy:

```ts
{ id: 'first-round',  title: 'First Round',     description: 'Finish your first game.',                            predicate: (s) => s.profile.gamesPlayed >= 1 },
{ id: 'level-3',       title: 'Getting Somewhere', description: 'Reach level 3.',                                  predicate: (s) => s.profile.level >= 3 },
{ id: 'level-5',       title: 'Knowledge Worker', description: 'Reach level 5.',                                   predicate: (s) => s.profile.level >= 5 },
{ id: 'level-10',      title: 'Quiz Machine',     description: 'Reach level 10.',                                  predicate: (s) => s.profile.level >= 10 },
{ id: 'streak-3',      title: 'On Fire',          description: 'Hold a 3-day streak.',                             predicate: (s) => s.streak.current >= 3 },          // NEW
{ id: 'week-streak',   title: 'Week On Lock',     description: 'Hold a 7-day streak.',                             predicate: (s) => s.streak.current >= 7 },
{ id: 'month-streak',  title: 'Unstoppable',      description: 'Hold a 30-day streak.',                            predicate: (s) => s.streak.current >= 30 },
{ id: 'xp-100',        title: 'Charged',          description: 'Earn 100 XP.',                                     predicate: (s) => s.profile.totalXP >= 100 },        // NEW
{ id: 'xp-500',        title: 'Big Brain',        description: 'Earn 500 XP.',                                     predicate: (s) => s.profile.totalXP >= 500 },        // NEW
{ id: 'xp-1k',         title: 'Cool 1,000',       description: 'Earn 1,000 XP.',                                   predicate: (s) => s.profile.totalXP >= 1000 },
{ id: 'centurion',     title: 'Centurion',        description: 'Play 100 rounds.',                                 predicate: (s) => s.profile.gamesPlayed >= 100 },
{ id: 'perfect-round', title: 'Flawless',         description: 'Get every answer right in a round.',                predicate: (s) => s.recent.some((g) => g.total > 0 && g.correct === g.total) },
```

**Total: 12 achievements.** Existing test assertions in `__tests__/achievements.test.ts` (`first-round`, `week-streak`) keep working; three new tests cover the new predicates.

### 4.4 Background animations

**Extend `components/AnimatedBackground.tsx`:** add optional `tint?: string` prop. When set, derive all 4 orbs from `tint` instead of the default multi-color palette:

```ts
interface Props {
  intensity?: 'subtle' | 'normal' | 'vivid';
  tint?: string;  // single base color; if omitted, multi-color
}
```

Implementation: when `tint` is provided, generate the 4 orb specs at `tint`, `tint+E0` alpha overlay, `tint`-darkened 15%, and `tint`-lightened 15%, with the same drift+breathe motion.

**Mount tinted bg on each game screen:**

- `app/game/session.tsx` — `tint={Colors.primary}` (Brain Rush blue)
- `app/game/word-sprint.tsx` — `tint={Colors.accent}` (teal)
- `app/game/number-sense.tsx` — `tint={Colors.primary}` (blue)
- `app/game/memory-match.tsx` — `tint={Colors.gold}`
- `app/game/reaction-tap.tsx` — `tint={Colors.success}` (green)
- `app/game/road-rush.tsx` — `tint={Colors.danger}` (red, around the dark asphalt field)

**Welcome:** stays as-is (multi-color, normal intensity).
**Home / Play / Profile:** stays as-is (multi-color, subtle).

All bg mounts use `pointerEvents="none"` and stay clipped behind content. Reanimated worklets run on the UI thread (no JS-thread cost).

### 4.5 Page transitions

**Keep** the existing 220ms `animationDuration` global default in `app/_layout.tsx`.

**Change** the `onboarding` Stack.Screen animation from `'fade'` to `'slide_from_right'` so forward progression reads as directional movement. Back-navigation automatically reverses.

**Keep** the rest unchanged: `game/*` → `slide_from_bottom`, `auth/sign-in` and `settings/reminder` → modal slide.

### 4.6 Micro-interactions

**New component:** `components/CountingNumber.tsx` — animates from 0 to the target value on mount over 600ms using `withTiming`. Renders `<Text>` with the formatted current value.

```tsx
interface Props {
  value: number;
  formatter?: (n: number) => string;  // e.g. n.toLocaleString()
  duration?: number;
  style?: TextStyle;
}
```

Used by Profile's three StatCards (Level / Total XP / Games). Static numbers elsewhere stay static — no need to count up everywhere.

**Tile-press tint flash:** in `components/Card.tsx`, when `onPress` fires, a brief 120ms opacity-pulse on the tile's marker bar (the colored mark at top of the StatCard / mini-game tile). One shared value, one `withSequence` — trivial.

### 4.7 What stays unchanged

- `useGameStore.finishGame` (Brain Rush path) — wire-compatible; same downstream effects.
- `lib/audio.ts` — sound effects untouched (already fire on tap/correct/wrong/levelup/crash).
- All 99 existing tests.
- Game routes, navigation structure, URLs, deep links.
- `lib/storage.ts` — Zustand still owns profile + streak as before.
- `useAchievementsStore` — same shape and persist behavior.

---

## 5. Data flow examples

### 5.1 Player finishes a Word Sprint round (30s timer expires)

1. `WordSprintScreen` sets `phase: 'over'` and `recordedRef.current = true` in a single `useEffect` guard.
2. Calls `recordMiniGameResult({ gameId: 'word-sprint', score: 240, xp: 60, total: 6, correct: 6 })`.
3. Recorder reads profile (totalXP=420, level=3), computes newTotalXP=480, newLevel=3 (no level-up), newStreak.current advanced, gamesPlayed++.
4. `recordGame` appends `{ category: 'Word Sprint', score: 240, xp: 60, correct: 6, total: 6, at: '…' }` to AsyncStorage.
5. `evaluate(…)` finds `xp-100` newly unlocked (was 420 XP before this round? wait, already unlocked. Let's say it's a player at 80 XP who just crossed 100: now `xp-100` newly fires).
6. `useAchievementsStore.recordUnlocked(['first-round','xp-100'])` → returns `['xp-100']` as fresh.
7. Single store update commits profile + streak. Game store sets `pendingAchievementIds: ['xp-100']`.
8. Root `AchievementToast` slides in: "Charged — Earn 100 XP."
9. Player taps "Play again" or "Done" — Profile now shows updated XP, Level, Games, and `xp-100` badge as unlocked.

### 5.2 Player launches Brain Rush directly to `/game/session` (cold direct URL)

Already handled by an existing redirect guard. No change.

### 5.3 Player finishes a Road Rush run by crashing

1. `RoadRushScreen` sets `phase: 'over'` and calls `recordMiniGameResult({ gameId: 'road-rush', score: distance_m, xp: floor(distance_m/10), total: obstacles.length })`.
2. Same flow as 5.1.

---

## 6. Testing strategy

### 6.1 New unit tests

- `__tests__/record-mini-game.test.ts` (4 tests):
  - records XP and bumps gamesPlayed
  - advances streak on a fresh day
  - does NOT re-advance streak if same-day record
  - returns `leveledUp: true` when newLevel > previousLevel
- `__tests__/achievements.test.ts` (extend with 3 new tests):
  - `streak-3` unlocks at 3-day streak
  - `xp-100` unlocks at 100 XP
  - `xp-500` unlocks at 500 XP

### 6.2 Regression net

- All 99 existing tests must still pass: `npm test` exits 0.
- `npx tsc --noEmit` clean.
- `npm run web:export` succeeds, postprocess writes manifest + SPA fallback.

### 6.3 Headless end-to-end

- `scripts/e2e-test.js` already walks: Home → Play → tap Word Sprint tile → back → tap Start game → countdown → tap X → back to Play. After every code phase, this must finish with 0 functional errors (the single recoverable React #418 warning is allowed).
- Extend `e2e-test.js` to:
  - Pre-seed profile with 5 XP, play a Word Sprint round to completion (use fake-timer to fast-forward), verify Profile XP increased and one Recent Activity row was added.
  - Verify Profile badges grid shows 12 entries.

### 6.4 Visual smoke

After each phase, screenshot 8 screens and check:
- Bg orbs visible (drifting) on Welcome / Home / Play / Profile / all 6 game screens.
- Per-game tint visible on each game screen.
- Profile stat numbers count up on first render.
- Tile press → brief tint flash.

---

## 7. Risk & rollout

| Risk | Mitigation |
|---|---|
| Mini-game extra work on `over` phase causes UI stutter | All persistence is async, fired in a `useEffect` guarded by `recordedRef`. UI render happens first, persistence after. |
| Achievement evaluation slow on every game | Synchronous predicate checks on a 12-entry array. Sub-millisecond. |
| User had old hardcoded BADGES unlocked via prior session — do they lose history? | `useAchievementsStore.unlocked` is the only persistence; BADGES was never persisted. No data loss. |
| Bg animations on game screens cost frame budget | Reanimated worklets are UI-thread; the 4 orbs are static-position with cheap transforms. Tested at 60fps on web Chromium. |
| Existing tests rely on old `BADGES` ids | Verified — no test references `first_game` / `streak_3` / `xp_100`. Safe to delete. |

**Rollout:** one phase per commit, each independently revertable:
1. Add `lib/games/recordMiniGame.ts` + tests.
2. Wire Word Sprint to call the recorder. Verify with e2e.
3. Wire the other four games. Verify each with e2e.
4. Extend achievements catalog with three new entries.
5. Delete BADGES, render Profile from `ACHIEVEMENTS`.
6. AnimatedBackground accepts `tint`; mount on each game screen.
7. Profile stats use CountingNumber.
8. Card tile-press tint flash.
9. Onboarding stack animation → `slide_from_right`.
10. Final regression (`tsc`, `npm test`, `e2e`).

---

## 8. Open questions

- **None blocking.** Two minor preference questions could be revisited after first pass:
  - Should Reaction Tap reward XP per *hit* (`score*2`) or per *combo length*? Current pick: per hit (matches what the game-over card already displays).
  - Should the bg tint differ on the game-over recap vs the live round? Current pick: same tint — visually contiguous.

---

## 9. Glossary

- **Brain Rush** — the original 5-question trivia game at `/game/session`.
- **Mini-games** — the 5 newer arcade games (Word Sprint, Number Sense, Memory Match, Reaction Tap, Road Rush).
- **Recorder** — the new `recordMiniGameResult` function in `lib/games/recordMiniGame.ts`.
- **Catalog** — the runtime achievement definitions in `lib/achievements.ts`.
- **Tint** — a single base color used by `AnimatedBackground` to derive its 4 orb colors when present.
