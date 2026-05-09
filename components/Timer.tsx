import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Colors, FontSize } from '@/constants/theme';

interface TimerProps {
  timeLeft: number;
  totalTime: number;
  onExpire: () => void;
}

export function Timer({ timeLeft, totalTime, onExpire }: TimerProps) {
  const progress = useSharedValue(1);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    progress.value = withTiming(timeLeft / totalTime, {
      duration: 1000,
      easing: Easing.linear,
    });

    if (timeLeft <= 5 && timeLeft > 0) {
      // Pulse on low time
      scale.value = withSpring(1.15, { damping: 6, stiffness: 200 }, () => {
        scale.value = withSpring(1, { damping: 6, stiffness: 200 });
      });
    }

    if (timeLeft === 0) {
      onExpire();
    }
  }, [timeLeft]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
    backgroundColor:
      progress.value > 0.5
        ? Colors.success
        : progress.value > 0.25
        ? Colors.gold
        : Colors.danger,
  }));

  const textStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    color:
      timeLeft <= 5 ? Colors.danger : timeLeft <= 10 ? Colors.gold : Colors.textPrimary,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.barBg}>
        <Animated.View style={[styles.barFill, progressStyle]} />
      </View>
      <Animated.Text style={[styles.text, textStyle]}>{timeLeft}s</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  barBg: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.bgOverlay,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  text: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    width: 36,
    textAlign: 'right',
  },
});
