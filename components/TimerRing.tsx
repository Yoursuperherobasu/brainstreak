import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  Easing,
  withSpring,
} from 'react-native-reanimated';
import { Colors, FontSize } from '@/constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface TimerRingProps {
  timeLeft: number;
  totalTime: number;
  size?: number;
  strokeWidth?: number;
}

export function TimerRing({
  timeLeft,
  totalTime,
  size = 88,
  strokeWidth = 8,
}: TimerRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = useSharedValue(1);
  const pulse = useSharedValue(1);

  useEffect(() => {
    progress.value = withTiming(timeLeft / totalTime, {
      duration: 600,
      easing: Easing.out(Easing.quad),
    });

    if (timeLeft > 0 && timeLeft <= 5) {
      pulse.value = withSpring(1.12, { damping: 6, stiffness: 200 }, () => {
        pulse.value = withSpring(1, { damping: 6, stiffness: 200 });
      });
    }
  }, [timeLeft, totalTime]);

  const animatedProps = useAnimatedProps(() => {
    const dashOffset = circumference * (1 - progress.value);
    const strokeColor =
      progress.value > 0.5
        ? Colors.success
        : progress.value > 0.25
        ? Colors.gold
        : Colors.danger;
    return {
      strokeDashoffset: dashOffset,
      stroke: strokeColor,
    };
  });

  const wrapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const numberColor =
    timeLeft <= 5 ? Colors.danger : timeLeft <= 10 ? Colors.gold : Colors.textPrimary;

  return (
    <Animated.View style={[styles.wrap, { width: size, height: size }, wrapStyle]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.bgOverlay}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
          animatedProps={animatedProps}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.number, { color: numberColor }]}>{timeLeft}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontFamily: 'BagelFatOne_400Regular',
    fontSize: FontSize.xxl,
    lineHeight: FontSize.xxl + 2,
  },
});
