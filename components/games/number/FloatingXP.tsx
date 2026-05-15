import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors, FontSize } from '@/constants/theme';

interface Props {
  /** When this changes from 0 to a positive number, the "+N" text floats up. */
  burstKey: number;
  amount: number;
}

// Floating "+10" XP-style text. translateY 0 → -30, opacity 1 → 0 over 600ms.
// Centred above the choices row by the parent (absolute positioning).
export function FloatingXP({ burstKey, amount }: Props) {
  const ty = useSharedValue(0);
  const op = useSharedValue(0);

  useEffect(() => {
    if (burstKey === 0) return;
    ty.value = 0;
    op.value = 1;
    ty.value = withTiming(-30, { duration: 600, easing: Easing.out(Easing.quad) });
    op.value = withTiming(0, { duration: 600, easing: Easing.in(Easing.quad) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burstKey]);

  const a = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateY: ty.value }],
  }));

  if (amount <= 0) return null;
  return <Animated.Text style={[styles.text, a]}>{`+${amount}`}</Animated.Text>;
}

const styles = StyleSheet.create({
  text: {
    position: 'absolute',
    alignSelf: 'center',
    fontSize: FontSize.lg,
    color: Colors.success,
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    textShadowColor: '#FFFFFFAA',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
