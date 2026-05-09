import React, { useEffect } from 'react';
import { Text, StyleSheet, Pressable, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { haptics } from '@/lib/haptics';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/constants/theme';

export type AnswerState = 'idle' | 'selected' | 'correct' | 'wrong';

interface AnswerButtonProps {
  letter: 'A' | 'B' | 'C' | 'D';
  text: string;
  state: AnswerState;
  onPress: () => void;
  disabled?: boolean;
  /** Stagger continuous bobbing across siblings; pass index 0..3. */
  bobIndex?: number;
}

export function AnswerButton({ letter, text, state, onPress, disabled, bobIndex = 0 }: AnswerButtonProps) {
  const scale = useSharedValue(1);
  const shake = useSharedValue(0);
  const bob = useSharedValue(0);

  // Continuous "alive" bobbing while idle. Each sibling gets a different
  // phase via bobIndex so the four bubbles drift independently.
  useEffect(() => {
    if (state !== 'idle') {
      bob.value = withTiming(0, { duration: 200 });
      return;
    }
    bob.value = withDelay(
      bobIndex * 250,
      withRepeat(
        withSequence(
          withTiming(-3, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
          withTiming(3, { duration: 1200, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
  }, [state, bobIndex]);

  useEffect(() => {
    if (state === 'wrong') {
      shake.value = withSequence(
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(-5, { duration: 60 }),
        withTiming(0, { duration: 60 })
      );
    } else if (state === 'correct') {
      scale.value = withSequence(
        withSpring(1.08, { damping: 8, stiffness: 220 }),
        withSpring(1, { damping: 8, stiffness: 220 })
      );
    }
  }, [state]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bob.value },
      { translateX: shake.value },
      { scale: scale.value },
    ],
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

  let borderColor = Colors.borderBright;
  let bgColor = Colors.bgCard;
  let textColor = Colors.textPrimary;
  let badge: string | null = null;
  let letterBg = Colors.bgOverlay;
  let letterColor = Colors.textSecondary;

  if (state === 'correct') {
    borderColor = Colors.success;
    bgColor = Colors.successLight;
    textColor = Colors.textPrimary;
    letterBg = Colors.success;
    letterColor = '#FFFFFF';
    badge = '✓';
  } else if (state === 'wrong') {
    borderColor = Colors.danger;
    bgColor = Colors.dangerLight;
    textColor = Colors.textPrimary;
    letterBg = Colors.danger;
    letterColor = '#FFFFFF';
    badge = '✕';
  } else if (state === 'selected') {
    borderColor = Colors.primary;
    bgColor = `${Colors.primary}1F`;
    letterBg = Colors.primary;
    letterColor = '#FFFFFF';
  }

  return (
    <Animated.View style={[styles.outer, { borderColor, backgroundColor: bgColor }, animStyle]}>
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        android_ripple={{ color: `${Colors.primary}22` }}
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      >
        <View style={styles.row}>
          <View style={[styles.letterWrap, { backgroundColor: letterBg }]}>
            <Text style={[styles.letter, { color: letterColor }]}>{letter}</Text>
          </View>
          <Text style={[styles.text, { color: textColor }]} numberOfLines={3}>
            {text}
          </Text>
          {badge && <Text style={[styles.badge, { color: textColor }]}>{badge}</Text>}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  pressable: {
    width: '100%',
  },
  pressed: {
    opacity: 0.92,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: 12,
  },
  letterWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontSize: FontSize.sm,
    fontFamily: 'BricolageGrotesque_700Bold',
  },
  text: {
    flex: 1,
    fontSize: FontSize.md,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  badge: {
    fontSize: 22,
    fontFamily: 'BagelFatOne_400Regular',
  },
});
