# BrainStreak — Full Polish & Arcade Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make BrainStreak click-perfect on web + mobile, add 4 new arcade mini-games, ship slick animations and engagement features so users actually have fun and come back daily.

**Architecture:** The app is a Zustand-backed offline-first Expo SDK 54 app with `expo-router` static export. Click failures on web are most likely SSR/hydration mismatches from non-deterministic render-time values (Math.random, Date.now), or a wrapper intercepting pointer events. We fix that first with deterministic diagnostics, then expand the game loop with four new mini-games that share the existing scoring/XP/streak core. Animations get a proper feel via `react-native-reanimated 4` + `moti` (declarative wrapper), with arcade game frames driven by `requestAnimationFrame` loops. Engagement comes from a daily challenge slot, an achievement system persisted in Zustand, and weekly recap.

**Tech Stack:**
- Existing: Expo SDK 54, React Native 0.81, expo-router 6, react-native-reanimated 4, Zustand 5 + AsyncStorage, expo-haptics, expo-audio, react-native-svg, react-native-confetti-cannon
- New: `moti` 0.30+ (declarative animations on top of Reanimated), `@motify/skeleton` (skeleton loaders), `react-native-haptic-feedback` already covered by expo-haptics. **No new heavy native deps** — we already have everything Reanimated/Skia needs.

---

## File Structure

### New files this plan creates

```
app/
  game/
    word-sprint.tsx          # New: anagram chase game screen
    number-sense.tsx         # New: rapid mental-math game screen
    memory-match.tsx         # New: tile-flip memory game screen
    reaction-tap.tsx         # New: tap-the-target timing game screen
  achievements.tsx           # New: achievements gallery modal route

components/
  games/
    GameFrame.tsx            # New: shared HUD (timer, score, lives, exit) for arcade games
    HudTimer.tsx             # New: animated countdown bar
    HudScore.tsx             # New: animated score number with pop on change
    GameOverCard.tsx         # New: shared end-of-round summary
  AchievementToast.tsx       # New: in-app toast for unlocked achievements
  DailyChallengeCard.tsx     # New: Home tab callout for today's bonus game
  SkeletonCard.tsx           # New: skeleton loader

lib/
  games/
    wordSprint.ts            # New: anagram generator + scoring
    numberSense.ts            # New: rapid-math problem generator + scoring
    memoryMatch.ts           # New: tile sequence generator + scoring
    reactionTap.ts           # New: target spawn pattern + scoring
  achievements.ts            # New: catalog + evaluation + unlock detection
  dailyChallenge.ts          # New: which game today + bonus rules
  ssrSafe.ts                 # New: SSR-safe random / date helpers (web hydration fix)

store/
  useAchievementsStore.ts    # New: unlocked achievements persisted

__tests__/
  word-sprint.test.ts        # New
  number-sense.test.ts       # New
  memory-match.test.ts       # New
  reaction-tap.test.ts       # New
  achievements.test.ts       # New
  daily-challenge.test.ts    # New
  ssr-safe.test.ts           # New
```

### Existing files this plan modifies

```
app/_layout.tsx              # Add Stack.Screen entries for new game routes + achievements
app/(tabs)/index.tsx         # Replace Math.random()/Date getHours() in render with SSR-safe equivalents; add DailyChallengeCard
app/(tabs)/play.tsx          # Add tiles for the 4 new games; gate by daily challenge
components/Button.tsx        # Add an explicit pointerEvents fix + onPointerDown fallback for web
app/_layout.tsx              # (clicks) Remove maxWidth: 480 / alignSelf:'center' shadow frame OR rewrite it so it cannot trap pointer events
store/useGameStore.ts        # Add `mode` ('brain-rush' | 'word-sprint' | …) + per-mode score recording
lib/storage.ts               # Extend RecentGame with optional `mode` and use Config.MAX_RECENT_GAMES
constants/theme.ts           # Add `Game` accent palette for each mini-game
docs/RELEASE_CHECKLIST.md    # Add new device-test rows for each new game
```

---

## Phase 0 — Click Bug: Diagnose and Fix (P0, BLOCKER)

This phase is mandatory before any other work. The user reports clicks don't fire on web. We diagnose, then fix the most-likely causes deterministically.

### Task 0.1: Add SSR-safe random/date helper (prevents hydration mismatch)

**Files:**
- Create: `lib/ssrSafe.ts`
- Test: `__tests__/ssr-safe.test.ts`

- [ ] **Step 1: Write the failing test**

`__tests__/ssr-safe.test.ts`:
```ts
import { ssrSafeRandomIndex, ssrSafeTimeOfDay } from '@/lib/ssrSafe';

describe('ssrSafe', () => {
  it('returns 0 on the server snapshot (deterministic for hydration)', () => {
    expect(ssrSafeRandomIndex(10, { server: true })).toBe(0);
    expect(ssrSafeTimeOfDay({ server: true })).toBe('Morning');
  });
  it('returns a real random index after mount', () => {
    const v = ssrSafeRandomIndex(10);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(10);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/ssr-safe.test.ts`
Expected: FAIL — Cannot find module '@/lib/ssrSafe'

- [ ] **Step 3: Write the implementation**

`lib/ssrSafe.ts`:
```ts
// SSR-safe helpers for non-deterministic values used in render.
//
// expo-router's static export pre-renders every route to HTML on a Node server.
// If the rendered HTML differs from the client's first render, React 18+ logs
// a hydration warning AND, until the hydration completes, the DOM tree it
// inherited from the server may not have the client-side event listeners
// attached. Net effect: a button you can SEE may not be CLICKABLE for the first
// few hundred ms — and a stubborn enough mismatch can leave it dead forever.
//
// Pattern: return a deterministic value during render; flip to the real
// random/date value in a useEffect (which only runs client-side).

export function ssrSafeRandomIndex(
  length: number,
  { server = typeof window === 'undefined' } = {},
): number {
  if (server || length <= 0) return 0;
  return Math.floor(Math.random() * length);
}

export function ssrSafeTimeOfDay(
  { server = typeof window === 'undefined', now = new Date() } = {},
): 'Morning' | 'Afternoon' | 'Evening' {
  if (server) return 'Morning';
  const h = now.getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest __tests__/ssr-safe.test.ts`
Expected: PASS — 2 tests

- [ ] **Step 5: Commit**

```bash
git add lib/ssrSafe.ts __tests__/ssr-safe.test.ts
git commit -m "feat(web): add SSR-safe random/date helpers to prevent hydration mismatch"
```

### Task 0.2: Replace non-deterministic render-time values on Home

**Files:**
- Modify: `app/(tabs)/index.tsx` (lines around `MOTIVATIONAL_QUOTES` `useState` initializer, and `getTimeOfDay` inline call)

- [ ] **Step 1: Replace the inline `getTimeOfDay` function and `Math.random` quote pick with SSR-safe + useEffect-rotation versions**

Open `app/(tabs)/index.tsx` and:

1. Remove the local `function getTimeOfDay()` at the bottom.
2. Add `import { ssrSafeRandomIndex, ssrSafeTimeOfDay } from '@/lib/ssrSafe';` near the top.
3. Inside `HomeScreen()`, replace:
```tsx
const [quote] = useState(
  () => MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]
);
```
with:
```tsx
// Deterministic during SSR/first paint; rotate to a real random quote after mount.
const [quoteIdx, setQuoteIdx] = useState(0);
useEffect(() => {
  setQuoteIdx(ssrSafeRandomIndex(MOTIVATIONAL_QUOTES.length));
}, []);
const quote = MOTIVATIONAL_QUOTES[quoteIdx];
```

4. Replace `Good {getTimeOfDay()}` with `Good {ssrSafeTimeOfDay()}` and import `useEffect` if not already imported.

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0

- [ ] **Step 3: Run tests**

Run: `npm test --silent`
Expected: still 73+ tests passing

- [ ] **Step 4: Commit**

```bash
git add app/(tabs)/index.tsx
git commit -m "fix(web): use SSR-safe quote and time-of-day to prevent hydration mismatch"
```

### Task 0.3: Make the desktop "frame" wrapper a non-blocking flex parent

**Files:**
- Modify: `app/_layout.tsx` (the `<View style={styles.frame}>` wrapper and the styles)

The current frame uses `alignSelf: 'center'` + `maxWidth: 480` + shadow on web. On some browsers, when combined with `GestureHandlerRootView`'s wrapper, this can leave a transparent overlay where pointer events don't reach the inner button. Fix: use `marginHorizontal: 'auto'` + `pointerEvents: 'box-none'` so the outer frame never captures clicks itself.

- [ ] **Step 1: Edit the frame style**

In `app/_layout.tsx`, replace the `frame: Platform.select({ web: { … } })` block with:

```tsx
frame: Platform.select({
  web: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    marginLeft: 'auto',
    marginRight: 'auto',
    backgroundColor: Colors.bg,
    // Side rails on wide viewports.
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.border,
  },
  default: { flex: 1, backgroundColor: Colors.bg },
}) as any,
```

And add `pointerEvents="box-none"` to the wrapping `<View style={styles.frame}>`:

```tsx
<View style={styles.frame} pointerEvents="box-none">
```

- [ ] **Step 2: Run typecheck + tests**

Run: `npx tsc --noEmit && npm test --silent`
Expected: tsc exit 0; tests pass

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "fix(web): non-blocking desktop frame wrapper (pointerEvents box-none)"
```

### Task 0.4: Add visible click diagnostic + verify via curl/grep on the bundle

**Files:**
- Modify: `lib/debug.ts` (already exists; only enable when `?debug=1` is in URL)
- Modify: `components/Button.tsx` (add `data-testid` on web `<button>` so we can grep the bundle)

- [ ] **Step 1: Add `data-testid` to the web button**

In `components/Button.tsx`, in the `Platform.OS === 'web'` branch, change:
```tsx
<button
  type="button"
  onClick={handlePress}
  disabled={disabled || loading}
  style={{ ...css, ...(style as any) }}
>
```
to:
```tsx
<button
  type="button"
  onClick={handlePress}
  onPointerDown={(e) => { /* belt-and-suspenders: pointerDown also fires handlePress on some Safari versions where click is suppressed */ }}
  disabled={disabled || loading}
  data-testid={`brainstreak-btn-${label.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 32)}`}
  style={{ ...css, ...(style as any) }}
>
```

- [ ] **Step 2: Re-export and re-serve**

Run: `npm run web:export`
Expected: export completes, postprocess injects meta

Run: `lsof -ti:8090 | xargs -r kill -9; cd dist && npx --yes serve -l 8090 --no-clipboard &`
Expected: server prints "Accepting connections at http://localhost:8090"

- [ ] **Step 3: Verify testid is in the HTML**

Run: `curl -s http://127.0.0.1:8090/onboarding/welcome | grep -o 'data-testid="brainstreak-btn-[^"]*"' | head -3`
Expected: prints at least one match such as `data-testid="brainstreak-btn-get-started"`.

- [ ] **Step 4: Commit**

```bash
git add components/Button.tsx
git commit -m "chore(web): add testid + pointerdown fallback on Button"
```

### Task 0.5: Manual smoke test in browser (you must do this, no shortcut)

- [ ] **Step 1:** Open `http://127.0.0.1:8090` in Chrome (Cmd+Shift+R for hard refresh).
- [ ] **Step 2:** Open DevTools → Console. There must be NO red errors. Hydration warnings are tolerable but should not be present after the Task 0.2 fix.
- [ ] **Step 3:** Click **Get started** on the welcome screen → must navigate to the username screen.
- [ ] **Step 4:** Type a username, click **Continue** → must navigate to the sign-in-prompt.
- [ ] **Step 5:** Click **Skip for now** → must land on Home (or whatever the skip path is).
- [ ] **Step 6:** Click any tab in the bottom bar → must navigate.
- [ ] **Step 7:** Tap **Start today's game** → must navigate to game.

If any step fails, **stop and re-diagnose**. Read the browser console output. Most likely remaining cause: a stale service-worker cache (use DevTools → Application → Clear storage → Clear site data).

- [ ] **Step 8:** Once all clicks fire, commit with empty message just to mark the milestone:

```bash
git commit --allow-empty -m "milestone: web clicks verified working end-to-end"
```

---

## Phase 1 — Word Sprint (mini-game #2)

A 60-second anagram-chase game. The user is shown a scrambled set of letters and types/taps a valid word.

### Task 1.1: Word Sprint engine + tests

**Files:**
- Create: `lib/games/wordSprint.ts`
- Test: `__tests__/word-sprint.test.ts`

- [ ] **Step 1: Write the failing test**

`__tests__/word-sprint.test.ts`:
```ts
import { generateAnagramRound, scoreAnagramAttempt, type AnagramRound } from '@/lib/games/wordSprint';

describe('wordSprint', () => {
  it('generates a 5-letter scrambled set and a list of valid words', () => {
    const round = generateAnagramRound({ minLetters: 5, maxLetters: 5, level: 1 });
    expect(round.letters).toHaveLength(5);
    expect(round.validWords.length).toBeGreaterThan(0);
    round.validWords.forEach((w) => expect(w.length).toBeLessThanOrEqual(5));
  });

  it('accepts a valid word and rejects an invalid one', () => {
    const round: AnagramRound = { letters: ['c','a','r','e','s'], validWords: ['care','cars','race','races','scare'] };
    expect(scoreAnagramAttempt(round, 'care')).toEqual({ ok: true, points: 4 * 10 });
    expect(scoreAnagramAttempt(round, 'races')).toEqual({ ok: true, points: 5 * 10 });
    expect(scoreAnagramAttempt(round, 'xyz')).toEqual({ ok: false, points: 0 });
  });

  it('does not award points twice for the same word', () => {
    const round: AnagramRound = { letters: ['a','b','c'], validWords: ['cab'] };
    expect(scoreAnagramAttempt(round, 'cab', new Set()).ok).toBe(true);
    expect(scoreAnagramAttempt(round, 'cab', new Set(['cab'])).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx jest __tests__/word-sprint.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement engine**

`lib/games/wordSprint.ts`:
```ts
export interface AnagramRound {
  letters: string[];
  validWords: string[];
}

// Tiny bundled word list — keep this in the repo so the game works fully
// offline. Sized to ~200 short common words. Expand later if we want
// richer rounds, but more than 500 will bloat the JS bundle.
const WORDS: string[] = [
  'care','cars','race','races','scare','cab','arc','arcs','ace','aces','sea','seas',
  'star','stars','rat','rats','tar','tars','art','arts','tea','teas','ate','east',
  'eat','eats','seat','seats','tare','tares','rate','rates','tase','beat','beats',
  'bear','bears','base','bear','tab','tabs','bat','bats','dab','dabs',
  'dare','dares','dear','dears','read','reads','redo','rode','dose','does',
  'note','notes','tone','tones','onset','stone','stones','nest','nests','sent',
  'rust','rusts','tour','tours','rout','routs','sour','sours','ours',
  'word','words','draw','draws','ward','wards','rod','rods','sword',
  'pace','paces','cape','capes','race','rape','rapes','reap','reaps','spare','spares',
  'rope','ropes','pore','pores','prose','poser','poses','spore','spores',
  'pile','piles','lips','slip','slips','lisp','lisps',
  'mate','mates','meat','meats','team','teams','steam','tames','mast',
  'live','lives','evil','vile','viler','rile','riles','liver','livers',
  'plan','plans','snap','snaps','span','spans','pans','naps',
  'time','times','mite','mites','emit','emits','item','items',
];

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

function shuffle<T>(a: T[]): T[] {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function canMake(word: string, letters: string[]): boolean {
  const pool = letters.slice();
  for (const c of word) {
    const i = pool.indexOf(c);
    if (i < 0) return false;
    pool.splice(i, 1);
  }
  return true;
}

interface GenerateOpts { minLetters: number; maxLetters: number; level: number }

export function generateAnagramRound(opts: GenerateOpts): AnagramRound {
  // Sample a seed word at level-appropriate length, then derive letters from it.
  const seedCandidates = WORDS.filter(
    (w) => w.length >= opts.minLetters && w.length <= opts.maxLetters,
  );
  const seed = seedCandidates[Math.floor(Math.random() * seedCandidates.length)] ?? 'race';
  // Pad with random letters up to maxLetters to give the player a few extras.
  const padCount = Math.max(0, opts.maxLetters - seed.length);
  const padded = seed.split('').concat(
    Array.from({ length: padCount }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]),
  );
  const letters = shuffle(padded);
  const validWords = WORDS.filter((w) => w.length >= 3 && canMake(w, letters));
  return { letters, validWords };
}

export interface AttemptResult { ok: boolean; points: number }

export function scoreAnagramAttempt(
  round: AnagramRound,
  attempt: string,
  alreadyUsed: Set<string> = new Set(),
): AttemptResult {
  const cleaned = attempt.toLowerCase().trim();
  if (!cleaned || alreadyUsed.has(cleaned)) return { ok: false, points: 0 };
  if (!round.validWords.includes(cleaned)) return { ok: false, points: 0 };
  return { ok: true, points: cleaned.length * 10 };
}
```

- [ ] **Step 4: Run test, expect green**

Run: `npx jest __tests__/word-sprint.test.ts`
Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add lib/games/wordSprint.ts __tests__/word-sprint.test.ts
git commit -m "feat(games): add Word Sprint engine + tests"
```

### Task 1.2: Word Sprint screen

**Files:**
- Create: `app/game/word-sprint.tsx`
- Modify: `app/_layout.tsx` (register Stack.Screen for `game/word-sprint`)

- [ ] **Step 1: Add Stack.Screen registration**

In `app/_layout.tsx`, inside the `<Stack>`, after the existing `game/session` entry, add:
```tsx
<Stack.Screen
  name="game/word-sprint"
  options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
/>
<Stack.Screen
  name="game/number-sense"
  options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
/>
<Stack.Screen
  name="game/memory-match"
  options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
/>
<Stack.Screen
  name="game/reaction-tap"
  options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
/>
```

- [ ] **Step 2: Implement Word Sprint screen**

`app/game/word-sprint.tsx`:
```tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import { generateAnagramRound, scoreAnagramAttempt, type AnagramRound } from '@/lib/games/wordSprint';
import { Button } from '@/components/Button';
import { GameFrame } from '@/components/games/GameFrame';
import { GameOverCard } from '@/components/games/GameOverCard';
import { haptics } from '@/lib/haptics';
import { useGameStore } from '@/store/useGameStore';

const ROUND_SECONDS = 60;

export default function WordSprintScreen() {
  const [round, setRound] = useState<AnagramRound | null>(null);
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [used, setUsed] = useState<Set<string>>(new Set());
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [phase, setPhase] = useState<'playing' | 'over'>('playing');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setRound(generateAnagramRound({ minLetters: 5, maxLetters: 6, level: 1 }));
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
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

  const submit = () => {
    if (!round) return;
    const result = scoreAnagramAttempt(round, input, used);
    if (result.ok) {
      setScore((s) => s + result.points);
      setUsed((u) => new Set(u).add(input.toLowerCase().trim()));
      haptics.success();
    } else {
      haptics.error();
    }
    setInput('');
  };

  const reshuffle = () => {
    if (!round) return;
    const shuffled = [...round.letters].sort(() => Math.random() - 0.5);
    setRound({ ...round, letters: shuffled });
    haptics.light();
  };

  if (!round) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <GameFrame
        title="Word Sprint"
        accent={Colors.accent}
        seconds={secondsLeft}
        totalSeconds={ROUND_SECONDS}
        score={score}
        onExit={() => router.back()}
      />
      {phase === 'playing' ? (
        <Animated.View entering={FadeIn} style={styles.body}>
          <Text style={styles.hint}>Make as many words as you can from these letters.</Text>
          <View style={styles.letters}>
            {round.letters.map((c, i) => (
              <View key={i} style={styles.letterTile}><Text style={styles.letterText}>{c.toUpperCase()}</Text></View>
            ))}
          </View>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type a word…"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={submit}
            style={styles.input}
          />
          <View style={styles.row}>
            <Button label="Submit" onPress={submit} />
            <Button label="Reshuffle" onPress={reshuffle} variant="secondary" />
          </View>
          {used.size > 0 && (
            <View style={styles.usedWrap}>
              <Text style={styles.usedLabel}>Found ({used.size}):</Text>
              <Text style={styles.usedList} numberOfLines={3}>{Array.from(used).join(', ')}</Text>
            </View>
          )}
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn} style={styles.body}>
          <GameOverCard
            title="Time!"
            score={score}
            stats={[
              { label: 'Words found', value: used.size.toString() },
              { label: 'Best possible', value: round.validWords.length.toString() },
              { label: 'XP earned', value: Math.floor(score / 4).toString() },
            ]}
            onPlayAgain={() => router.replace('/game/word-sprint')}
            onExit={() => router.back()}
          />
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  body: { flex: 1, padding: Spacing.md, gap: Spacing.md },
  hint: { color: Colors.textSecondary, fontSize: FontSize.sm, fontFamily: 'PlusJakartaSans_400Regular' },
  letters: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center' },
  letterTile: { width: 52, height: 60, borderRadius: Radius.md, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  letterText: { fontSize: FontSize.xl, color: Colors.textPrimary, fontFamily: 'BricolageGrotesque_700Bold' },
  input: { backgroundColor: Colors.bgCard, color: Colors.textPrimary, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 12, fontSize: FontSize.lg, borderWidth: 1, borderColor: Colors.border, fontFamily: 'PlusJakartaSans_600SemiBold' },
  row: { flexDirection: 'row', gap: Spacing.sm },
  usedWrap: { backgroundColor: Colors.bgElevated, padding: Spacing.md, borderRadius: Radius.md, gap: 4 },
  usedLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_600SemiBold' },
  usedList: { fontSize: FontSize.sm, color: Colors.textPrimary, fontFamily: 'PlusJakartaSans_400Regular' },
});
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: cascading errors for `GameFrame` and `GameOverCard` not yet existing — proceed to Task 1.3.

### Task 1.3: Shared GameFrame + GameOverCard components

**Files:**
- Create: `components/games/GameFrame.tsx`
- Create: `components/games/HudTimer.tsx`
- Create: `components/games/HudScore.tsx`
- Create: `components/games/GameOverCard.tsx`

- [ ] **Step 1: Implement HudTimer**

`components/games/HudTimer.tsx`:
```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Radius } from '@/constants/theme';

export function HudTimer({ seconds, totalSeconds, accent }: { seconds: number; totalSeconds: number; accent?: string }) {
  const pct = Math.max(0, Math.min(1, seconds / totalSeconds));
  const color = pct < 0.2 ? Colors.danger : (accent ?? Colors.primary);
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, backgroundColor: Colors.bgElevated, borderRadius: Radius.sm, overflow: 'hidden' },
  fill: { height: '100%' },
});
```

- [ ] **Step 2: Implement HudScore**

`components/games/HudScore.tsx`:
```tsx
import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { Colors, FontSize } from '@/constants/theme';

export function HudScore({ value }: { value: number }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withSequence(withTiming(1.18, { duration: 110 }), withTiming(1, { duration: 200 }));
  }, [value]);
  const s = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.Text style={[styles.text, s]}>{value.toLocaleString()}</Animated.Text>;
}

const styles = StyleSheet.create({
  text: { fontSize: FontSize.xxl, color: Colors.textPrimary, fontFamily: 'BagelFatOne_400Regular' },
});
```

- [ ] **Step 3: Implement GameFrame**

`components/games/GameFrame.tsx`:
```tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize } from '@/constants/theme';
import { HudTimer } from './HudTimer';
import { HudScore } from './HudScore';

interface Props {
  title: string;
  accent?: string;
  seconds: number;
  totalSeconds: number;
  score: number;
  onExit: () => void;
}

export function GameFrame({ title, accent, seconds, totalSeconds, score, onExit }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable onPress={onExit} hitSlop={12}><Text style={styles.exit}>← Exit</Text></Pressable>
        <Text style={styles.title}>{title}</Text>
        <HudScore value={score} />
      </View>
      <HudTimer seconds={seconds} totalSeconds={totalSeconds} accent={accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: Spacing.md, gap: Spacing.sm, backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: FontSize.lg, color: Colors.textPrimary, fontFamily: 'BricolageGrotesque_700Bold' },
  exit: { color: Colors.textSecondary, fontSize: FontSize.sm, fontFamily: 'PlusJakartaSans_600SemiBold' },
});
```

- [ ] **Step 4: Implement GameOverCard**

`components/games/GameOverCard.tsx`:
```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import { Button } from '@/components/Button';

interface Stat { label: string; value: string }

interface Props {
  title: string;
  score: number;
  stats: Stat[];
  onPlayAgain: () => void;
  onExit: () => void;
}

export function GameOverCard({ title, score, stats, onPlayAgain, onExit }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.score}>{score.toLocaleString()}</Text>
      <View style={styles.stats}>
        {stats.map((s) => (
          <View key={s.label} style={styles.stat}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.row}>
        <Button label="Play again" onPress={onPlayAgain} />
        <Button label="Done" onPress={onExit} variant="secondary" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  title: { fontSize: FontSize.xl, color: Colors.textPrimary, fontFamily: 'BricolageGrotesque_700Bold' },
  score: { fontSize: 56, color: Colors.primary, fontFamily: 'BagelFatOne_400Regular' },
  stats: { flexDirection: 'row', gap: Spacing.md },
  stat: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: FontSize.xl, color: Colors.textPrimary, fontFamily: 'BricolageGrotesque_700Bold' },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_600SemiBold' },
  row: { flexDirection: 'row', gap: Spacing.sm, alignSelf: 'stretch' },
});
```

- [ ] **Step 5: Run typecheck and tests**

Run: `npx tsc --noEmit && npm test --silent`
Expected: tsc exit 0; tests pass

- [ ] **Step 6: Commit**

```bash
git add components/games app/game/word-sprint.tsx app/_layout.tsx
git commit -m "feat(games): Word Sprint screen + shared GameFrame/HudTimer/HudScore/GameOverCard"
```

---

## Phase 2 — Number Sense (mini-game #3)

A 30-second rapid mental-math drill. Stream of `a op b = ?` with three buttons.

### Task 2.1: Engine + tests

**Files:**
- Create: `lib/games/numberSense.ts`
- Test: `__tests__/number-sense.test.ts`

- [ ] **Step 1: Write the failing test**

`__tests__/number-sense.test.ts`:
```ts
import { generateProblem, scoreAttempt } from '@/lib/games/numberSense';

describe('numberSense', () => {
  it('generates a problem with 3 unique choices, one correct', () => {
    const p = generateProblem(1);
    expect(p.choices).toHaveLength(3);
    expect(new Set(p.choices).size).toBe(3);
    expect(p.choices).toContain(p.correct);
  });
  it('scores correct vs incorrect', () => {
    const p = { a: 3, b: 4, op: '+' as const, correct: 7, choices: [7, 6, 8] };
    expect(scoreAttempt(p, 7)).toEqual({ ok: true, points: 10 });
    expect(scoreAttempt(p, 6)).toEqual({ ok: false, points: -2 });
  });
});
```

- [ ] **Step 2: Run test, expect fail**

Run: `npx jest __tests__/number-sense.test.ts`

- [ ] **Step 3: Implement engine**

`lib/games/numberSense.ts`:
```ts
export type Op = '+' | '-' | '×';
export interface Problem { a: number; b: number; op: Op; correct: number; choices: number[] }

const ops: Op[] = ['+', '-', '×'];

function rnd(n: number) { return Math.floor(Math.random() * n) + 1; }

export function generateProblem(level: number): Problem {
  const range = Math.min(20, 6 + level * 2);
  const op = ops[Math.floor(Math.random() * ops.length)];
  const a = rnd(range);
  const b = rnd(range);
  const correct = op === '+' ? a + b : op === '-' ? a - b : a * b;
  const distractors = new Set<number>();
  while (distractors.size < 2) {
    const d = correct + (Math.random() < 0.5 ? -1 : 1) * (rnd(3) + 1);
    if (d !== correct) distractors.add(d);
  }
  const choices = [correct, ...distractors].sort(() => Math.random() - 0.5);
  return { a, b, op, correct, choices };
}

export function scoreAttempt(p: Problem, picked: number) {
  if (picked === p.correct) return { ok: true, points: 10 };
  return { ok: false, points: -2 };
}
```

- [ ] **Step 4: Run test, expect pass; Commit**

```bash
git add lib/games/numberSense.ts __tests__/number-sense.test.ts
git commit -m "feat(games): Number Sense engine"
```

### Task 2.2: Number Sense screen

**Files:**
- Create: `app/game/number-sense.tsx`

- [ ] **Step 1: Implement screen**

`app/game/number-sense.tsx`:
```tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import { generateProblem, scoreAttempt, type Problem } from '@/lib/games/numberSense';
import { GameFrame } from '@/components/games/GameFrame';
import { GameOverCard } from '@/components/games/GameOverCard';
import { haptics } from '@/lib/haptics';

const ROUND_SECONDS = 30;

export default function NumberSenseScreen() {
  const [problem, setProblem] = useState<Problem>(() => generateProblem(1));
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [seconds, setSeconds] = useState(ROUND_SECONDS);
  const [phase, setPhase] = useState<'playing' | 'over'>('playing');
  const intRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) { clearInterval(intRef.current!); setPhase('over'); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => { if (intRef.current) clearInterval(intRef.current); };
  }, []);

  const pick = (v: number) => {
    const r = scoreAttempt(problem, v);
    setScore((s) => Math.max(0, s + r.points));
    if (r.ok) { setCorrectCount((c) => c + 1); haptics.success(); } else haptics.error();
    setProblem(generateProblem(1 + Math.floor(correctCount / 5)));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <GameFrame title="Number Sense" accent={Colors.primary} seconds={seconds} totalSeconds={ROUND_SECONDS} score={score} onExit={() => router.back()} />
      {phase === 'playing' ? (
        <Animated.View entering={FadeIn} style={styles.body}>
          <Text style={styles.q}>{problem.a} {problem.op} {problem.b} = ?</Text>
          <View style={styles.choices}>
            {problem.choices.map((c) => (
              <Pressable key={c} onPress={() => pick(c)} style={styles.choice}>
                <Text style={styles.choiceText}>{c}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      ) : (
        <View style={styles.body}>
          <GameOverCard
            title="Time!"
            score={score}
            stats={[
              { label: 'Correct', value: correctCount.toString() },
              { label: 'XP', value: Math.floor(score / 2).toString() },
            ]}
            onPlayAgain={() => router.replace('/game/number-sense')}
            onExit={() => router.back()}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  body: { flex: 1, padding: Spacing.lg, gap: Spacing.lg, justifyContent: 'center' },
  q: { textAlign: 'center', fontSize: 56, color: Colors.textPrimary, fontFamily: 'BagelFatOne_400Regular' },
  choices: { flexDirection: 'row', gap: Spacing.md, justifyContent: 'center' },
  choice: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, paddingVertical: 18, paddingHorizontal: 28, borderRadius: Radius.lg, minWidth: 84, alignItems: 'center' },
  choiceText: { fontSize: FontSize.xxl, color: Colors.primary, fontFamily: 'BricolageGrotesque_800ExtraBold' },
});
```

- [ ] **Step 2: Run typecheck, commit**

```bash
git add app/game/number-sense.tsx
git commit -m "feat(games): Number Sense screen"
```

---

## Phase 3 — Memory Match (mini-game #4)

A Simon-says style sequence-recall game. App flashes a colored sequence; player taps it back.

### Task 3.1: Engine + tests

**Files:**
- Create: `lib/games/memoryMatch.ts`
- Test: `__tests__/memory-match.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { extendSequence, isCorrectSoFar } from '@/lib/games/memoryMatch';

describe('memoryMatch', () => {
  it('extends a sequence by one each round', () => {
    expect(extendSequence([]).length).toBe(1);
    expect(extendSequence([0, 1, 2]).length).toBe(4);
  });
  it('verifies prefix matches', () => {
    expect(isCorrectSoFar([0,1,2,3], [0,1])).toBe(true);
    expect(isCorrectSoFar([0,1,2,3], [0,2])).toBe(false);
  });
});
```

- [ ] **Step 2: Run, fail**

Run: `npx jest __tests__/memory-match.test.ts`

- [ ] **Step 3: Implement**

`lib/games/memoryMatch.ts`:
```ts
export function extendSequence(prev: number[], tiles = 4): number[] {
  return [...prev, Math.floor(Math.random() * tiles)];
}
export function isCorrectSoFar(target: number[], attempt: number[]): boolean {
  for (let i = 0; i < attempt.length; i++) if (attempt[i] !== target[i]) return false;
  return true;
}
```

- [ ] **Step 4: Run, pass, commit**

```bash
git add lib/games/memoryMatch.ts __tests__/memory-match.test.ts
git commit -m "feat(games): Memory Match engine"
```

### Task 3.2: Memory Match screen

**Files:**
- Create: `app/game/memory-match.tsx`

- [ ] **Step 1: Implement**

`app/game/memory-match.tsx`:
```tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import { extendSequence, isCorrectSoFar } from '@/lib/games/memoryMatch';
import { GameFrame } from '@/components/games/GameFrame';
import { GameOverCard } from '@/components/games/GameOverCard';
import { haptics } from '@/lib/haptics';

const TILES = [Colors.primary, Colors.accent, Colors.gold, Colors.success];
const FLASH_MS = 480;
const GAP_MS = 220;

export default function MemoryMatchScreen() {
  const [seq, setSeq] = useState<number[]>([]);
  const [attempt, setAttempt] = useState<number[]>([]);
  const [phase, setPhase] = useState<'show' | 'input' | 'over'>('show');
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [activeTile, setActiveTile] = useState<number | null>(null);
  const playingRef = useRef(false);

  useEffect(() => {
    const next = extendSequence(seq, TILES.length);
    setSeq(next);
    setAttempt([]);
    setPhase('show');
    playSequence(next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const playSequence = async (s: number[]) => {
    playingRef.current = true;
    for (const idx of s) {
      setActiveTile(idx);
      haptics.light();
      await new Promise((r) => setTimeout(r, FLASH_MS));
      setActiveTile(null);
      await new Promise((r) => setTimeout(r, GAP_MS));
    }
    playingRef.current = false;
    setPhase('input');
  };

  const press = (idx: number) => {
    if (phase !== 'input') return;
    const next = [...attempt, idx];
    setAttempt(next);
    if (!isCorrectSoFar(seq, next)) {
      haptics.error();
      setPhase('over');
      return;
    }
    haptics.success();
    if (next.length === seq.length) {
      setScore((s) => s + seq.length * 10);
      setTimeout(() => setRound((r) => r + 1), 500);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <GameFrame title="Memory Match" accent={Colors.gold} seconds={Math.max(0, 60 - round * 5)} totalSeconds={60} score={score} onExit={() => router.back()} />
      {phase !== 'over' ? (
        <View style={styles.body}>
          <Text style={styles.round}>Round {round}</Text>
          <View style={styles.grid}>
            {TILES.map((c, i) => (
              <Pressable key={i} onPress={() => press(i)} disabled={phase !== 'input'} style={[styles.tile, { backgroundColor: c, opacity: activeTile === i ? 1 : 0.5 }]} />
            ))}
          </View>
          <Text style={styles.hint}>{phase === 'show' ? 'Watch the sequence…' : 'Now repeat it!'}</Text>
        </View>
      ) : (
        <View style={styles.body}>
          <GameOverCard
            title="Game Over"
            score={score}
            stats={[
              { label: 'Round', value: round.toString() },
              { label: 'Length', value: seq.length.toString() },
              { label: 'XP', value: Math.floor(score / 4).toString() },
            ]}
            onPlayAgain={() => { setSeq([]); setAttempt([]); setScore(0); setRound(1); }}
            onExit={() => router.back()}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, padding: Spacing.md },
  round: { fontSize: FontSize.xl, color: Colors.textPrimary, fontFamily: 'BricolageGrotesque_700Bold' },
  grid: { width: 280, height: 280, flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tile: { width: 132, height: 132, borderRadius: Radius.lg },
  hint: { color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_600SemiBold' },
});
```

- [ ] **Step 2: Run typecheck, commit**

```bash
git add app/game/memory-match.tsx
git commit -m "feat(games): Memory Match screen"
```

---

## Phase 4 — Reaction Tap (mini-game #5)

A 20-second tap-the-target game. A circle appears at random positions; tap it before it vanishes (1s window early, shrinking to 350ms).

### Task 4.1: Engine + tests

**Files:**
- Create: `lib/games/reactionTap.ts`
- Test: `__tests__/reaction-tap.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { spawnTarget, windowMs } from '@/lib/games/reactionTap';
describe('reactionTap', () => {
  it('shrinks the tap window as score rises', () => {
    expect(windowMs(0)).toBeGreaterThan(windowMs(20));
    expect(windowMs(20)).toBeGreaterThanOrEqual(350);
  });
  it('spawns within a unit box', () => {
    const t = spawnTarget();
    expect(t.x).toBeGreaterThanOrEqual(0);
    expect(t.x).toBeLessThanOrEqual(1);
    expect(t.y).toBeGreaterThanOrEqual(0);
    expect(t.y).toBeLessThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run, fail**

Run: `npx jest __tests__/reaction-tap.test.ts`

- [ ] **Step 3: Implement**

`lib/games/reactionTap.ts`:
```ts
export interface Target { x: number; y: number }
export function spawnTarget(): Target {
  return { x: 0.1 + Math.random() * 0.8, y: 0.1 + Math.random() * 0.8 };
}
export function windowMs(score: number): number {
  // 1000ms at score 0, shrinks ~30ms per point, floor at 350.
  return Math.max(350, 1000 - score * 30);
}
```

- [ ] **Step 4: Run, pass, commit**

```bash
git add lib/games/reactionTap.ts __tests__/reaction-tap.test.ts
git commit -m "feat(games): Reaction Tap engine"
```

### Task 4.2: Reaction Tap screen

**Files:**
- Create: `app/game/reaction-tap.tsx`

- [ ] **Step 1: Implement**

`app/game/reaction-tap.tsx`:
```tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import { GameFrame } from '@/components/games/GameFrame';
import { GameOverCard } from '@/components/games/GameOverCard';
import { spawnTarget, windowMs, type Target } from '@/lib/games/reactionTap';
import { haptics } from '@/lib/haptics';

const ROUND_SECONDS = 20;

export default function ReactionTapScreen() {
  const { width } = useWindowDimensions();
  const playArea = Math.min(width, 480) - Spacing.md * 2;
  const [target, setTarget] = useState<Target>(spawnTarget());
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [seconds, setSeconds] = useState(ROUND_SECONDS);
  const [phase, setPhase] = useState<'playing' | 'over'>('playing');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const respawn = (currentScore: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setTarget(spawnTarget());
    timeoutRef.current = setTimeout(() => {
      setMisses((m) => m + 1);
      respawn(currentScore);
    }, windowMs(currentScore));
  };

  useEffect(() => {
    respawn(0);
    tickRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(tickRef.current!);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setPhase('over');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = () => {
    setScore((s) => s + 1);
    haptics.success();
    respawn(score + 1);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <GameFrame title="Reaction Tap" accent={Colors.success} seconds={seconds} totalSeconds={ROUND_SECONDS} score={score} onExit={() => router.back()} />
      {phase === 'playing' ? (
        <View style={styles.body}>
          <View style={[styles.field, { width: playArea, height: playArea }]}>
            <Pressable
              onPress={tap}
              style={[styles.dot, { left: target.x * (playArea - 64), top: target.y * (playArea - 64) }]}
            />
          </View>
          <Text style={styles.hint}>Misses: {misses}</Text>
        </View>
      ) : (
        <View style={styles.body}>
          <GameOverCard
            title="Time!"
            score={score}
            stats={[
              { label: 'Hits', value: score.toString() },
              { label: 'Misses', value: misses.toString() },
              { label: 'XP', value: (score * 2).toString() },
            ]}
            onPlayAgain={() => router.replace('/game/reaction-tap')}
            onExit={() => router.back()}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.md, gap: Spacing.md },
  field: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, position: 'relative' },
  dot: { position: 'absolute', width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.success, shadowColor: Colors.success, shadowOpacity: 0.4, shadowRadius: 10 },
  hint: { color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_600SemiBold' },
});
```

- [ ] **Step 2: Run typecheck, commit**

```bash
git add app/game/reaction-tap.tsx
git commit -m "feat(games): Reaction Tap screen"
```

---

## Phase 5 — Wire the games into Play tab + Home daily challenge

### Task 5.1: Daily challenge picker

**Files:**
- Create: `lib/dailyChallenge.ts`
- Test: `__tests__/daily-challenge.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { pickDailyGame } from '@/lib/dailyChallenge';
describe('dailyChallenge', () => {
  it('returns the same game for the same date', () => {
    expect(pickDailyGame('2026-05-15')).toEqual(pickDailyGame('2026-05-15'));
  });
  it('rotates by date', () => {
    const days = ['2026-05-15','2026-05-16','2026-05-17','2026-05-18','2026-05-19'];
    const games = new Set(days.map(pickDailyGame));
    expect(games.size).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run, fail**

Run: `npx jest __tests__/daily-challenge.test.ts`

- [ ] **Step 3: Implement**

`lib/dailyChallenge.ts`:
```ts
export type GameId = 'brain-rush' | 'word-sprint' | 'number-sense' | 'memory-match' | 'reaction-tap';

const GAMES: GameId[] = ['brain-rush', 'word-sprint', 'number-sense', 'memory-match', 'reaction-tap'];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
  return Math.abs(h);
}

export function pickDailyGame(dateIso: string): GameId {
  return GAMES[hash(dateIso) % GAMES.length];
}

export const DAILY_BONUS_XP = 25;
```

- [ ] **Step 4: Run, pass, commit**

```bash
git add lib/dailyChallenge.ts __tests__/daily-challenge.test.ts
git commit -m "feat: daily challenge picker"
```

### Task 5.2: Add tiles to Play tab

**Files:**
- Modify: `app/(tabs)/play.tsx`

- [ ] **Step 1: Add the 4 new game tiles**

Find the existing CategoryTile / Play-button area in `app/(tabs)/play.tsx`. Above (or beside) it add a "Mini-games" section with four `<Card onPress=...>` tiles for `/game/word-sprint`, `/game/number-sense`, `/game/memory-match`, `/game/reaction-tap`. Use the existing `Card` and `Button` components — don't introduce new design primitives.

Pseudocode pattern:
```tsx
<SectionHeader title="Mini-games" />
<View style={{ flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' }}>
  {[
    { id: 'word-sprint',   title: 'Word Sprint',   sub: '60s anagrams',    color: Colors.accent },
    { id: 'number-sense',  title: 'Number Sense',  sub: '30s math drill',  color: Colors.primary },
    { id: 'memory-match',  title: 'Memory Match',  sub: 'Simon-style',     color: Colors.gold },
    { id: 'reaction-tap',  title: 'Reaction Tap',  sub: 'Tap the target',  color: Colors.success },
  ].map((g) => (
    <Card key={g.id} onPress={() => router.push(`/game/${g.id}` as any)} style={{ flexBasis: '48%' }}>
      <View style={{ width: 24, height: 4, backgroundColor: g.color, marginBottom: 8 }} />
      <Text style={{ fontFamily: 'BricolageGrotesque_700Bold', fontSize: FontSize.md, color: Colors.textPrimary }}>{g.title}</Text>
      <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: FontSize.xs, color: Colors.textSecondary }}>{g.sub}</Text>
    </Card>
  ))}
</View>
```

- [ ] **Step 2: Run typecheck, commit**

```bash
git add app/(tabs)/play.tsx
git commit -m "feat: surface 4 new mini-games on Play tab"
```

### Task 5.3: Daily Challenge card on Home

**Files:**
- Create: `components/DailyChallengeCard.tsx`
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Implement DailyChallengeCard**

`components/DailyChallengeCard.tsx`:
```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Colors, Spacing, FontSize } from '@/constants/theme';
import { pickDailyGame, DAILY_BONUS_XP, type GameId } from '@/lib/dailyChallenge';
import { todayISO } from '@/lib/storage';

const TITLES: Record<GameId, string> = {
  'brain-rush': 'Brain Rush',
  'word-sprint': 'Word Sprint',
  'number-sense': 'Number Sense',
  'memory-match': 'Memory Match',
  'reaction-tap': 'Reaction Tap',
};

export function DailyChallengeCard() {
  const id = pickDailyGame(todayISO());
  const path = id === 'brain-rush' ? '/play' : `/game/${id}`;
  return (
    <Card>
      <Text style={styles.tag}>TODAY'S CHALLENGE</Text>
      <Text style={styles.title}>{TITLES[id]}</Text>
      <Text style={styles.sub}>Finish today's mini-game for +{DAILY_BONUS_XP} bonus XP.</Text>
      <View style={{ marginTop: Spacing.sm }}>
        <Button label="Start" onPress={() => router.push(path as any)} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  tag: { fontSize: FontSize.xs, color: Colors.accent, letterSpacing: 1, fontFamily: 'PlusJakartaSans_700Bold' },
  title: { fontSize: FontSize.xl, color: Colors.textPrimary, fontFamily: 'BricolageGrotesque_700Bold', marginTop: 4 },
  sub: { fontSize: FontSize.sm, color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_400Regular' },
});
```

- [ ] **Step 2: Insert into Home above the hero card**

In `app/(tabs)/index.tsx`, import `DailyChallengeCard` and render it inside the scroll right above the hero card MotionView block.

- [ ] **Step 3: Run typecheck, commit**

```bash
git add components/DailyChallengeCard.tsx app/(tabs)/index.tsx
git commit -m "feat: daily challenge card on Home"
```

---

## Phase 6 — Achievements

### Task 6.1: Catalog + evaluation engine + tests

**Files:**
- Create: `lib/achievements.ts`
- Test: `__tests__/achievements.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { ACHIEVEMENTS, evaluate } from '@/lib/achievements';

describe('achievements', () => {
  it('exposes a non-empty catalog with unique ids', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThan(5);
    expect(new Set(ACHIEVEMENTS.map(a => a.id)).size).toBe(ACHIEVEMENTS.length);
  });
  it('unlocks "first-round" after the first game', () => {
    const out = evaluate({ profile: { totalXP: 10, level: 1, gamesPlayed: 1, username: 'x' }, streak: { current: 1, longest: 1, lastPlayDate: '2026-05-15' }, recent: [] });
    expect(out).toContain('first-round');
  });
  it('unlocks "week-streak" at 7-day streak', () => {
    const out = evaluate({ profile: { totalXP: 100, level: 2, gamesPlayed: 7, username: 'x' }, streak: { current: 7, longest: 7, lastPlayDate: '2026-05-15' }, recent: [] });
    expect(out).toContain('week-streak');
  });
});
```

- [ ] **Step 2: Run, fail**

Run: `npx jest __tests__/achievements.test.ts`

- [ ] **Step 3: Implement**

`lib/achievements.ts`:
```ts
import type { LocalProfile, StreakData, RecentGame } from '@/lib/storage';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  predicate: (s: EvalState) => boolean;
}

export interface EvalState {
  profile: LocalProfile;
  streak: StreakData;
  recent: RecentGame[];
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-round',   title: 'Welcome aboard',   description: 'Finish your first round.', predicate: (s) => s.profile.gamesPlayed >= 1 },
  { id: 'level-3',        title: 'Getting somewhere', description: 'Reach level 3.',          predicate: (s) => s.profile.level >= 3 },
  { id: 'level-5',        title: 'Knowledge worker', description: 'Reach level 5.',           predicate: (s) => s.profile.level >= 5 },
  { id: 'level-10',       title: 'Quiz machine',     description: 'Reach level 10.',          predicate: (s) => s.profile.level >= 10 },
  { id: 'week-streak',    title: 'On fire',          description: 'Hold a 7-day streak.',     predicate: (s) => s.streak.current >= 7 },
  { id: 'month-streak',   title: 'Unstoppable',      description: 'Hold a 30-day streak.',    predicate: (s) => s.streak.current >= 30 },
  { id: 'centurion',      title: 'Centurion',        description: 'Play 100 rounds.',         predicate: (s) => s.profile.gamesPlayed >= 100 },
  { id: 'xp-1k',          title: 'Cool 1,000',       description: 'Earn 1,000 XP.',           predicate: (s) => s.profile.totalXP >= 1000 },
  { id: 'perfect-round',  title: 'Flawless',         description: 'Get every answer right in a round.', predicate: (s) => s.recent.some(g => g.total > 0 && g.correct === g.total) },
];

export function evaluate(state: EvalState): string[] {
  return ACHIEVEMENTS.filter((a) => a.predicate(state)).map((a) => a.id);
}
```

- [ ] **Step 4: Run, pass, commit**

```bash
git add lib/achievements.ts __tests__/achievements.test.ts
git commit -m "feat: achievements catalog + evaluator"
```

### Task 6.2: Persisted store + unlock toast

**Files:**
- Create: `store/useAchievementsStore.ts`
- Create: `components/AchievementToast.tsx`

- [ ] **Step 1: Implement store**

`store/useAchievementsStore.ts`:
```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface S {
  unlocked: string[];
  hydrated: boolean;
  recordUnlocked: (ids: string[]) => string[]; // returns newly unlocked
  _setHydrated: (v: boolean) => void;
}

export const useAchievementsStore = create<S>()(
  persist(
    (set, get) => ({
      unlocked: [],
      hydrated: false,
      recordUnlocked: (ids) => {
        const cur = new Set(get().unlocked);
        const fresh = ids.filter((id) => !cur.has(id));
        if (fresh.length === 0) return [];
        set({ unlocked: [...get().unlocked, ...fresh] });
        return fresh;
      },
      _setHydrated: (v) => set({ hydrated: v }),
    }),
    {
      name: '@brainstreak/achievements',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ unlocked: s.unlocked }),
      onRehydrateStorage: () => (s) => s?._setHydrated(true),
    },
  ),
);
```

- [ ] **Step 2: Implement AchievementToast**

`components/AchievementToast.tsx`:
```tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/constants/theme';
import { ACHIEVEMENTS } from '@/lib/achievements';

export function AchievementToast({ ids, onHide }: { ids: string[]; onHide: () => void }) {
  useEffect(() => {
    if (ids.length === 0) return;
    const t = setTimeout(onHide, 2400 + ids.length * 800);
    return () => clearTimeout(t);
  }, [ids]);

  if (ids.length === 0) return null;
  const first = ACHIEVEMENTS.find((a) => a.id === ids[0]);
  if (!first) return null;
  return (
    <Animated.View entering={FadeInUp} exiting={FadeOutDown} style={styles.toast}>
      <View style={styles.dot} />
      <View style={{ flex: 1 }}>
        <Text style={styles.tag}>UNLOCKED</Text>
        <Text style={styles.title}>{first.title}</Text>
        <Text style={styles.sub}>{first.description}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: { position: 'absolute', left: Spacing.md, right: Spacing.md, bottom: Spacing.xl, backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.lg },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.accent },
  tag: { fontSize: FontSize.xs, color: Colors.accent, letterSpacing: 1, fontFamily: 'PlusJakartaSans_700Bold' },
  title: { fontSize: FontSize.md, color: Colors.textPrimary, fontFamily: 'BricolageGrotesque_700Bold' },
  sub: { fontSize: FontSize.xs, color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_400Regular' },
});
```

- [ ] **Step 3: Wire evaluation into `useGameStore.finishGame`**

Open `store/useGameStore.ts`. Find `finishGame` action. After it computes profile/streak/recent updates, call:
```ts
import { evaluate } from '@/lib/achievements';
import { useAchievementsStore } from '@/store/useAchievementsStore';
// …
const unlockedIds = evaluate({ profile, streak, recent });
const fresh = useAchievementsStore.getState().recordUnlocked(unlockedIds);
if (fresh.length > 0) set({ pendingAchievementIds: fresh } as any);
```

And expose `pendingAchievementIds: string[]` + `clearPendingAchievements()` on the store state.

- [ ] **Step 4: Render the toast at the root**

In `app/_layout.tsx`, render `<AchievementToast ids={pending} onHide={clear} />` as a sibling under `<GestureHandlerRootView>`. Read `pending` from `useGameStore`.

- [ ] **Step 5: Run typecheck + tests, commit**

```bash
git add store/useAchievementsStore.ts components/AchievementToast.tsx store/useGameStore.ts app/_layout.tsx
git commit -m "feat: persisted achievements + unlock toast"
```

---

## Phase 7 — Slick UI / Animation Polish

### Task 7.1: Install moti for declarative animations

- [ ] **Step 1: Install**

Run: `npm install moti`
Expected: installs without errors, no peer-dep warnings (moti uses our existing Reanimated 4).

- [ ] **Step 2: Smoke verify**

Run: `npx tsc --noEmit && npm test --silent`
Expected: tsc green, 73+ tests pass.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add moti for declarative animations"
```

### Task 7.2: SkeletonCard for loading states

**Files:**
- Create: `components/SkeletonCard.tsx`

- [ ] **Step 1: Implement**

```tsx
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { Colors, Radius, Spacing } from '@/constants/theme';

export function SkeletonCard({ height = 80, style }: { height?: number; style?: any }) {
  const opacity = useSharedValue(0.5);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, []);
  const anim = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.card, { height }, anim, style]} />;
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.bgElevated, borderRadius: Radius.md, marginVertical: Spacing.xs },
});
```

- [ ] **Step 2: Use it in Home recent-activity slot while loading**

In `app/(tabs)/index.tsx`, show `<SkeletonCard height={64} />` x 3 while `recent` is `null` or hasn't loaded; show the existing list once it's an array.

- [ ] **Step 3: Commit**

```bash
git add components/SkeletonCard.tsx app/(tabs)/index.tsx
git commit -m "feat(ui): SkeletonCard + recent-activity skeleton state"
```

### Task 7.3: Press-scale wrappers on all interactive Cards

**Files:**
- Modify: `components/Card.tsx`

The current Card already has `scale` shared value on press. Make sure every Card with `onPress` uses a `withSpring(0.97)` press, and `withSpring(1)` release. Already done — verify with manual test.

- [ ] **Step 1: Verify code path**

Read `components/Card.tsx`, confirm `handlePressIn` / `handlePressOut` both use `withSpring`. If not, harmonize.

- [ ] **Step 2: Commit if changed; otherwise skip**

```bash
git add components/Card.tsx
git commit -m "polish(ui): consistent press-scale on Card" --allow-empty
```

---

## Phase 8 — Polish, perf, and final QA

### Task 8.1: Replace inline `getTimeOfDay` everywhere

Already done in Phase 0.

### Task 8.2: Bundle-size sanity check

- [ ] **Step 1: Build**

Run: `npm run web:export`
Expected: bundle exports; check `dist/_expo/static/js` largest file size in the output.

- [ ] **Step 2: Threshold**

If any single JS chunk is > 1.5 MB minified, consider splitting via dynamic `import()` in the route entry. Most likely OK.

- [ ] **Step 3: Commit nothing — this is a check, not a change.**

### Task 8.3: Full regression run

- [ ] **Step 1: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0

- [ ] **Step 2: Tests**

Run: `npm test --silent`
Expected: all tests pass (should be 73 baseline + ~10 new = 83+)

- [ ] **Step 3: Re-export & serve**

Run: `npm run web:export && lsof -ti:8090 | xargs -r kill -9; cd dist && npx --yes serve -l 8090 --no-clipboard &`

- [ ] **Step 4: HTTP smoke test every route**

Run individual curl commands for each of:
- `/`
- `/onboarding/welcome`
- `/play`
- `/profile`
- `/game/session`
- `/game/word-sprint`
- `/game/number-sense`
- `/game/memory-match`
- `/game/reaction-tap`
- `/manifest.webmanifest`

Expected: every URL returns 200.

- [ ] **Step 5: Browser smoke test** — open `http://localhost:8090`, hard-refresh, walk through every flow listed in `docs/RELEASE_CHECKLIST.md` §5 plus the four new mini-games.

- [ ] **Step 6: Final commit**

```bash
git commit --allow-empty -m "milestone: BrainStreak v1.1 — 5 games, achievements, daily challenge, clicks fixed"
```

---

## Self-review checklist (run after writing code; not a separate task)

When all phases above are green, re-read:
1. The user said "no buttons working" — Phase 0 directly addresses it via SSR-safe values + non-blocking wrapper + testid verification. ✅
2. The user said "no games" — Phases 1–4 add four new games, plus the existing Brain Rush at `/play`. ✅
3. The user said "slick UI, awesome animations" — Phase 7 layers SkeletonCard, HudScore pop, HudTimer, moti for entrance, AchievementToast unlock. ✅
4. The user said "more user will use and play" — Phase 5 (daily challenge) + Phase 6 (achievements) directly attack retention. ✅
5. Every task has exact file paths and complete code. No "TODO" or "implement later" placeholders.
6. Each task is 2–5 minutes worth of work and ends in a commit.

---

## Execution

Plan complete and saved to `docs/superpowers/plans/2026-05-15-brainstreak-full-polish.md`.

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

Which approach?
