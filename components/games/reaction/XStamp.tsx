// "X" stamp shown briefly when the player taps too early / misses the dot.
// Two thick red strokes (chunky cartoon style) inside a soft rounded square
// "stamp" backing. Wobbles via a small rotation oscillation for ~350ms.

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import Svg, { Rect, Line } from 'react-native-svg';
import { Colors } from '@/constants/theme';

export interface XStampProps {
  center: { x: number; y: number } | null;
  trigger: number;
  size?: number;
}

export function XStamp({ center, trigger, size = 64 }: XStampProps) {
  const op = useSharedValue(0);
  const scale = useSharedValue(0);
  const rot = useSharedValue(0);

  useEffect(() => {
    if (trigger <= 0) return;
    op.value = 0;
    scale.value = 0.6;
    rot.value = 0;
    op.value = withSequence(
      withTiming(1, { duration: 60 }),
      withDelay(240, withTiming(0, { duration: 90 })),
    );
    scale.value = withSequence(
      withTiming(1.15, { duration: 90, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 90 }),
    );
    // Subtle wobble: -8° → +8° → -4° → 0°.
    rot.value = withSequence(
      withTiming(-8, { duration: 80, easing: Easing.out(Easing.quad) }),
      withTiming(8, { duration: 100, easing: Easing.inOut(Easing.quad) }),
      withTiming(-4, { duration: 90, easing: Easing.inOut(Easing.quad) }),
      withTiming(0, { duration: 80, easing: Easing.out(Easing.quad) }),
    );
  }, [trigger, op, scale, rot]);

  const style = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ scale: scale.value }, { rotate: `${rot.value}deg` }],
  }));

  if (!center) return null;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.wrap,
        { left: center.x - size / 2, top: center.y - size / 2, width: size, height: size },
      ]}
    >
      <Animated.View style={[{ width: size, height: size }, style]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          {/* stamp backing — soft tomato with thicker outline */}
          <Rect
            x="6"
            y="6"
            width="88"
            height="88"
            rx="14"
            fill={Colors.dangerLight}
            stroke={Colors.danger}
            strokeWidth="6"
          />
          {/* the X — two fat strokes in tomato red */}
          <Line x1="24" y1="24" x2="76" y2="76" stroke={Colors.danger} strokeWidth="14" strokeLinecap="round" />
          <Line x1="76" y1="24" x2="24" y2="76" stroke={Colors.danger} strokeWidth="14" strokeLinecap="round" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
  },
});
