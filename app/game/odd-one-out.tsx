import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/constants/theme';
import { MotionView } from '@/components/MotionView';
import { GameFrame } from '@/components/games/GameFrame';
import { GameOverCard } from '@/components/games/GameOverCard';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import {
  generateRound,
  scoreAttempt,
  xpForRun,
  type OddRound,
} from '@/lib/games/oddOneOut';
import { haptics } from '@/lib/haptics';
import { audio } from '@/lib/audio';
import { recordMiniGameResult } from '@/lib/games/recordMiniGame';
import { usePausableInterval } from '@/lib/usePausableInterval';

const ROUND_SECONDS = 45;
const ACCENT = Colors.catPop; // hot pink — distinct from everything else
const GRID_MAX = 320;

export default function OddOneOutScreen() {
  const [level, setLevel] = useState(1);
  const [round, setRound] = useState<OddRound>(() => generateRound(1));
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [seconds, setSeconds] = useState(ROUND_SECONDS);
  const [phase, setPhase] = useState<'playing' | 'over'>('playing');
  const [leveledUp, setLeveledUp] = useState(false);
  const [newBest, setNewBest] = useState(false);
  const [prevBest, setPrevBest] = useState(0);
  const [shake, setShake] = useState(0);
  const recordedRef = useRef(false);
  const gridScale = useSharedValue(1);
  const gridStyle = useAnimatedStyle(() => ({ transform: [{ scale: gridScale.value }] }));

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

  useEffect(() => {
    if (phase !== 'over' || recordedRef.current) return;
    recordedRef.current = true;
    const xp = xpForRun(score);
    recordMiniGameResult({
      gameId: 'odd-one-out',
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

  const pick = (index: number) => {
    if (phase !== 'playing') return;
    const r = scoreAttempt(round, index);
    setTotal((t) => t + 1);
    if (r.ok) {
      setCorrect((c) => c + 1);
      setScore((s) => s + r.points);
      haptics.success();
      gridScale.value = withSequence(withTiming(1.05, { duration: 90 }), withTiming(1, { duration: 220 }));
      const nextLevel = level + 1;
      setLevel(nextLevel);
      setRound(generateRound(nextLevel));
    } else {
      setScore((s) => Math.max(0, s + r.points));
      haptics.error();
      setShake((s) => s + 1);
    }
  };

  const restart = () => {
    setLevel(1);
    setRound(generateRound(1));
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

  const tileSize = (GRID_MAX - (round.size - 1) * Spacing.sm) / round.size;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AnimatedBackground intensity="subtle" tint={ACCENT} />
      <GameFrame
        title="Odd One Out"
        accent={ACCENT}
        seconds={seconds}
        totalSeconds={ROUND_SECONDS}
        score={Math.max(0, score)}
        onExit={() => router.replace('/play')}
      />
      {phase === 'playing' ? (
        <MotionView entering={FadeIn} style={styles.body}>
          <Text style={styles.hint}>Tap the tile that doesn't belong. Level {level}.</Text>
          <Animated.View style={[styles.gridWrap, gridStyle]} key={shake}>
            <View style={[styles.grid, { width: GRID_MAX, height: GRID_MAX }]}>
              {Array.from({ length: round.size * round.size }).map((_, i) => {
                const isOdd = i === round.oddIndex;
                return (
                  <Pressable
                    key={i}
                    onPress={() => pick(i)}
                    accessibilityRole="button"
                    accessibilityLabel={`Tile ${i + 1}`}
                    style={[
                      styles.tile,
                      {
                        width: tileSize,
                        height: tileSize,
                        backgroundColor: isOdd ? round.oddColor : round.baseColor,
                      },
                    ]}
                  />
                );
              })}
            </View>
          </Animated.View>
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
              { label: 'Level', value: level.toString() },
              { label: 'Correct', value: correct.toString() },
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
  body: { flex: 1, padding: Spacing.md, gap: Spacing.lg, alignItems: 'center', justifyContent: 'center' },
  hint: { textAlign: 'center', color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: FontSize.sm },
  gridWrap: { padding: Spacing.md, borderRadius: Radius.xl, backgroundColor: Colors.bgCard, ...Shadow.md, borderWidth: 1, borderColor: Colors.borderBright },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tile: { borderRadius: Radius.md, ...Shadow.sm },
  statsRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  statLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_600SemiBold' },
  statValue: { fontSize: FontSize.lg, color: Colors.textPrimary, fontFamily: 'BricolageGrotesque_700Bold', minWidth: 24, textAlign: 'center' },
  divider: { fontSize: FontSize.lg, color: Colors.textMuted },
});
