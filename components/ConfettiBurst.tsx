import React, { useRef, useEffect } from 'react';
import { Dimensions, View, StyleSheet } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Colors } from '@/constants/theme';

interface ConfettiBurstProps {
  trigger: boolean;
  count?: number;
}

const { width } = Dimensions.get('window');

const COLORS = [
  Colors.primary,
  Colors.primaryLight,
  Colors.gold,
  Colors.goldLight,
  Colors.success,
  Colors.accent,
];

export function ConfettiBurst({ trigger, count = 120 }: ConfettiBurstProps) {
  const ref = useRef<ConfettiCannon | null>(null);

  useEffect(() => {
    if (trigger) {
      ref.current?.start();
    }
  }, [trigger]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <ConfettiCannon
        ref={ref}
        count={count}
        origin={{ x: width / 2, y: 0 }}
        autoStart={false}
        fadeOut
        explosionSpeed={400}
        fallSpeed={2800}
        colors={COLORS}
      />
    </View>
  );
}
