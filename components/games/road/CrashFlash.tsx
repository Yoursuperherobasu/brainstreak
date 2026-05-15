// Full-field red flash that fires once on collision. 80ms ramp-in to 0.4
// opacity, then 280ms fade to 0. Self-mounted by the parent on game-over.

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '@/constants/theme';

export interface CrashFlashProps {
  // Increment a counter (e.g., crash-event id) to trigger a new flash.
  trigger: number;
}

export function CrashFlash({ trigger }: CrashFlashProps) {
  const op = useSharedValue(0);

  useEffect(() => {
    if (trigger <= 0) return;
    op.value = 0;
    op.value = withSequence(
      withTiming(0.4, { duration: 80, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 280, easing: Easing.in(Easing.quad) }),
    );
  }, [trigger, op]);

  const style = useAnimatedStyle(() => ({ opacity: op.value }));

  return <Animated.View pointerEvents="none" style={[styles.flash, style]} />;
}

const styles = StyleSheet.create({
  flash: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: Colors.danger,
  },
});
