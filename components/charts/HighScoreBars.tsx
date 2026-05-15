// components/charts/HighScoreBars.tsx
// Horizontal bars for all 9 games. Each row: game name on the left,
// colored bar showing score (normalized to the max score across all games),
// score number on the right.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GAMES } from '@/constants/games';
import { usePersonalBestStore } from '@/store/usePersonalBestStore';
import { Colors, FontSize, Radius } from '@/constants/theme';

export function HighScoreBars() {
  const bests = usePersonalBestStore((s) => s.bests);
  const maxScore = Math.max(1, ...GAMES.map((g) => bests[g.id]?.bestScore ?? 0));

  return (
    <View style={styles.wrap}>
      {GAMES.map((g) => {
        const score = bests[g.id]?.bestScore ?? 0;
        const pct = Math.min(1, score / maxScore);
        const hasScore = score > 0;
        return (
          <View key={g.id} style={styles.row}>
            <Text style={styles.name} numberOfLines={1}>{g.title}</Text>
            <View style={styles.track}>
              {hasScore ? (
                <View
                  style={[
                    styles.fill,
                    { width: `${Math.max(pct * 100, 4)}%`, backgroundColor: g.color },
                  ]}
                />
              ) : (
                <View style={styles.emptyBar} />
              )}
            </View>
            <Text style={[styles.score, !hasScore && styles.scoreMuted]}>
              {hasScore ? score.toLocaleString() : '—'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: {
    width: 110,
    fontSize: FontSize.xs,
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  track: {
    flex: 1,
    height: 12,
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: Radius.sm },
  emptyBar: {
    height: '100%',
    width: '4%',
    backgroundColor: Colors.borderBright,
    borderRadius: Radius.sm,
    opacity: 0.5,
  },
  score: {
    width: 56,
    textAlign: 'right',
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontFamily: 'BricolageGrotesque_700Bold',
  },
  scoreMuted: {
    color: Colors.textMuted,
  },
});
