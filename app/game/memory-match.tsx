import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import { extendSequence, isCorrectSoFar } from '@/lib/games/memoryMatch';
import { GameFrame } from '@/components/games/GameFrame';
import { GameOverCard } from '@/components/games/GameOverCard';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { haptics } from '@/lib/haptics';
import { recordMiniGameResult } from '@/lib/games/recordMiniGame';

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
  const recordedRef = useRef(false);

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
      <AnimatedBackground intensity="subtle" tint={Colors.gold} />
      <GameFrame title="Memory Match" accent={Colors.gold} seconds={Math.max(0, 60 - round * 5)} totalSeconds={60} score={score} onExit={() => router.replace('/play')} />
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
            onPlayAgain={() => { setSeq([]); setAttempt([]); setScore(0); setRound(1); recordedRef.current = false; }}
            onExit={() => router.replace('/play')}
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
