# BrainStreak Phase 2 — Game Loop Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ad-hoc game-session code with a set of polished, focused primitives — `TimerRing`, `QuestionCard`, `AnswerButton`, `XPBar`, `ConfettiBurst` — wired through the haptics wrapper, a new audio wrapper, and `Config` constants. Add background prefetch of the next round's questions so retries feel instant.

**Architecture:** Each component is a single-responsibility presentational unit. Animations use Reanimated 3 (already installed). The TimerRing uses SVG via `react-native-svg`. ConfettiBurst wraps `react-native-confetti-cannon`. `lib/audio.ts` is a thin settings-aware wrapper around `expo-audio` (already installed); sound files live in `assets/sounds/` and the wrapper no-ops gracefully if a file is missing. Prefetch logic lives in `lib/prefetch.ts` (pure, easy to test), and is invoked from the session screen after Q3.

**Tech Stack:** Expo SDK 54, React Native 0.81, Reanimated 3, react-native-svg, react-native-confetti-cannon, expo-audio, Zustand (existing store), Jest 29.

---

## File Map

**Files created in this phase:**
- `components/TimerRing.tsx` — SVG circular timer with color phases
- `components/QuestionCard.tsx` — question text + category + difficulty badges
- `components/AnswerButton.tsx` — A/B/C/D button with idle/selected/correct/wrong states
- `components/XPBar.tsx` — level label + animated progress bar
- `components/ConfettiBurst.tsx` — confetti wrapper, fires once on mount
- `lib/audio.ts` — settings-aware audio wrapper
- `lib/prefetch.ts` — pure helper deciding what to prefetch next
- `assets/sounds/README.md` — placeholder doc; .mp3 files added in Phase 6
- `__tests__/prefetch.test.ts` — prefetch helper tests

**Files modified in this phase:**
- `package.json` — add `react-native-svg`, `react-native-confetti-cannon`
- `store/useGameStore.ts` — add `prefetchedQuestions` slot + actions; consume `Config` constants
- `app/game/session.tsx` — full refactor to use new components and wrappers

**Files deleted in this phase:**
- `components/Timer.tsx` — replaced by `TimerRing`

---

### Task 1: Install react-native-svg and react-native-confetti-cannon

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install both libs**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npm install --legacy-peer-deps react-native-svg react-native-confetti-cannon
```

Expected: both packages added to `dependencies`. May show peer warnings — acceptable.

- [ ] **Step 2: Verify expo metro config picks them up**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx expo config --type public 2>&1 | head -5
```

Expected: prints config without errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "Add react-native-svg and react-native-confetti-cannon for Phase 2"
```

---

### Task 2: Extend useGameStore with prefetch state and Config constants

**Files:**
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Replace store/useGameStore.ts**

Replace the entire contents of `store/useGameStore.ts` with:

```ts
import { create } from 'zustand';
import { TriviaQuestion, RoundResult, calculatePoints, calculateXP } from '@/lib/trivia';
import { updateStreakAfterGame, updateXP } from '@/lib/storage';
import { Config } from '@/constants/config';

export type GamePhase = 'idle' | 'countdown' | 'playing' | 'result' | 'gameover';

interface GameState {
  phase: GamePhase;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'any';

  questions: TriviaQuestion[];
  currentIndex: number;
  currentQuestion: TriviaQuestion | null;

  selectedAnswer: string | null;
  timeLeft: number;
  roundResults: RoundResult[];

  totalScore: number;
  xpEarned: number;
  correctCount: number;

  // Phase 2: prefetch
  prefetchedQuestions: TriviaQuestion[] | null;
  prefetchedCategory: string | null;

  startGame: (questions: TriviaQuestion[], category: string) => void;
  selectAnswer: (answer: string, timeTaken: number) => void;
  nextQuestion: () => void;
  finishGame: () => Promise<void>;
  resetGame: () => void;
  setTimeLeft: (t: number) => void;
  timeExpired: () => void;
  setPrefetched: (questions: TriviaQuestion[], category: string) => void;
  consumePrefetched: () => { questions: TriviaQuestion[]; category: string } | null;
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'idle',
  category: 'mixed',
  difficulty: 'any',
  questions: [],
  currentIndex: 0,
  currentQuestion: null,
  selectedAnswer: null,
  timeLeft: Config.ROUND_TIME_SECONDS,
  roundResults: [],
  totalScore: 0,
  xpEarned: 0,
  correctCount: 0,
  prefetchedQuestions: null,
  prefetchedCategory: null,

  startGame: (questions, category) => {
    set({
      phase: 'countdown',
      questions,
      category,
      currentIndex: 0,
      currentQuestion: questions[0] ?? null,
      selectedAnswer: null,
      timeLeft: Config.ROUND_TIME_SECONDS,
      roundResults: [],
      totalScore: 0,
      xpEarned: 0,
      correctCount: 0,
    });
    setTimeout(() => set({ phase: 'playing' }), Config.COUNTDOWN_SECONDS * 1000);
  },

  selectAnswer: (answer, timeTaken) => {
    const { currentQuestion, totalScore, roundResults, correctCount } = get();
    if (!currentQuestion || get().selectedAnswer !== null) return;

    const isCorrect = answer === currentQuestion.correct_answer;
    const points = calculatePoints(isCorrect, currentQuestion.difficulty, timeTaken);
    const newScore = totalScore + points;

    const result: RoundResult = {
      question: currentQuestion,
      selectedAnswer: answer,
      isCorrect,
      timeTaken,
      pointsEarned: points,
    };

    set({
      selectedAnswer: answer,
      totalScore: newScore,
      correctCount: isCorrect ? correctCount + 1 : correctCount,
      roundResults: [...roundResults, result],
      phase: 'result',
    });
  },

  timeExpired: () => {
    const { currentQuestion, roundResults } = get();
    if (!currentQuestion || get().selectedAnswer !== null) return;

    const result: RoundResult = {
      question: currentQuestion,
      selectedAnswer: null,
      isCorrect: false,
      timeTaken: Config.ROUND_TIME_SECONDS,
      pointsEarned: 0,
    };

    set({
      selectedAnswer: null,
      roundResults: [...roundResults, result],
      phase: 'result',
    });
  },

  nextQuestion: () => {
    const { currentIndex, questions } = get();
    const next = currentIndex + 1;

    if (next >= questions.length) {
      get().finishGame();
    } else {
      set({
        currentIndex: next,
        currentQuestion: questions[next],
        selectedAnswer: null,
        timeLeft: Config.ROUND_TIME_SECONDS,
        phase: 'playing',
      });
    }
  },

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

  resetGame: () => {
    set({
      phase: 'idle',
      questions: [],
      currentIndex: 0,
      currentQuestion: null,
      selectedAnswer: null,
      timeLeft: Config.ROUND_TIME_SECONDS,
      roundResults: [],
      totalScore: 0,
      xpEarned: 0,
      correctCount: 0,
    });
  },

  setTimeLeft: (t) => set({ timeLeft: t }),

  setPrefetched: (questions, category) =>
    set({ prefetchedQuestions: questions, prefetchedCategory: category }),

  consumePrefetched: () => {
    const { prefetchedQuestions, prefetchedCategory } = get();
    if (!prefetchedQuestions || !prefetchedCategory) return null;
    set({ prefetchedQuestions: null, prefetchedCategory: null });
    return { questions: prefetchedQuestions, category: prefetchedCategory };
  },
}));
```

- [ ] **Step 2: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add store/useGameStore.ts
git commit -m "Wire useGameStore to Config constants and add prefetch slot"
```

---

### Task 3: Add lib/audio.ts settings-aware wrapper

**Files:**
- Create: `lib/audio.ts`

- [ ] **Step 1: Create lib/audio.ts**

Create `lib/audio.ts`:

```ts
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { useSettingsStore } from '@/store/useSettingsStore';

// Settings-aware audio. Reads `soundOn` from useSettingsStore on each call.
// Centralizing here means screens never import expo-audio directly.
//
// If a sound file is missing or fails to load, the loader logs a warning
// and the corresponding play() becomes a no-op. This lets us ship the
// wiring before the actual mp3s land in Phase 6.

type SoundKey = 'tick' | 'correct' | 'wrong' | 'fanfare';

const SOURCES: Record<SoundKey, number | null> = {
  tick: tryRequire('@/assets/sounds/tick.mp3'),
  correct: tryRequire('@/assets/sounds/correct.mp3'),
  wrong: tryRequire('@/assets/sounds/wrong.mp3'),
  fanfare: tryRequire('@/assets/sounds/fanfare.mp3'),
};

function tryRequire(_path: string): number | null {
  // require() can't take a variable in React Native; we hard-code below.
  return null;
}

// Pre-construct players lazily. createAudioPlayer needs an asset module.
// We build them on first play() call and reuse.
const players: Partial<Record<SoundKey, AudioPlayer | null>> = {};

function getPlayer(key: SoundKey): AudioPlayer | null {
  if (key in players) return players[key] ?? null;
  let source: number | null = null;
  try {
    if (key === 'tick') source = require('@/assets/sounds/tick.mp3');
    else if (key === 'correct') source = require('@/assets/sounds/correct.mp3');
    else if (key === 'wrong') source = require('@/assets/sounds/wrong.mp3');
    else if (key === 'fanfare') source = require('@/assets/sounds/fanfare.mp3');
  } catch {
    source = null;
  }
  if (source == null) {
    players[key] = null;
    return null;
  }
  try {
    const p = createAudioPlayer(source);
    players[key] = p;
    return p;
  } catch (e) {
    console.warn(`[audio] failed to create player for ${key}:`, e);
    players[key] = null;
    return null;
  }
}

function play(key: SoundKey) {
  if (!useSettingsStore.getState().soundOn) return;
  const p = getPlayer(key);
  if (!p) return;
  try {
    p.seekTo(0);
    p.play();
  } catch (e) {
    // swallow — audio failures should never crash the game
  }
}

export const audio = {
  tick: () => play('tick'),
  correct: () => play('correct'),
  wrong: () => play('wrong'),
  fanfare: () => play('fanfare'),
};
```

- [ ] **Step 2: Create the assets/sounds directory and README**

Run:
```bash
mkdir -p /Users/basusingh/Desktop/Mob_App/assets/sounds
```

Create `assets/sounds/README.md`:

```markdown
# Sounds

Drop these short royalty-free `.mp3` files here in Phase 6:

- `tick.mp3` — soft click for the final 3 seconds of countdown
- `correct.mp3` — short upward chime, ~300 ms
- `wrong.mp3` — low buzz, ~250 ms
- `fanfare.mp3` — ~1.2 s celebratory cue for game-over

Files must be small (< 50 KB each) to keep bundle size down. Until
they exist, `lib/audio.ts` no-ops gracefully.

Sources we'll use in Phase 6: freesound.org (CC0) or pixabay.com/sound-effects.
```

- [ ] **Step 3: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors. (`createAudioPlayer` and `AudioPlayer` exports come from expo-audio.)

If `expo-audio` does not export `createAudioPlayer` or `AudioPlayer` under those names in the installed version, run:

```bash
node -e "console.log(Object.keys(require('expo-audio')))"
```

Inspect the keys. Expected modern keys include `createAudioPlayer`, `AudioPlayer`, `useAudioPlayer`. If only `useAudioPlayer` exists, the wrapper above won't work outside React; in that case, change `lib/audio.ts` to a hook-based pattern that returns a record of player refs from a top-level provider. For Phase 2 wiring, a simpler fallback is to use the older `expo-av` `Audio.Sound` API which is still supported. Capture which path was needed in the commit message.

- [ ] **Step 4: Commit**

```bash
git add lib/audio.ts assets/sounds/README.md
git commit -m "Add settings-aware audio wrapper; sound files land in Phase 6"
```

---

### Task 4: Build components/TimerRing.tsx

**Files:**
- Create: `components/TimerRing.tsx`

- [ ] **Step 1: Create the component**

Create `components/TimerRing.tsx`:

```tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  Easing,
  withSpring,
} from 'react-native-reanimated';
import { Colors, FontSize } from '@/constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface TimerRingProps {
  timeLeft: number;
  totalTime: number;
  size?: number;
  strokeWidth?: number;
}

export function TimerRing({
  timeLeft,
  totalTime,
  size = 88,
  strokeWidth = 8,
}: TimerRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = useSharedValue(1);
  const pulse = useSharedValue(1);

  useEffect(() => {
    progress.value = withTiming(timeLeft / totalTime, {
      duration: 600,
      easing: Easing.out(Easing.quad),
    });

    if (timeLeft > 0 && timeLeft <= 5) {
      pulse.value = withSpring(1.12, { damping: 6, stiffness: 200 }, () => {
        pulse.value = withSpring(1, { damping: 6, stiffness: 200 });
      });
    }
  }, [timeLeft, totalTime]);

  const animatedProps = useAnimatedProps(() => {
    const dashOffset = circumference * (1 - progress.value);
    const strokeColor =
      progress.value > 0.5
        ? Colors.success
        : progress.value > 0.25
        ? Colors.gold
        : Colors.danger;
    return {
      strokeDashoffset: dashOffset,
      stroke: strokeColor,
    };
  });

  const wrapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const numberColor =
    timeLeft <= 5 ? Colors.danger : timeLeft <= 10 ? Colors.gold : Colors.textPrimary;

  return (
    <Animated.View style={[styles.wrap, { width: size, height: size }, wrapStyle]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.bgOverlay}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
          animatedProps={animatedProps}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.number, { color: numberColor }]}>{timeLeft}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    inset: 0 as any,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontFamily: 'Outfit_900Black',
    fontSize: FontSize.xxl,
    lineHeight: FontSize.xxl + 2,
  },
});
```

- [ ] **Step 2: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors.

If `inset: 0 as any` complains under stricter TS modes, replace with explicit `top: 0, left: 0, right: 0, bottom: 0`.

- [ ] **Step 3: Commit**

```bash
git add components/TimerRing.tsx
git commit -m "Add TimerRing — animated SVG ring with color phases and pulse"
```

---

### Task 5: Build components/QuestionCard.tsx

**Files:**
- Create: `components/QuestionCard.tsx`

- [ ] **Step 1: Create the component**

Create `components/QuestionCard.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';

interface QuestionCardProps {
  question: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionKey: string | number;
}

const DIFFICULTY_COLOR: Record<QuestionCardProps['difficulty'], string> = {
  easy: Colors.success,
  medium: Colors.gold,
  hard: Colors.danger,
};

export function QuestionCard({ question, category, difficulty, questionKey }: QuestionCardProps) {
  return (
    <Animated.View
      key={questionKey}
      entering={FadeInRight.springify().damping(15)}
      exiting={FadeOutLeft.duration(200)}
      style={styles.wrap}
    >
      <View style={styles.badges}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{category}</Text>
        </View>
        <View style={[styles.difficultyBadge, { borderColor: DIFFICULTY_COLOR[difficulty] }]}>
          <Text style={[styles.difficultyText, { color: DIFFICULTY_COLOR[difficulty] }]}>
            {difficulty.toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={styles.question}>{question}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: Colors.bgElevated,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
  },
  categoryText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  difficultyBadge: {
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: Radius.full,
  },
  difficultyText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: FontSize.xs,
    letterSpacing: 0.5,
  },
  question: {
    fontFamily: 'Outfit_700Bold',
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    lineHeight: 30,
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
git add components/QuestionCard.tsx
git commit -m "Add QuestionCard — question + category and difficulty badges"
```

---

### Task 6: Build components/AnswerButton.tsx

**Files:**
- Create: `components/AnswerButton.tsx`

- [ ] **Step 1: Create the component**

Create `components/AnswerButton.tsx`:

```tsx
import React, { useEffect } from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { haptics } from '@/lib/haptics';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';

export type AnswerState = 'idle' | 'selected' | 'correct' | 'wrong';

interface AnswerButtonProps {
  letter: 'A' | 'B' | 'C' | 'D';
  text: string;
  state: AnswerState;
  onPress: () => void;
  disabled?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function AnswerButton({ letter, text, state, onPress, disabled }: AnswerButtonProps) {
  const scale = useSharedValue(1);
  const shake = useSharedValue(0);

  useEffect(() => {
    if (state === 'wrong') {
      shake.value = withSequence(
        withTiming(-6, { duration: 60 }),
        withTiming(6, { duration: 60 }),
        withTiming(-4, { duration: 60 }),
        withTiming(0, { duration: 60 })
      );
    } else if (state === 'correct') {
      scale.value = withSequence(
        withSpring(1.06, { damping: 8, stiffness: 220 }),
        withSpring(1, { damping: 8, stiffness: 220 })
      );
    }
  }, [state]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: shake.value }],
  }));

  const handlePress = () => {
    if (disabled) return;
    scale.value = withSequence(
      withSpring(0.95, { damping: 12, stiffness: 300 }),
      withSpring(1, { damping: 12, stiffness: 300 })
    );
    haptics.light();
    onPress();
  };

  let borderColor = Colors.border;
  let bgColor = Colors.bgCard;
  let textColor = Colors.textPrimary;
  let badge: string | null = null;

  if (state === 'correct') {
    borderColor = Colors.success;
    bgColor = `${Colors.success}20`;
    textColor = Colors.successLight;
    badge = '✓';
  } else if (state === 'wrong') {
    borderColor = Colors.danger;
    bgColor = `${Colors.danger}15`;
    textColor = Colors.dangerLight;
    badge = '✕';
  } else if (state === 'selected') {
    borderColor = Colors.primary;
    bgColor = `${Colors.primary}20`;
  }

  return (
    <AnimatedTouchable
      activeOpacity={0.85}
      onPress={handlePress}
      disabled={disabled}
      style={[styles.outer, { borderColor, backgroundColor: bgColor }, animStyle]}
    >
      <View style={styles.row}>
        <Text style={styles.letter}>{letter}</Text>
        <Text style={[styles.text, { color: textColor }]} numberOfLines={3}>
          {text}
        </Text>
        {badge && <Text style={styles.badge}>{badge}</Text>}
      </View>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: Radius.md,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: 12,
  },
  letter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.bgOverlay,
    textAlign: 'center',
    lineHeight: 28,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'Outfit_700Bold',
  },
  text: {
    flex: 1,
    fontSize: FontSize.md,
    fontFamily: 'Inter_400Regular',
  },
  badge: {
    fontSize: 18,
    fontFamily: 'Outfit_900Black',
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
git add components/AnswerButton.tsx
git commit -m "Add AnswerButton — animated A/B/C/D with idle, selected, correct, wrong states"
```

---

### Task 7: Build components/XPBar.tsx

**Files:**
- Create: `components/XPBar.tsx`

- [ ] **Step 1: Create the component**

Create `components/XPBar.tsx`:

```tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';

interface XPBarProps {
  level: number;
  xp: number;
  xpForNext: number;
  showLabel?: boolean;
}

export function XPBar({ level, xp, xpForNext, showLabel = true }: XPBarProps) {
  const ratio = Math.max(0, Math.min(1, xpForNext > 0 ? xp / xpForNext : 0));
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.value = withTiming(ratio, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [ratio]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fill.value * 100}%`,
  }));

  return (
    <View style={styles.wrap}>
      {showLabel && (
        <View style={styles.headerRow}>
          <Text style={styles.label}>Level {level} → {level + 1}</Text>
          <Text style={styles.value}>{xp.toLocaleString()} / {xpForNext.toLocaleString()} XP</Text>
        </View>
      )}
      <View style={styles.barBg}>
        <Animated.View style={[styles.barFill, fillStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
  },
  value: {
    fontSize: FontSize.sm,
    color: Colors.primaryLight,
    fontFamily: 'Outfit_700Bold',
  },
  barBg: {
    height: 8,
    backgroundColor: Colors.bgOverlay,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
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
git add components/XPBar.tsx
git commit -m "Add XPBar — level label and animated progress bar"
```

---

### Task 8: Build components/ConfettiBurst.tsx

**Files:**
- Create: `components/ConfettiBurst.tsx`

- [ ] **Step 1: Create the component**

Create `components/ConfettiBurst.tsx`:

```tsx
import React, { useRef, useEffect } from 'react';
import { Dimensions, View, StyleSheet } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Colors } from '@/constants/theme';

interface ConfettiBurstProps {
  trigger: boolean;
  count?: number;
}

const { width } = Dimensions.get('window');

const COLORS = [
  Colors.primary,
  Colors.primaryLight,
  Colors.gold,
  Colors.goldLight,
  Colors.success,
  Colors.accent,
];

export function ConfettiBurst({ trigger, count = 120 }: ConfettiBurstProps) {
  const ref = useRef<ConfettiCannon | null>(null);

  useEffect(() => {
    if (trigger) {
      ref.current?.start();
    }
  }, [trigger]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <ConfettiCannon
        ref={ref}
        count={count}
        origin={{ x: width / 2, y: 0 }}
        autoStart={false}
        fadeOut
        explosionSpeed={400}
        fallSpeed={2800}
        colors={COLORS}
      />
    </View>
  );
}
```

- [ ] **Step 2: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors.

If `react-native-confetti-cannon` doesn't ship its own types, the import may need a `// @ts-ignore` or a `declare module 'react-native-confetti-cannon';` in a new `types/shims.d.ts`. Add the shim if needed:

```ts
// types/shims.d.ts
declare module 'react-native-confetti-cannon';
```

And add `"types/shims.d.ts"` to `tsconfig.json`'s `include` array if it's not picked up by the existing `**/*.ts` glob.

- [ ] **Step 3: Commit**

```bash
git add components/ConfettiBurst.tsx types/shims.d.ts 2>/dev/null || git add components/ConfettiBurst.tsx
git commit -m "Add ConfettiBurst wrapper around react-native-confetti-cannon"
```

---

### Task 9: Add lib/prefetch.ts and unit tests

**Files:**
- Create: `lib/prefetch.ts`
- Create: `__tests__/prefetch.test.ts`

- [ ] **Step 1: Create lib/prefetch.ts**

Create `lib/prefetch.ts`:

```ts
import { fetchTriviaQuestions, TriviaQuestion } from '@/lib/trivia';
import { Config } from '@/constants/config';

// Decides whether prefetch should run, what category to fetch, and
// returns the questions. Called from game/session.tsx after Q3.

export interface PrefetchInput {
  currentIndex: number;
  totalQuestions: number;
  alreadyPrefetched: boolean;
  triggerAtIndex?: number;
}

export function shouldPrefetch(input: PrefetchInput): boolean {
  const trigger = input.triggerAtIndex ?? Math.floor(input.totalQuestions / 2);
  if (input.alreadyPrefetched) return false;
  return input.currentIndex >= trigger;
}

export async function prefetchNextRound(
  category: string,
  difficulty: 'easy' | 'medium' | 'hard' | 'any' = 'any'
): Promise<TriviaQuestion[]> {
  return fetchTriviaQuestions(Config.QUESTIONS_PER_GAME, category, difficulty);
}
```

- [ ] **Step 2: Create __tests__/prefetch.test.ts**

Create `__tests__/prefetch.test.ts`:

```ts
import { shouldPrefetch } from '@/lib/prefetch';

describe('shouldPrefetch', () => {
  test('does not prefetch before reaching the trigger index', () => {
    expect(shouldPrefetch({ currentIndex: 0, totalQuestions: 5, alreadyPrefetched: false })).toBe(false);
    expect(shouldPrefetch({ currentIndex: 1, totalQuestions: 5, alreadyPrefetched: false })).toBe(false);
  });

  test('prefetches at and after the default trigger (floor(total/2))', () => {
    expect(shouldPrefetch({ currentIndex: 2, totalQuestions: 5, alreadyPrefetched: false })).toBe(true);
    expect(shouldPrefetch({ currentIndex: 4, totalQuestions: 5, alreadyPrefetched: false })).toBe(true);
  });

  test('does not prefetch when already prefetched', () => {
    expect(shouldPrefetch({ currentIndex: 4, totalQuestions: 5, alreadyPrefetched: true })).toBe(false);
  });

  test('honors custom trigger index', () => {
    expect(shouldPrefetch({ currentIndex: 2, totalQuestions: 5, alreadyPrefetched: false, triggerAtIndex: 4 })).toBe(false);
    expect(shouldPrefetch({ currentIndex: 4, totalQuestions: 5, alreadyPrefetched: false, triggerAtIndex: 4 })).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npm test -- __tests__/prefetch.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 4: Commit**

```bash
git add lib/prefetch.ts __tests__/prefetch.test.ts
git commit -m "Add prefetch helper with unit tests for trigger logic"
```

---

### Task 10: Refactor app/game/session.tsx — countdown phase + top bar

**Files:**
- Modify: `app/game/session.tsx`

This task only swaps the imports and the countdown / top-bar / answer-state code. The recap screen rewrite happens in Task 11. We split it into two commits to keep diffs reviewable.

- [ ] **Step 1: Replace contents of app/game/session.tsx**

Replace the entire contents of `app/game/session.tsx` with:

```tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  ZoomIn,
} from 'react-native-reanimated';
import { TimerRing } from '@/components/TimerRing';
import { QuestionCard } from '@/components/QuestionCard';
import { AnswerButton, AnswerState } from '@/components/AnswerButton';
import { XPBar } from '@/components/XPBar';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { Button } from '@/components/Button';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import { Config } from '@/constants/config';
import { useGameStore } from '@/store/useGameStore';
import { haptics } from '@/lib/haptics';
import { audio } from '@/lib/audio';
import { shouldPrefetch, prefetchNextRound } from '@/lib/prefetch';
import { getXPForNextLevel } from '@/lib/trivia';
import { useUserStore } from '@/store/useUserStore';

export default function GameSessionScreen() {
  const {
    phase,
    currentQuestion,
    currentIndex,
    questions,
    selectedAnswer,
    totalScore,
    correctCount,
    xpEarned,
    roundResults,
    selectAnswer,
    nextQuestion,
    resetGame,
    timeExpired,
    setTimeLeft,
    timeLeft,
    category,
    prefetchedQuestions,
    setPrefetched,
  } = useGameStore();

  const profile = useUserStore((s) => s.profile);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const tickedRef = useRef<Set<number>>(new Set());
  const prefetchedKickedRef = useRef(false);

  const [countdownNum, setCountdownNum] = useState(Config.COUNTDOWN_SECONDS);

  useEffect(() => {
    if (phase === 'playing') {
      setTimeLeft(Config.ROUND_TIME_SECONDS);
      startTimeRef.current = Date.now();
      tickedRef.current = new Set();

      timerRef.current = setInterval(() => {
        const remaining = Math.max(
          0,
          Config.ROUND_TIME_SECONDS - Math.floor((Date.now() - startTimeRef.current) / 1000)
        );
        setTimeLeft(remaining);
        if (remaining <= 3 && remaining > 0 && !tickedRef.current.has(remaining)) {
          tickedRef.current.add(remaining);
          audio.tick();
        }
        if (remaining === 0 && !tickedRef.current.has(0)) {
          tickedRef.current.add(0);
          handleTimeExpired();
        }
      }, 200);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, currentIndex]);

  useEffect(() => {
    if (phase === 'countdown') {
      setCountdownNum(Config.COUNTDOWN_SECONDS);
      const timers: ReturnType<typeof setTimeout>[] = [];
      for (let i = 1; i < Config.COUNTDOWN_SECONDS; i++) {
        timers.push(setTimeout(() => setCountdownNum(Config.COUNTDOWN_SECONDS - i), i * 1000));
      }
      return () => timers.forEach(clearTimeout);
    }
  }, [phase]);

  // Prefetch next round questions once the player crosses the trigger index
  useEffect(() => {
    if (phase !== 'playing' && phase !== 'result') return;
    const should = shouldPrefetch({
      currentIndex,
      totalQuestions: questions.length,
      alreadyPrefetched: !!prefetchedQuestions || prefetchedKickedRef.current,
    });
    if (should) {
      prefetchedKickedRef.current = true;
      prefetchNextRound(category)
        .then((qs) => setPrefetched(qs, category))
        .catch(() => {});
    }
  }, [currentIndex, phase]);

  const handleAnswer = (answer: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const isCorrect = answer === currentQuestion?.correct_answer;
    if (isCorrect) {
      haptics.medium();
      audio.correct();
    } else {
      haptics.heavy();
      audio.wrong();
    }
    selectAnswer(answer, timeTaken);
  };

  const handleTimeExpired = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    haptics.warning();
    audio.wrong();
    timeExpired();
  };

  // ── Countdown ──────────────────────────────────────────────────────────
  if (phase === 'countdown') {
    return (
      <LinearGradient colors={[Colors.bg, '#1A0A3A']} style={styles.fullscreen}>
        <Animated.View key={countdownNum} entering={ZoomIn.duration(400)} style={styles.countdownContainer}>
          <Text style={styles.countdownNumber}>{countdownNum}</Text>
          <Text style={styles.countdownLabel}>Get Ready!</Text>
        </Animated.View>
      </LinearGradient>
    );
  }

  // ── Game Over ──────────────────────────────────────────────────────────
  if (phase === 'gameover') {
    const accuracy = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
    const grade =
      accuracy >= 80 ? { label: 'Brilliant! 🌟', color: Colors.gold } :
      accuracy >= 60 ? { label: 'Great! 🎉', color: Colors.success } :
      accuracy >= 40 ? { label: 'Not bad 👍', color: Colors.accent } :
      { label: 'Keep trying 💪', color: Colors.primaryLight };

    const newProfile = profile;
    const xpForNext = getXPForNextLevel(newProfile.level);
    const showConfetti = accuracy >= 60;

    if (showConfetti) {
      audio.fanfare();
    }

    return (
      <SafeAreaView style={styles.container}>
        {showConfetti && <ConfettiBurst trigger={true} />}
        <ScrollView contentContainerStyle={styles.gameoverScroll} showsVerticalScrollIndicator={false}>
          <Animated.View entering={ZoomIn.springify()}>
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.gameoverCard}>
              <Text style={styles.gameoverTitle}>{grade.label}</Text>
              <Text style={styles.gameoverScore}>{totalScore.toLocaleString()}</Text>
              <Text style={styles.gameoverScoreLabel}>points</Text>
              <View style={styles.gameoverStats}>
                <View style={styles.gameoverStat}>
                  <Text style={styles.gameoverStatVal}>{correctCount}/{questions.length}</Text>
                  <Text style={styles.gameoverStatLabel}>Correct</Text>
                </View>
                <View style={styles.gameoverStatDiv} />
                <View style={styles.gameoverStat}>
                  <Text style={styles.gameoverStatVal}>{accuracy}%</Text>
                  <Text style={styles.gameoverStatLabel}>Accuracy</Text>
                </View>
                <View style={styles.gameoverStatDiv} />
                <View style={styles.gameoverStat}>
                  <Text style={[styles.gameoverStatVal, { color: Colors.goldLight }]}>+{xpEarned}</Text>
                  <Text style={styles.gameoverStatLabel}>XP Earned</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          <View style={styles.xpWrap}>
            <XPBar level={newProfile.level} xp={newProfile.totalXP} xpForNext={xpForNext} />
          </View>

          <Text style={styles.breakdownTitle}>Round Breakdown</Text>
          {roundResults.map((r, i) => (
            <Animated.View key={i} entering={FadeIn.delay(i * 80).springify()}>
              <View style={[styles.roundRow, { borderColor: r.isCorrect ? Colors.success : Colors.danger }]}>
                <Text style={styles.roundEmoji}>{r.isCorrect ? '✅' : '❌'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.roundQ} numberOfLines={2}>{r.question.question}</Text>
                  {!r.isCorrect && (
                    <Text style={styles.roundCorrect}>✓ {r.question.correct_answer}</Text>
                  )}
                </View>
                <Text style={[styles.roundPoints, { color: r.isCorrect ? Colors.success : Colors.textMuted }]}>
                  {r.isCorrect ? `+${r.pointsEarned}` : '0'}
                </Text>
              </View>
            </Animated.View>
          ))}

          <View style={styles.gameoverBtns}>
            <Button
              label="Play Again 🎮"
              onPress={() => {
                resetGame();
                router.back();
              }}
              style={{ flex: 1 }}
            />
            <Button
              label="Home 🏠"
              variant="ghost"
              onPress={() => {
                resetGame();
                router.replace('/(tabs)/');
              }}
              style={{ flex: 1 }}
            />
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Playing / Result ───────────────────────────────────────────────────
  if (!currentQuestion) return null;

  const progress = ((currentIndex + 1) / questions.length) * 100;
  const showResult = phase === 'result';

  function answerStateFor(answer: string): AnswerState {
    if (!showResult) {
      return selectedAnswer === answer ? 'selected' : 'idle';
    }
    if (answer === currentQuestion!.correct_answer) return 'correct';
    if (selectedAnswer === answer) return 'wrong';
    return 'idle';
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => { resetGame(); router.back(); }}
          style={styles.closeBtn}
        >
          <Text style={styles.closeTxt}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.progressLabel}>
          {currentIndex + 1} / {questions.length}
        </Text>
        <Text style={styles.scoreTxt}>{totalScore}</Text>
      </View>

      <View style={styles.progressBg}>
        <Animated.View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      {phase === 'playing' && (
        <View style={styles.timerWrap}>
          <TimerRing timeLeft={timeLeft} totalTime={Config.ROUND_TIME_SECONDS} />
        </View>
      )}

      <QuestionCard
        question={currentQuestion.question}
        category={currentQuestion.category}
        difficulty={currentQuestion.difficulty}
        questionKey={`q_${currentIndex}`}
      />

      <View style={styles.answersWrap}>
        {currentQuestion.answers.map((answer, i) => (
          <Animated.View key={`${currentIndex}_${i}`} entering={FadeIn.delay(i * 60).springify()}>
            <AnswerButton
              letter={(['A', 'B', 'C', 'D'] as const)[i]}
              text={answer}
              state={answerStateFor(answer)}
              onPress={() => handleAnswer(answer)}
              disabled={showResult}
            />
          </Animated.View>
        ))}
      </View>

      {showResult && (
        <Animated.View entering={FadeIn.springify()} style={styles.nextWrap}>
          <Button
            label={currentIndex + 1 >= questions.length ? 'See Results 🏆' : 'Next Question →'}
            onPress={nextQuestion}
            size="lg"
          />
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fullscreen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: Colors.bg },
  countdownContainer: { alignItems: 'center' },
  countdownNumber: {
    fontSize: 120,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_900Black',
    lineHeight: 130,
  },
  countdownLabel: {
    fontSize: FontSize.xl,
    color: Colors.textSecondary,
    fontFamily: 'Outfit_700Bold',
  },
  gameoverScroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.lg },
  gameoverCard: {
    borderRadius: 24,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  gameoverTitle: {
    fontSize: FontSize.xxl,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
    marginBottom: Spacing.sm,
  },
  gameoverScore: {
    fontSize: 72,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_900Black',
    lineHeight: 80,
  },
  gameoverScoreLabel: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Inter_400Regular',
    marginBottom: Spacing.md,
  },
  gameoverStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  gameoverStat: { alignItems: 'center' },
  gameoverStatVal: {
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
  },
  gameoverStatLabel: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Inter_400Regular',
  },
  gameoverStatDiv: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },
  xpWrap: { marginBottom: Spacing.lg },
  breakdownTitle: {
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
    marginBottom: Spacing.sm,
  },
  roundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  roundEmoji: { fontSize: 18, width: 24 },
  roundQ: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontFamily: 'Inter_400Regular',
  },
  roundCorrect: {
    fontSize: FontSize.xs,
    color: Colors.successLight,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 2,
  },
  roundPoints: {
    fontSize: FontSize.sm,
    fontFamily: 'Outfit_700Bold',
    width: 36,
    textAlign: 'right',
  },
  gameoverBtns: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '700' },
  progressLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontFamily: 'Outfit_700Bold',
  },
  scoreTxt: {
    fontSize: FontSize.md,
    color: Colors.primaryLight,
    fontFamily: 'Outfit_700Bold',
    minWidth: 36,
    textAlign: 'right',
  },
  progressBg: {
    height: 4,
    backgroundColor: Colors.bgOverlay,
    marginHorizontal: Spacing.md,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  timerWrap: {
    paddingTop: Spacing.md,
    alignItems: 'center',
  },
  answersWrap: {
    paddingHorizontal: Spacing.md,
    gap: 10,
    flex: 1,
  },
  nextWrap: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
});
```

- [ ] **Step 2: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Verify all tests still pass**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npm test
```

Expected: 31 tests pass (20 trivia + 7 streak + 4 prefetch).

- [ ] **Step 4: Commit**

```bash
git add app/game/session.tsx
git commit -m "Refactor game session: TimerRing + QuestionCard + AnswerButton + XPBar + Confetti + audio + prefetch"
```

---

### Task 11: Delete components/Timer.tsx

**Files:**
- Delete: `components/Timer.tsx`

- [ ] **Step 1: Confirm no remaining imports of Timer**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && grep -rn "from '@/components/Timer'" --include="*.ts" --include="*.tsx" . | grep -v node_modules
```

Expected: 0 results.

- [ ] **Step 2: Delete the file**

Run:
```bash
rm /Users/basusingh/Desktop/Mob_App/components/Timer.tsx
```

- [ ] **Step 3: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add -A components/Timer.tsx
git commit -m "Remove old Timer component (replaced by TimerRing)"
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

Expected: all suites pass (trivia + streak + prefetch).

- [ ] **Step 3: Confirm Expo can bundle**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx expo export --platform android --output-dir .expo/phase2-smoke 2>&1 | tail -10
```

Expected: bundle exports without errors. Then clean up:

```bash
rm -rf /Users/basusingh/Desktop/Mob_App/.expo/phase2-smoke
```

- [ ] **Step 4: Confirm no direct expo-haptics or expo-audio usage outside the wrappers**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && grep -rn "from 'expo-haptics'\|from 'expo-audio'" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v 'lib/haptics.ts' | grep -v 'lib/audio.ts' | grep -v 'jest.setup.ts'
```

Expected: 0 results.

- [ ] **Step 5: Final commit if any cleanup**

If grep found stragglers in Step 4, fix them inline (replace with the wrapper) and commit:

```bash
git add -A
git commit -m "Phase 2 verification cleanup"
```

If no cleanup needed, skip.

---

## Self-Review Notes

- **Spec coverage:** Phase 2 scope per spec section 15 = build QuestionCard ✓ (Task 5), AnswerButton ✓ (Task 6), TimerRing ✓ (Task 4), XPBar ✓ (Task 7), ConfettiBurst ✓ (Task 8). Wire animations ✓ (each component uses Reanimated). Wire audio ✓ (Task 3 + Task 10 calls `audio.tick/correct/wrong/fanfare`). Wire haptics ✓ (Task 6 + Task 10 use `haptics.*`). Implement question prefetch ✓ (Task 9 + Task 10). Spec section 11 polish items: animations ✓, haptics ✓, audio ✓, splash already done in Phase 1, daily reminder is Phase 5, onboarding is Phase 5, empty states are Phase 3.
- **Placeholders:** none. Every step has runnable code or commands.
- **Type consistency:** `AnswerState` exported from Task 6 used in Task 10. `TimerRingProps`, `QuestionCardProps`, `AnswerButtonProps`, `XPBarProps`, `ConfettiBurstProps` defined in their respective tasks and consumed in Task 10. `prefetchedQuestions` and `setPrefetched` defined in Task 2 and used in Task 10. `shouldPrefetch` and `prefetchNextRound` defined in Task 9 and used in Task 10. `Config.ROUND_TIME_SECONDS`, `Config.COUNTDOWN_SECONDS`, `Config.QUESTIONS_PER_GAME` from Phase 1 used consistently.

---

## Plan Summary

12 tasks. Each produces one focused commit. After Phase 2:
- Game session uses dedicated, well-bounded components.
- Audio is wired (no-ops gracefully until Phase 6 sound files land).
- Haptics route entirely through `lib/haptics.ts`.
- Question prefetch triggers at the midpoint and primes the store for "Play Again."
- Confetti rains on accuracy ≥ 60% with a fanfare cue.
- Old `Timer` component is gone.

Ready for Phase 3 (Home + Play + Profile screens via frontend-design).
