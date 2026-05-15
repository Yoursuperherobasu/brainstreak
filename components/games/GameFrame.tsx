import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize } from '@/constants/theme';
import { HudTimer } from './HudTimer';
import { HudScore } from './HudScore';

interface Props {
  title: string;
  accent?: string;
  seconds: number;
  totalSeconds: number;
  score: number;
  onExit: () => void;
}

export function GameFrame({ title, accent, seconds, totalSeconds, score, onExit }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable onPress={onExit} hitSlop={12}><Text style={styles.exit}>← Exit</Text></Pressable>
        <Text style={styles.title}>{title}</Text>
        <HudScore value={score} />
      </View>
      <HudTimer seconds={seconds} totalSeconds={totalSeconds} accent={accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: Spacing.md, gap: Spacing.sm, backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: FontSize.lg, color: Colors.textPrimary, fontFamily: 'BricolageGrotesque_700Bold' },
  exit: { color: Colors.textSecondary, fontSize: FontSize.sm, fontFamily: 'PlusJakartaSans_600SemiBold' },
});
