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
