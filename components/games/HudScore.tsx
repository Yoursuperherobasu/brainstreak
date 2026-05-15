import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { Colors, FontSize, Radius } from '@/constants/theme';

// Animated score chip for the game HUD. Pops on every value change.
// The number sits inside a soft pill so it never collapses into an
// unreadable blob when the display font hasn't loaded yet.
export function HudScore({ value }: { value: number }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.18, { duration: 110 }),
      withTiming(1, { duration: 200 }),
    );
  }, [value]);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[styles.pill, animStyle]}>
      <Animated.Text style={styles.text} numberOfLines={1}>
        {value.toLocaleString()}
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    minWidth: 56,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    letterSpacing: 0,
  },
});
