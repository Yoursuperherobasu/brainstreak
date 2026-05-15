// Pattern Recall — tiny inline confetti burst. Spawns 6 small SVG dots that
// fan outward in random directions and fade. No raster assets, no external
// libs. Total lifespan ~500ms.
//
// We deliberately roll our own instead of reusing react-native-confetti-
// cannon (already shipped for end-of-game). Mid-game we want a tiny pop, not
// a full celebration.

import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '@/constants/theme';

const PALETTE = [Colors.primary, Colors.accent, Colors.gold, Colors.success, Colors.catPop, Colors.catTech];
const DOT_COUNT = 6;
const DOT_SIZE = 6;
const RADIUS = 56;       // how far dots travel
const LIFE_MS = 500;

interface Props {
  /** Each new value triggers a fresh burst. Use a counter from the parent. */
  burstKey: number;
  size?: number;
}

interface DotPlan {
  dx: number;
  dy: number;
  color: string;
}

export function ConfettiDots({ burstKey, size = 140 }: Props) {
  // Plan a new set of trajectories whenever burstKey changes. We use a
  // simple PRNG seeded by burstKey so SSR/tests aren't affected by Math.random.
  const plan: DotPlan[] = useMemo(() => {
    let seed = burstKey * 9301 + 49297;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    return Array.from({ length: DOT_COUNT }, (_, i) => {
      const baseAngle = (i / DOT_COUNT) * Math.PI * 2;
      const jitter = (rand() - 0.5) * 0.8;  // ±0.4 rad
      const angle = baseAngle + jitter;
      const dist = RADIUS * (0.7 + rand() * 0.3);
      return {
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        color: PALETTE[i % PALETTE.length],
      };
    });
  }, [burstKey]);

  if (burstKey <= 0) return null;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.host,
        { width: size, height: size, left: 0, top: 0 },
      ]}
    >
      {plan.map((p, i) => (
        <Dot key={`${burstKey}-${i}`} dx={p.dx} dy={p.dy} color={p.color} center={size / 2} />
      ))}
    </View>
  );
}

interface DotProps {
  dx: number;
  dy: number;
  color: string;
  center: number;
}

function Dot({ dx, dy, color, center }: DotProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: LIFE_MS, easing: Easing.out(Easing.quad) });
  }, [dx, dy, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { translateX: dx * progress.value },
      { translateY: dy * progress.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          left: center - DOT_SIZE / 2,
          top: center - DOT_SIZE / 2,
        },
        style,
      ]}
    >
      <Svg width={DOT_SIZE} height={DOT_SIZE} viewBox="0 0 6 6">
        <Circle cx="3" cy="3" r="3" fill={color} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
  },
  dot: {
    position: 'absolute',
    width: DOT_SIZE,
    height: DOT_SIZE,
  },
});
