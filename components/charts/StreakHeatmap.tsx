// components/charts/StreakHeatmap.tsx
// Shows the last 7 days (today on the right). Filled squares = played that day.
// Reads from useUserStore.streak.lastPlayDate (only know today; for full
// history we'd need a play-history store, which we don't have yet).
// Fallback: just show today's box filled if streak.current > 0, the rest
// are dimmed/empty unless lastPlayDate is among the last 6 days.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import { todayISO } from '@/lib/storage';

interface Props {
  current: number;
  longest: number;
  lastPlayDate: string | null;
}

export function StreakHeatmap({ current, longest, lastPlayDate }: Props) {
  const today = todayISO();
  const days: { iso: string; played: boolean; isToday: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    // If we have streak.current days and lastPlayDate is today (or yesterday),
    // mark the last `current` days as played. This is the best approximation
    // given the data model.
    const recentStreakReach = lastPlayDate ? Math.min(current, 7) : 0;
    const targetEndDate = lastPlayDate ?? '';
    let played = false;
    if (lastPlayDate && iso <= lastPlayDate) {
      const diff = Math.floor(
        (new Date(targetEndDate).getTime() - new Date(iso).getTime()) / 86_400_000,
      );
      if (diff >= 0 && diff < recentStreakReach) played = true;
    }
    days.push({ iso, played, isToday: iso === today });
  }

  // Day-of-week labels: Mon Tue Wed Thu Fri Sat Sun style
  const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <View>
      <Text style={styles.label}>Last 7 days</Text>
      <View style={styles.row}>
        {days.map((d) => {
          const dayIdx = new Date(d.iso + 'T12:00:00').getDay(); // 0=Sun
          return (
            <View key={d.iso} style={styles.cellWrap}>
              <View
                style={[
                  styles.cell,
                  { backgroundColor: d.played ? Colors.primary : Colors.bgElevated },
                  d.isToday && styles.todayRing,
                ]}
              />
              <Text style={styles.dayLabel}>{DAY_LABELS[dayIdx]}</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.caption}>
        Current streak: {current} {current === 1 ? 'day' : 'days'} · Best: {longest} {longest === 1 ? 'day' : 'days'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: 8,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  row: { flexDirection: 'row', gap: 6 },
  cellWrap: { alignItems: 'center', gap: 4 },
  cell: { width: 36, height: 36, borderRadius: Radius.sm },
  todayRing: { borderWidth: 2, borderColor: Colors.gold },
  dayLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 0.3,
  },
  caption: {
    marginTop: 10,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
});
