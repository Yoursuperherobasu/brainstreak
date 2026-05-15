import React, { useEffect } from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Colors, FontSize, Radius } from '@/constants/theme';

export type ChoiceFlash = null | 'correct' | 'wrong';

interface Props {
  value: number;
  onPress: () => void;
  /** When this changes to 'correct' or 'wrong', a flash plays. */
  flash: ChoiceFlash;
  /** Bumped each time the parent re-asks; clears any lingering halo. */
  resetKey: number;
}

// Number Sense answer chip with a cartoon flourish:
// - On correct: green halo ring scales 1 → 1.8, opacity 0.6 → 0 over 350ms,
//   plus a quick scale pulse on the chip itself.
// - On wrong: 3 oscillations translateX ±6 px @ 70ms each.
// All animations are transform/opacity only — UI-thread cheap.
export function ChoiceButton({ value, onPress, flash, resetKey }: Props) {
  const scale = useSharedValue(1);
  const shake = useSharedValue(0);
  const haloScale = useSharedValue(1);
  const haloOpacity = useSharedValue(0);

  useEffect(() => {
    // Reset visuals between questions so a halo from the previous round
    // doesn't bleed into the next.
    haloOpacity.value = 0;
    haloScale.value = 1;
    shake.value = 0;
    scale.value = 1;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    if (flash === 'correct') {
      haloScale.value = 1;
      haloOpacity.value = 0.6;
      haloScale.value = withTiming(1.8, { duration: 350 });
      haloOpacity.value = withTiming(0, { duration: 350 });
      scale.value = withSequence(
        withSpring(1.08, { damping: 10, stiffness: 220 }),
        withSpring(1, { damping: 10, stiffness: 220 }),
      );
    } else if (flash === 'wrong') {
      shake.value = withSequence(
        withTiming(-6, { duration: 70 }),
        withTiming(6, { duration: 70 }),
        withTiming(-6, { duration: 70 }),
        withTiming(6, { duration: 70 }),
        withTiming(-6, { duration: 70 }),
        withTiming(0, { duration: 70 }),
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flash]);

  const chipStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }, { scale: scale.value }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
    transform: [{ scale: haloScale.value }],
  }));

  return (
    <View style={styles.wrap}>
      <Animated.View pointerEvents="none" style={[styles.halo, haloStyle]} />
      <Animated.View style={chipStyle}>
        <Pressable onPress={onPress} style={styles.choice}>
          <Text style={styles.choiceText}>{value}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    width: 96,
    height: 80,
    borderRadius: Radius.lg,
    borderWidth: 3,
    borderColor: Colors.success,
    backgroundColor: `${Colors.success}33`,
  },
  choice: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: Colors.primary,
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderRadius: Radius.lg,
    minWidth: 84,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 2,
  },
  choiceText: { fontSize: FontSize.xxl, color: Colors.primary, fontFamily: 'BricolageGrotesque_800ExtraBold' },
});
