import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/constants/theme';
import { MotionView } from '@/components/MotionView';
import { GameFrame } from '@/components/games/GameFrame';
import { GameOverCard } from '@/components/games/GameOverCard';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import {
  generateSequence,
  isCorrectSoFar,
  paletteSizeForRound,
  scoreForRound,
  xpForRun,
  SHAPE_POOL,
  type ShapeId,
} from '@/lib/games/patternRecall';
import { ShapeIcon, SHAPE_COLORS } from '@/components/games/pattern/ShapeIcon';
import { haptics } from '@/lib/haptics';
import { audio } from '@/lib/audio';
import { recordMiniGameResult } from '@/lib/games/recordMiniGame';
import { useGameBackHandler } from '@/lib/useGameBackHandler';

const ACCENT = Colors.accent;
const FLASH_MS = 520;
const GAP_MS = 240;

export default function PatternRecallScreen() {
  const [round, setRound] = useState(1);
  const [seq, setSeq] = useState<ShapeId[]>([]);
  const [attempt, setAttempt] = useState<ShapeId[]>([]);
  const [phase, setPhase] = useState<'show' | 'input' | 'over'>('show');
  const [activeShape, setActiveShape] = useState<ShapeId | null>(null);
  const [score, setScore] = useState(0);
  const [leveledUp, setLeveledUp] = useState(false);
  const [newBest, setNewBest] = useState(false);
  const [prevBest, setPrevBest] = useState(0);
  const recordedRef = useRef(false);
  const playingRef = useRef(false);

  const palette = SHAPE_POOL.slice(0, paletteSizeForRound(round));

  // Generate + play the new sequence when round changes.
  useEffect(() => {
    const s = generateSequence(round);
    setSeq(s);
    setAttempt([]);
    setPhase('show');
    playSequence(s);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const playSequence = async (s: ShapeId[]) => {
    playingRef.current = true;
    // Brief pre-roll so the user sees the round number first.
    await new Promise((r) => setTimeout(r, 300));
    for (const shape of s) {
      setActiveShape(shape);
      haptics.light();
      await new Promise((r) => setTimeout(r, FLASH_MS));
      setActiveShape(null);
      await new Promise((r) => setTimeout(r, GAP_MS));
    }
    playingRef.current = false;
    setPhase('input');
  };

  useGameBackHandler({ enabled: phase !== 'over', onExit: () => router.replace('/play') });

  // Game over: record the result.
  useEffect(() => {
    if (phase !== 'over' || recordedRef.current) return;
    recordedRef.current = true;
    const xp = xpForRun(score);
    // total = total shapes seen across all rounds, correct = total - 1 (the
    // run ends on a wrong tap, which counts as the only miss). Mirrors
    // memory-match so "Flawless" can never trip falsely.
    const total = seq.length;
    const correct = Math.max(0, seq.length - 1);
    recordMiniGameResult({
      gameId: 'pattern-recall',
      score,
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
  }, [phase, score, seq.length]);

  const press = (shape: ShapeId) => {
    if (phase !== 'input') return;
    const next = [...attempt, shape];
    setAttempt(next);
    if (!isCorrectSoFar(seq, next)) {
      haptics.error();
      setPhase('over');
      return;
    }
    haptics.success();
    if (next.length === seq.length) {
      const gained = scoreForRound(round);
      setScore((s) => s + gained);
      setTimeout(() => setRound((r) => r + 1), 500);
    }
  };

  const restart = () => {
    setRound(1);
    setSeq([]);
    setAttempt([]);
    setScore(0);
    setPhase('show');
    setLeveledUp(false);
    setNewBest(false);
    setPrevBest(0);
    recordedRef.current = false;
    // Re-trigger sequence generation by rerunning the effect.
    setTimeout(() => {
      const s = generateSequence(1);
      setSeq(s);
      playSequence(s);
    }, 0);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AnimatedBackground intensity="subtle" tint={ACCENT} />
      <GameFrame
        title="Pattern Recall"
        accent={ACCENT}
        seconds={Math.max(0, 60 - round * 5)}
        totalSeconds={60}
        score={score}
        onExit={() => router.replace('/play')}
      />
      {phase !== 'over' ? (
        <MotionView entering={FadeIn} style={styles.body}>
          <Text style={styles.round}>Round {round}</Text>
          <Text style={styles.hint}>
            {phase === 'show' ? 'Watch the sequence…' : 'Now repeat it!'}
          </Text>
          {/* Stage: large preview of the currently-flashing shape (during 'show'),
              or progress dots (during 'input'). */}
          <View style={styles.stage}>
            {phase === 'show' && activeShape && (
              <ShapeIcon shape={activeShape} size={140} color={SHAPE_COLORS[activeShape]} />
            )}
            {phase === 'show' && !activeShape && (
              <Text style={styles.stageHint}>·</Text>
            )}
            {phase === 'input' && (
              <View style={styles.dots}>
                {seq.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      { backgroundColor: i < attempt.length ? Colors.success : Colors.borderBright },
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
          {/* Palette: tap one of these to reproduce a shape. Disabled during 'show'. */}
          <View style={styles.palette}>
            {palette.map((shape) => (
              <Pressable
                key={shape}
                onPress={() => press(shape)}
                disabled={phase !== 'input'}
                accessibilityRole="button"
                accessibilityLabel={`Tap ${shape}`}
                style={({ pressed }) => [
                  styles.paletteBtn,
                  pressed && phase === 'input' && styles.paletteBtnPressed,
                  phase !== 'input' && { opacity: 0.55 },
                ]}
              >
                <ShapeIcon shape={shape} size={48} color={SHAPE_COLORS[shape]} />
              </Pressable>
            ))}
          </View>
        </MotionView>
      ) : (
        <View style={styles.body}>
          <GameOverCard
            title="Game Over"
            score={score}
            stats={[
              { label: 'Round', value: round.toString() },
              { label: 'Length', value: seq.length.toString() },
              { label: 'XP', value: xpForRun(score).toString() },
            ]}
            onPlayAgain={restart}
            onExit={() => router.replace('/play')}
            newBest={newBest}
            delta={score - prevBest}
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
  round: { fontSize: FontSize.xl, color: Colors.textPrimary, fontFamily: 'BricolageGrotesque_700Bold' },
  hint: { color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: FontSize.sm },
  stage: {
    width: 220,
    height: 220,
    borderRadius: Radius.xl,
    backgroundColor: Colors.bgCard,
    borderWidth: 2,
    borderColor: Colors.borderBright,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  stageHint: { fontSize: 40, color: Colors.textMuted },
  dots: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 200 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  palette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
    maxWidth: 360,
  },
  paletteBtn: {
    width: 76,
    height: 76,
    borderRadius: Radius.lg,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  paletteBtnPressed: { transform: [{ scale: 0.94 }], opacity: 0.9 },
});
