import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Colors, Spacing } from '@/constants/theme';

interface Props {
  step: number;        // 1-based
  total: number;
}

function Dot({ active }: { active: boolean }) {
  const width = useSharedValue(active ? 24 : 8);

  useEffect(() => {
    width.value = withTiming(active ? 24 : 8, { duration: 200 });
  }, [active]);

  const animStyle = useAnimatedStyle(() => ({ width: width.value }));

  return (
    <Animated.View
      style={[
        styles.dot,
        animStyle,
        { backgroundColor: active ? Colors.primary : Colors.borderBright },
      ]}
    />
  );
}

export function OnboardingDots({ step, total }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <Dot key={i} active={i + 1 === step} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.xs, alignItems: 'center' },
  dot: { height: 8, borderRadius: 4 },
});
