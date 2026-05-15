import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import { Button } from '@/components/Button';

interface Stat { label: string; value: string }

interface Props {
  title: string;
  score: number;
  stats: Stat[];
  onPlayAgain: () => void;
  onExit: () => void;
}

export function GameOverCard({ title, score, stats, onPlayAgain, onExit }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.score}>{score.toLocaleString()}</Text>
      <View style={styles.stats}>
        {stats.map((s) => (
          <View key={s.label} style={styles.stat}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>
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
  row: { flexDirection: 'row', gap: Spacing.sm, alignSelf: 'stretch' },
});
