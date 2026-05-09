import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Colors, FontSize, Spacing } from '@/constants/theme';

interface StreakBadgeProps {
  streak: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animate?: boolean;
}

export function StreakBadge({
  streak,
  size = 'md',
  showLabel = true,
  animate = true,
}: StreakBadgeProps) {
  const flicker = useSharedValue(1);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    // Entrance animation
    scale.value = withSpring(1, { damping: 8, stiffness: 200 });

    if (animate && streak > 0) {
      // Subtle flame flicker
      flicker.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 600, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.95, { duration: 600, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );
    }
  }, [streak]);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flicker.value * scale.value }],
  }));

  const sizes = {
    sm: { emoji: 20, number: FontSize.sm, label: FontSize.xs, padding: 6 },
    md: { emoji: 32, number: FontSize.xl, label: FontSize.sm, padding: 10 },
    lg: { emoji: 48, number: FontSize.xxxl, label: FontSize.md, padding: 14 },
  };

  const s = sizes[size];
  const isActive = streak > 0;
  const isMilestone = streak >= 7;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.badge, { padding: s.padding }, flameStyle]}>
        <Text style={{ fontSize: s.emoji }}>{isActive ? '🔥' : '💤'}</Text>
        <Text
          style={[
            styles.number,
            {
              fontSize: s.number,
              color: isMilestone ? Colors.goldLight : Colors.textPrimary,
            },
          ]}
        >
          {streak}
        </Text>
      </Animated.View>
      {showLabel && (
        <Text style={[styles.label, { fontSize: s.label }]}>
          {streak === 0
            ? 'Start your streak!'
            : streak === 1
            ? '1 day streak'
            : `${streak} day streak`}
        </Text>
      )}
    </View>
  );
}

// Compact inline version for headers
export function StreakPill({ streak }: { streak: number }) {
  const scale = useSharedValue(1);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.pill, pillStyle]}>
      <Text style={styles.pillEmoji}>🔥</Text>
      <Text style={styles.pillText}>{streak}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  badge: {
    alignItems: 'center',
    gap: 2,
  },
  number: {
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  label: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.bgElevated,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillEmoji: {
    fontSize: 14,
  },
  pillText: {
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
