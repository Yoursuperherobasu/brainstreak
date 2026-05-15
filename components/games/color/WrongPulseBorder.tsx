import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { Colors, Radius } from '@/constants/theme';

interface Props {
  /** Bumped to fire a red border pulse over its parent. */
  pulseKey: number;
}

// Red 2px border that pulses opacity 1 → 0.3 → 1 → 0 across 350ms.
// Absolutely positioned inside the parent's relative wrapper.
export function WrongPulseBorder({ pulseKey }: Props) {
  const op = useSharedValue(0);

  useEffect(() => {
    if (pulseKey === 0) return;
    op.value = withSequence(
      withTiming(1, { duration: 70 }),
      withTiming(0.3, { duration: 110 }),
      withTiming(1, { duration: 90 }),
      withTiming(0, { duration: 80 }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulseKey]);

  const a = useAnimatedStyle(() => ({ opacity: op.value }));

  return <Animated.View pointerEvents="none" style={[styles.border, a]} />;
}

const styles = StyleSheet.create({
  border: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: Colors.danger,
    borderRadius: Radius.lg,
  },
});
