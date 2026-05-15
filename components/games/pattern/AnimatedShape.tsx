// Pattern Recall — wraps <ShapeIcon> with a flashcard-charm entrance:
// springs in from scale 0 with a slight wobble rotation that settles.
//
// Re-fires every time `keyValue` changes (the parent passes a new value when
// a fresh shape should appear, e.g. when activeShape changes during the
// playback sequence).

import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ShapeIcon } from './ShapeIcon';
import type { ShapeId } from '@/lib/games/patternRecall';

interface Props {
  shape: ShapeId;
  size: number;
  color: string;
  /** When this value changes, replay the entrance animation. */
  keyValue: string | number;
  /** If true, tint red and shake. Resets when false. */
  wrongFlash?: boolean;
}

export function AnimatedShape({ shape, size, color, keyValue, wrongFlash = false }: Props) {
  const scale = useSharedValue(0);
  const rotate = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const tint = useSharedValue(0);  // 0 = original color, 1 = red

  // Entrance: spring scale 0 → 1, with a slight wobble rotation that settles.
  useEffect(() => {
    scale.value = 0;
    rotate.value = -5;
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    rotate.value = withSequence(
      withSpring(5, { damping: 8, stiffness: 220 }),
      withSpring(0, { damping: 12, stiffness: 200 })
    );
  }, [keyValue, scale, rotate]);

  // Wrong-pick flash: tint red + shake (translateX ±4px, 3 oscillations, 70ms each).
  useEffect(() => {
    if (!wrongFlash) {
      tint.value = withTiming(0, { duration: 160 });
      return;
    }
    tint.value = withSequence(
      withTiming(1, { duration: 60 }),
      withTiming(0, { duration: 240 })
    );
    shakeX.value = withSequence(
      withTiming(-4, { duration: 70 }),
      withTiming(4, { duration: 70 }),
      withTiming(-4, { duration: 70 }),
      withTiming(0, { duration: 70 })
    );
  }, [wrongFlash, tint, shakeX]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shakeX.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  const tintOverlayStyle = useAnimatedStyle(() => ({
    opacity: tint.value * 0.55,
  }));

  return (
    <Animated.View style={animStyle}>
      <ShapeIcon shape={shape} size={size} color={color} />
      {/* Red wash overlay for the wrong-flash. Position absolute over the shape. */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#E84B3C',
            borderRadius: size / 2,
          },
          tintOverlayStyle,
        ]}
      />
    </Animated.View>
  );
}
