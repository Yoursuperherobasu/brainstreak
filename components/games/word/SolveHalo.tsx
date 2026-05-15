import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '@/constants/theme';

interface Props {
  /** Increments to trigger a fresh halo burst behind the answer row. */
  burstKey: number;
}

// Golden halo expanding behind the input/answer row on a solve.
// scale 1 → 1.3, opacity 0.6 → 0 over 500ms. Sits absolutely positioned
// behind its sibling content (parent uses `position: relative`).
export function SolveHalo({ burstKey }: Props) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (burstKey === 0) return;
    scale.value = 1;
    opacity.value = 0.6;
    scale.value = withTiming(1.3, { duration: 500 });
    opacity.value = withSequence(withTiming(0.6, { duration: 60 }), withTiming(0, { duration: 440 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burstKey]);

  const a = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFillObject, styles.halo, a]} />
    </View>
  );
}

const styles = StyleSheet.create({
  halo: {
    backgroundColor: `${Colors.gold}55`,
    borderRadius: 24,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 0,
  },
});
