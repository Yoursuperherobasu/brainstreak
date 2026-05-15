// Expanding-ring shockwave at a tap position. Two rings staggered by ~80ms
// for that satisfying double-pulse. Each ring: scale 0 → 2.5, opacity 1 → 0
// over 400ms. Color matches the dot's neon green so it reads as a "successful
// hit" reward.

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

export interface TapShockwaveProps {
  // Center coords (px, relative to the field). null = no shockwave.
  center: { x: number; y: number } | null;
  // Bump to trigger a new shockwave at the current center.
  trigger: number;
  size?: number;
}

export function TapShockwave({ center, trigger, size = 80 }: TapShockwaveProps) {
  if (!center) return null;
  return (
    <View pointerEvents="none" style={[styles.wrap, { left: center.x - size / 2, top: center.y - size / 2, width: size, height: size }]}>
      <Ring key={`a-${trigger}`} size={size} delay={0} />
      <Ring key={`b-${trigger}`} size={size} delay={80} />
    </View>
  );
}

function Ring({ size, delay }: { size: number; delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = 0;
    t.value = withDelay(
      delay,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) }),
    );
  }, [delay, t]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - t.value,
    transform: [{ scale: 0.0001 + t.value * 2.5 }],
  }));
  return (
    <Animated.View style={[styles.ring, { width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r="44" stroke="#9BF2C7" strokeWidth="6" fill="none" />
        <Circle cx="50" cy="50" r="38" stroke="#21D07A" strokeWidth="4" fill="none" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
  },
  ring: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
