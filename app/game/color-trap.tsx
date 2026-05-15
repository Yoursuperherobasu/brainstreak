import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, FadeIn } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/constants/theme';
import { MotionView } from '@/components/MotionView';
import { GameFrame } from '@/components/games/GameFrame';
import { GameOverCard } from '@/components/games/GameOverCard';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import {
  generateRound,
  scoreAttempt,
  xpForRun,
  COLOR_PALETTE,
  type ColorTrapRound,
} from '@/lib/games/colorTrap';
import { haptics } from '@/lib/haptics';
import { audio } from '@/lib/audio';
import { recordMiniGameResult } from '@/lib/games/recordMiniGame';
import { usePausableInterval } from '@/lib/usePausableInterval';
import { useGameBackHandler } from '@/lib/useGameBackHandler';

const ROUND_SECONDS = 30;
const ACCENT = Colors.catTech; // violet — distinct from blue/teal default

export default function ColorTrapScreen() {
  const [round, setRound] = useState<ColorTrapRound>(() => generateRound());
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [seconds, setSeconds] = useState(ROUND_SECONDS);
  const [phase, setPhase] = useState<'playing' | 'over'>('playing');
  const [leveledUp, setLeveledUp] = useState(false);
  const [newBest, setNewBest] = useState(false);
  const [prevBest, setPrevBest] = useState(0);
  const recordedRef = useRef(false);
  const wordScale = useSharedValue(1);
  const wordStyle = useAnimatedStyle(() => ({ transform: [{ scale: wordScale.value }] }));

  const advance = () => {
    wordScale.value = withSequence(withTiming(0.92, { duration: 60 }), withTiming(1, { duration: 180 }));
    setRound(generateRound());
  };

  usePausableInterval({
    durationMs: ROUND_SECONDS * 1000,
    tickMs: 1000,
    enabled: phase === 'playing',
    onTick: (remainingMs) => setSeconds(Math.ceil(remainingMs / 1000)),
    onComplete: () => {
      setPhase('over');
      setSeconds(0);
    },
  });

  useGameBackHandler({ enabled: phase === 'playing', onExit: () => router.replace('/play') });

  useEffect(() => {
    if (phase !== 'over' || recordedRef.current) return;
    recordedRef.current = true;
    const xp = xpForRun(score);
    recordMiniGameResult({
      gameId: 'color-trap',
      score: Math.max(0, score),
      xp,
      total,
      correct,
    }).then((res) => {
      if (res.leveledUp) {
        setLeveledUp(true);
        audio.levelup();
      }
      if (res.wasNewBest) {
        setNewBest(true);
        setPrevBest(res.previousBest);
      }
    }).catch(() => {});
  }, [phase, score, total, correct]);

  const pick = (matchPick: boolean) => {
    if (phase !== 'playing') return;
    const r = scoreAttempt(round, matchPick);
    setTotal((t) => t + 1);
    if (r.ok) {
      setCorrect((c) => c + 1);
      setScore((s) => s + r.points);
      haptics.success();
    } else {
      setScore((s) => Math.max(0, s + r.points));
      haptics.error();
    }
    advance();
  };

  const restart = () => {
    setRound(generateRound());
    setScore(0);
    setCorrect(0);
    setTotal(0);
    setSeconds(ROUND_SECONDS);
    setPhase('playing');
    setLeveledUp(false);
    setNewBest(false);
    setPrevBest(0);
    recordedRef.current = false;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AnimatedBackground intensity="subtle" tint={ACCENT} />
      <GameFrame
        title="Color Trap"
        accent={ACCENT}
        seconds={seconds}
        totalSeconds={ROUND_SECONDS}
        score={Math.max(0, score)}
        onExit={() => router.replace('/play')}
      />
      {phase === 'playing' ? (
        <MotionView entering={FadeIn} style={styles.body}>
          <Text style={styles.hint}>Does the WORD match the INK color?</Text>
          <View style={styles.stage}>
            <Animated.Text
              style={[styles.word, { color: COLOR_PALETTE[round.ink] }, wordStyle]}
              accessibilityLabel={`Word ${round.word} in ${round.ink} ink`}
            >
              {round.word.toUpperCase()}
            </Animated.Text>
          </View>
          <View style={styles.actions}>
            <Pressable
              onPress={() => pick(false)}
              style={({ pressed }) => [styles.btn, styles.btnNo, pressed && styles.btnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Different"
            >
              <Text style={styles.btnLabel}>DIFFERENT</Text>
            </Pressable>
            <Pressable
              onPress={() => pick(true)}
              style={({ pressed }) => [styles.btn, styles.btnYes, pressed && styles.btnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Match"
            >
              <Text style={styles.btnLabel}>MATCH</Text>
            </Pressable>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statLabel}>Correct</Text>
            <Text style={styles.statValue}>{correct}</Text>
            <Text style={styles.divider}>·</Text>
            <Text style={styles.statLabel}>Misses</Text>
            <Text style={[styles.statValue, total - correct > 0 && { color: Colors.danger }]}>{total - correct}</Text>
          </View>
        </MotionView>
      ) : (
        <View style={styles.body}>
          <GameOverCard
            title="Time!"
            score={Math.max(0, score)}
            stats={[
              { label: 'Correct', value: correct.toString() },
              { label: 'Total', value: total.toString() },
              { label: 'XP', value: xpForRun(score).toString() },
            ]}
            onPlayAgain={restart}
            onExit={() => router.replace('/play')}
            newBest={newBest}
            delta={Math.max(0, score) - prevBest}
            leveledUp={leveledUp}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  body: { flex: 1, padding: Spacing.md, gap: Spacing.lg, alignItems: 'stretch', justifyContent: 'center' },
  hint: { textAlign: 'center', color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: FontSize.sm },
  stage: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 360,
    aspectRatio: 1.6,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl,
    borderWidth: 2,
    borderColor: Colors.borderBright,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  word: {
    fontSize: 56,
    fontFamily: 'BagelFatOne_400Regular',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  btn: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  btnYes: { backgroundColor: Colors.success },
  btnNo: { backgroundColor: Colors.danger },
  btnPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  btnLabel: {
    color: '#FFFFFF',
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    fontSize: FontSize.lg,
    letterSpacing: 1,
  },
  statsRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, justifyContent: 'center' },
  statLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_600SemiBold' },
  statValue: { fontSize: FontSize.lg, color: Colors.textPrimary, fontFamily: 'BricolageGrotesque_700Bold', minWidth: 24, textAlign: 'center' },
  divider: { fontSize: FontSize.lg, color: Colors.textMuted },
});
