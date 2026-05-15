import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
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
import { useSettingsStore } from '@/store/useSettingsStore';

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

  const lastTapped = useSettingsStore((s) => s.lastDailyChallengeTappedDate);
  const setLastTapped = useSettingsStore((s) => s.setLastDailyChallengeTappedDate);
  const today = todayISO();
  const isFreshChallenge = lastTapped !== today;

  const rot = useSharedValue(0);
  useEffect(() => {
    if (!isFreshChallenge) {
      cancelAnimation(rot);
      rot.value = 0;
      return;
    }
    rot.value = withRepeat(
      withSequence(
        withTiming(8, { duration: 110 }),
        withTiming(-8, { duration: 110 }),
        withTiming(0, { duration: 110 }),
        withTiming(0, { duration: 3500 }),
      ),
      -1,
      false,
    );
    return () => { cancelAnimation(rot); };
  }, [isFreshChallenge]);

  const wiggleStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${rot.value}deg` }],
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
        <Animated.View style={wiggleStyle}>
          <Button
            label="Start"
            onPress={() => {
              setLastTapped(today);
              router.push(path as any);
            }}
          />
        </Animated.View>
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
