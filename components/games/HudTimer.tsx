import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Radius } from '@/constants/theme';

export function HudTimer({ seconds, totalSeconds, accent }: { seconds: number; totalSeconds: number; accent?: string }) {
  const pct = Math.max(0, Math.min(1, seconds / totalSeconds));
  const color = pct < 0.2 ? Colors.danger : (accent ?? Colors.primary);
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, backgroundColor: Colors.bgElevated, borderRadius: Radius.sm, overflow: 'hidden' },
  fill: { height: '100%' },
});
