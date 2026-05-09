import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors, FontSize, Radius } from '@/constants/theme';

interface XPBarProps {
  level: number;
  xp: number;
  xpForNext: number;
  showLabel?: boolean;
}

// A7 fix: bar shows progress WITHIN the current level, not absolute XP / next-threshold.
// xpForCurrentLevel is the XP at which the user reached this level.
// The thresholds follow level² × 50 (see lib/trivia.ts getXPForNextLevel).
function thresholdAtLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.pow(level - 1, 2) * 50;
}

export function XPBar({ level, xp, xpForNext, showLabel = true }: XPBarProps) {
  const xpForCurrent = thresholdAtLevel(level);
  const span = Math.max(1, xpForNext - xpForCurrent);
  const into = Math.max(0, xp - xpForCurrent);
  const ratio = Math.max(0, Math.min(1, into / span));
  const remaining = Math.max(0, xpForNext - xp);

  const fill = useSharedValue(0);

  useEffect(() => {
    fill.value = withTiming(ratio, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [ratio]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fill.value * 100}%`,
  }));

  return (
    <View style={styles.wrap}>
      {showLabel && (
        <View style={styles.headerRow}>
          <Text style={styles.label}>Level {level} → {level + 1}</Text>
          <Text style={styles.value}>{remaining.toLocaleString()} XP to go</Text>
        </View>
      )}
      <View style={styles.barBg}>
        <Animated.View style={[styles.barFill, fillStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  value: {
    fontSize: FontSize.sm,
    color: Colors.primaryLight,
    fontFamily: 'BricolageGrotesque_700Bold',
  },
  barBg: {
    height: 8,
    backgroundColor: Colors.bgOverlay,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },
});
