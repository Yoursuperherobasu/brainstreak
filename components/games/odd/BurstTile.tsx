// Odd One Out — animated tile with eureka pop + halo ring (on correct) and
// red-border sting (on wrong). Both effects share the same Pressable so the
// parent just toggles `correctBurst` / `wrongSting` props.
//
// Re-fires whenever the tick counters change. We use tick counters instead
// of booleans so consecutive wrong taps on the same tile still replay.

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Colors, Radius, Shadow } from '@/constants/theme';

interface Props {
  color: string;
  width: number;
  height: number;
  onPress: () => void;
  /** Increment to fire correct-pick burst (pop + yellow halo). */
  correctBurstTick: number;
  /** Increment to fire wrong-pick sting (red border ring). */
  wrongStingTick: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function BurstTile({
  color,
  width,
  height,
  onPress,
  correctBurstTick,
  wrongStingTick,
  accessibilityLabel,
  style,
}: Props) {
  const scale = useSharedValue(1);
  const haloScale = useSharedValue(1);
  const haloOpacity = useSharedValue(0);
  const ringOpacity = useSharedValue(0);

  // Correct-pick burst.
  useEffect(() => {
    if (correctBurstTick <= 0) return;
    scale.value = withSequence(
      withSpring(1.3, { damping: 9, stiffness: 240 }),
      withSpring(1, { damping: 12, stiffness: 200 })
    );
    haloScale.value = 1;
    haloOpacity.value = 0.5;
    haloScale.value = withTiming(2.0, { duration: 350 });
    haloOpacity.value = withTiming(0, { duration: 350 });
  }, [correctBurstTick, scale, haloScale, haloOpacity]);

  // Wrong-pick sting: red border ring for 220ms, then fade.
  useEffect(() => {
    if (wrongStingTick <= 0) return;
    ringOpacity.value = 1;
    ringOpacity.value = withSequence(
      withTiming(1, { duration: 220 }),
      withTiming(0, { duration: 160 })
    );
  }, [wrongStingTick, ringOpacity]);

  const tileStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
    transform: [{ scale: haloScale.value }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
  }));

  return (
    <View style={[{ width, height }, styles.wrap, style]}>
      {/* Yellow halo — sits behind the tile, expands outward on correct pick. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          { width, height, borderColor: Colors.gold },
          haloStyle,
        ]}
      />
      {/* Red border ring — overlays the tile briefly on wrong pick. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          { width, height, borderColor: Colors.danger },
          ringStyle,
        ]}
      />
      <Animated.View style={[{ width, height }, tileStyle]}>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          style={[styles.tile, { width, height, backgroundColor: color }]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tile: {
    borderRadius: Radius.md,
    ...Shadow.sm,
  },
  halo: {
    position: 'absolute',
    borderRadius: Radius.md,
    borderWidth: 3,
  },
  ring: {
    position: 'absolute',
    borderRadius: Radius.md,
    borderWidth: 3,
  },
});
