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
    <Card style={styles.card}>
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
  card: { marginBottom: Spacing.md },
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
