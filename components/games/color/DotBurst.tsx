import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '@/constants/theme';

interface Props {
  /** Bumped to fire a burst. */
  burstKey: number;
  /** Six theme colors used for the dots (rotates through them). */
  colors?: string[];
}

const DOT_COUNT = 6;
const RADIUS = 60;     // px outward travel
const DOT_SIZE = 10;

// Six small theme-colored dots burst outward from the centre over 420ms.
// Pure transform + opacity, capped at 6 dots for cheap render.
export function DotBurst({
  burstKey,
  colors = [Colors.primary, Colors.accent, Colors.gold, Colors.success, Colors.danger, Colors.primaryLight],
}: Props) {
  return (
    <View pointerEvents="none" style={styles.wrap}>
      {Array.from({ length: DOT_COUNT }).map((_, i) => (
        <Dot key={i} index={i} burstKey={burstKey} color={colors[i % colors.length]} />
      ))}
    </View>
  );
}

function Dot({ index, burstKey, color }: { index: number; burstKey: number; color: string }) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const op = useSharedValue(0);
  const scale = useSharedValue(0.6);

  useEffect(() => {
    if (burstKey === 0) return;
    const angle = (index / DOT_COUNT) * Math.PI * 2;
    const dx = Math.cos(angle) * RADIUS;
    const dy = Math.sin(angle) * RADIUS;
    tx.value = 0;
    ty.value = 0;
    op.value = 1;
    scale.value = 0.6;
    tx.value = withTiming(dx, { duration: 420, easing: Easing.out(Easing.quad) });
    ty.value = withTiming(dy, { duration: 420, easing: Easing.out(Easing.quad) });
    scale.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    op.value = withTiming(0, { duration: 420, easing: Easing.in(Easing.quad) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burstKey]);

  const a = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return <Animated.View style={[styles.dot, { backgroundColor: color }, a]} />;
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});
