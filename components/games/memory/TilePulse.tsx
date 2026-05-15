// Memory Match — animated tile with bouncy pulse + expanding glow ring.
// Reanimated drives transform + opacity only (no layout work) so it stays at
// 60fps on mid-range Android. The glow ring is a separate absolutely-
// positioned <Animated.View> that scales out and fades each time `active`
// flips on, giving the tile a Simon-says jukebox feel.

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Radius } from '@/constants/theme';

interface Props {
  color: string;
  active: boolean;
  disabled: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function TilePulse({ color, active, disabled, onPress, style }: Props) {
  const scale = useSharedValue(1);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    if (!active) return;
    // Bouncy pop: 1 → 1.15 → 1.
    scale.value = withSequence(
      withSpring(1.15, { damping: 10, stiffness: 260 }),
      withSpring(1, { damping: 12, stiffness: 220 })
    );
    // Glow ring expands outward and fades.
    ringScale.value = 1;
    ringOpacity.value = 0.6;
    ringScale.value = withTiming(1.5, { duration: 400 });
    ringOpacity.value = withTiming(0, { duration: 400 });
  }, [active, scale, ringScale, ringOpacity]);

  const tileStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: active ? 1 : 0.45,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  return (
    <View style={[styles.wrap, style]} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.ring,
          { borderColor: color },
          ringStyle,
        ]}
        pointerEvents="none"
      />
      <Animated.View style={[styles.tileOuter, tileStyle]}>
        <Pressable
          onPress={onPress}
          disabled={disabled}
          style={[styles.tile, { backgroundColor: color }]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 132,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileOuter: {
    width: 132,
    height: 132,
  },
  tile: {
    width: 132,
    height: 132,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  ring: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: Radius.lg,
    borderWidth: 3,
  },
});
