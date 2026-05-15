import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { Colors, FontSize } from '@/constants/theme';

export function HudScore({ value }: { value: number }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withSequence(withTiming(1.18, { duration: 110 }), withTiming(1, { duration: 200 }));
  }, [value]);
  const s = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.Text style={[styles.text, s]}>{value.toLocaleString()}</Animated.Text>;
}

const styles = StyleSheet.create({
  text: { fontSize: FontSize.xxl, color: Colors.textPrimary, fontFamily: 'BagelFatOne_400Regular' },
});
