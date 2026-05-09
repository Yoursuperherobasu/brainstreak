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

export function XPBar({ level, xp, xpForNext, showLabel = true }: XPBarProps) {
  const ratio = Math.max(0, Math.min(1, xpForNext > 0 ? xp / xpForNext : 0));
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
          <Text style={styles.value}>{xp.toLocaleString()} / {xpForNext.toLocaleString()} XP</Text>
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
    fontFamily: 'Inter_600SemiBold',
  },
  value: {
    fontSize: FontSize.sm,
    color: Colors.primaryLight,
    fontFamily: 'Outfit_700Bold',
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
