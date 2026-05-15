import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Colors, Radius, Spacing } from '@/constants/theme';

interface SkeletonCardProps {
  height?: number;
  style?: ViewStyle;
}

export function SkeletonCard({ height = 80, style }: SkeletonCardProps) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [opacity]);

  const anim = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[styles.card, { height }, anim, style]} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.md,
    marginVertical: Spacing.xs,
  },
});
