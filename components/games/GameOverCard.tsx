import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import { Button } from '@/components/Button';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { CountingNumber } from '@/components/CountingNumber';
import { MotionView } from '@/components/MotionView';
import { FadeInRight } from 'react-native-reanimated';

interface Stat { label: string; value: string }

interface Props {
  title: string;
  score: number;
  stats: Stat[];
  onPlayAgain: () => void;
  onExit: () => void;
  newBest?: boolean;
  delta?: number;
  leveledUp?: boolean;
}

export function GameOverCard({ title, score, stats, onPlayAgain, onExit, newBest, delta, leveledUp }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <CountingNumber
        value={score}
        durationMs={800}
        formatter={(n) => n.toLocaleString()}
        style={styles.score}
      />
      <View style={styles.stats}>
        {stats.map((s, i) => (
          <MotionView
            key={s.label}
            entering={FadeInRight.delay(150 + i * 80).springify()}
            style={styles.stat}
          >
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </MotionView>
        ))}
      </View>
      {newBest && (
        <View style={styles.newBest}>
          <Text style={styles.newBestText}>NEW BEST!{delta != null && delta > 0 ? ` +${delta}` : ''}</Text>
        </View>
      )}
      {leveledUp && <ConfettiBurst trigger={true} />}
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
  newBest: {
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    marginTop: 4,
    alignSelf: 'center',
  },
  newBestText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontFamily: 'BricolageGrotesque_700Bold',
    letterSpacing: 0.5,
  },
  row: { flexDirection: 'row', gap: Spacing.sm, alignSelf: 'stretch' },
});
