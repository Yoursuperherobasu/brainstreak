import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Colors, Spacing, FontSize } from '@/constants/theme';
import { pickDailyGame, DAILY_BONUS_XP, type GameId } from '@/lib/dailyChallenge';
import { todayISO } from '@/lib/storage';
import { GAMES } from '@/constants/games';

const TITLES: Record<string, string> = Object.fromEntries(
  GAMES.map((g) => [g.id, g.title]),
);

export function DailyChallengeCard() {
  const id = pickDailyGame(todayISO());
  const path = id === 'brain-rush' ? '/play' : `/game/${id}`;

  // Slow breathing pulse on the tag — draws the eye without being noisy.
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => { cancelAnimation(pulse); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tagStyle = useAnimatedStyle(() => ({
    opacity: 0.7 + pulse.value * 0.3,
  }));
  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.85 + pulse.value * 0.3 }],
    opacity: 0.6 + pulse.value * 0.4,
  }));

  return (
    <Card style={styles.card}>
      <View style={styles.tagRow}>
        <Animated.View style={[styles.dot, dotStyle]} />
        <Animated.Text style={[styles.tag, tagStyle]}>TODAY'S CHALLENGE</Animated.Text>
      </View>
      <Text style={styles.title}>{TITLES[id]}</Text>
      <Text style={styles.sub}>One round. +{DAILY_BONUS_XP} XP. Brain unfried.</Text>
      <View style={{ marginTop: Spacing.sm }}>
        <Button label="Start" onPress={() => router.push(path as any)} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.md },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  tag: {
    fontSize: FontSize.xs,
    color: Colors.accent,
    letterSpacing: 1,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  title: {
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    fontFamily: 'BricolageGrotesque_700Bold',
    marginTop: 4,
  },
  sub: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_400Regular',
    marginTop: 2,
  },
});
