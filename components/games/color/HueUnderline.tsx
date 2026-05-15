import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import { Colors } from '@/constants/theme';

interface Props {
  /** Final settled color (matches the word's ink color). */
  finalColor: string;
  /** Bumped to replay the cycle on each new round. */
  resetKey: number;
}

// Thin colored underline that briefly cycles through 3 theme colors then
// settles on `finalColor`. Color is interpolated via plain JS setState
// across 3 quick steps (~80ms each) — no expensive interpolateColor on the
// UI thread needed for just 3 swaps. The scale/opacity easing stays on the
// UI thread for smoothness.
const CYCLE: string[] = [Colors.primary, Colors.accent, Colors.gold];
const STEP_MS = 90;

export function HueUnderline({ finalColor, resetKey }: Props) {
  const [color, setColor] = useState(finalColor);
  const sx = useSharedValue(0);
  const op = useSharedValue(0);

  useEffect(() => {
    // Reset visual state to the entrance pose, then sweep in.
    sx.value = 0;
    op.value = 0;
    sx.value = withDelay(80, withSpring(1, { damping: 14, stiffness: 180 }));
    op.value = withSequence(
      withTiming(1, { duration: 120 }),
      withDelay(260, withTiming(0.85, { duration: 200 })),
    );

    // Color cycle on the JS thread: 3 swaps then settle. setTimeout is
    // cheap; we don't try to coordinate this with the UI-thread sweep.
    setColor(CYCLE[0]);
    const t1 = setTimeout(() => setColor(CYCLE[1]), STEP_MS);
    const t2 = setTimeout(() => setColor(CYCLE[2]), STEP_MS * 2);
    const t3 = setTimeout(() => setColor(finalColor), STEP_MS * 3);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, finalColor]);

  const a = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ scaleX: sx.value }],
  }));

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Animated.View style={[styles.line, { backgroundColor: color }, a]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', height: 6, marginTop: 6 },
  line: { height: 3, width: 140, borderRadius: 2 },
});
