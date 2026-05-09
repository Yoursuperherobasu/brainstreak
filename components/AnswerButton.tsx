import React, { useEffect } from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { haptics } from '@/lib/haptics';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';

export type AnswerState = 'idle' | 'selected' | 'correct' | 'wrong';

interface AnswerButtonProps {
  letter: 'A' | 'B' | 'C' | 'D';
  text: string;
  state: AnswerState;
  onPress: () => void;
  disabled?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function AnswerButton({ letter, text, state, onPress, disabled }: AnswerButtonProps) {
  const scale = useSharedValue(1);
  const shake = useSharedValue(0);

  useEffect(() => {
    if (state === 'wrong') {
      shake.value = withSequence(
        withTiming(-6, { duration: 60 }),
        withTiming(6, { duration: 60 }),
        withTiming(-4, { duration: 60 }),
        withTiming(0, { duration: 60 })
      );
    } else if (state === 'correct') {
      scale.value = withSequence(
        withSpring(1.06, { damping: 8, stiffness: 220 }),
        withSpring(1, { damping: 8, stiffness: 220 })
      );
    }
  }, [state]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: shake.value }],
  }));

  const handlePress = () => {
    if (disabled) return;
    scale.value = withSequence(
      withSpring(0.95, { damping: 12, stiffness: 300 }),
      withSpring(1, { damping: 12, stiffness: 300 })
    );
    haptics.light();
    onPress();
  };

  let borderColor = Colors.border;
  let bgColor = Colors.bgCard;
  let textColor = Colors.textPrimary;
  let badge: string | null = null;

  if (state === 'correct') {
    borderColor = Colors.success;
    bgColor = `${Colors.success}20`;
    textColor = Colors.successLight;
    badge = '✓';
  } else if (state === 'wrong') {
    borderColor = Colors.danger;
    bgColor = `${Colors.danger}15`;
    textColor = Colors.dangerLight;
    badge = '✕';
  } else if (state === 'selected') {
    borderColor = Colors.primary;
    bgColor = `${Colors.primary}20`;
  }

  return (
    <AnimatedTouchable
      activeOpacity={0.85}
      onPress={handlePress}
      disabled={disabled}
      style={[styles.outer, { borderColor, backgroundColor: bgColor }, animStyle]}
    >
      <View style={styles.row}>
        <Text style={styles.letter}>{letter}</Text>
        <Text style={[styles.text, { color: textColor }]} numberOfLines={3}>
          {text}
        </Text>
        {badge && <Text style={styles.badge}>{badge}</Text>}
      </View>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: Radius.md,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: 12,
  },
  letter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.bgOverlay,
    textAlign: 'center',
    lineHeight: 28,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'Outfit_700Bold',
  },
  text: {
    flex: 1,
    fontSize: FontSize.md,
    fontFamily: 'Inter_400Regular',
  },
  badge: {
    fontSize: 18,
    fontFamily: 'Outfit_900Black',
  },
});
