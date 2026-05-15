// Memory Match — "+N COMBO" overlay that springs in then fades out.
// Mounted whenever a fresh combo is achieved (every 3 rounds in a row).
// Self-clearing via timeout so the parent doesn't have to manage exit state.

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { Colors, FontSize, Radius, Shadow } from '@/constants/theme';

interface Props {
  comboCount: number;  // changes ⇒ banner re-fires
  label?: string;      // override the "+N COMBO" text
}

export function ComboBanner({ comboCount, label }: Props) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-20);

  useEffect(() => {
    if (comboCount <= 0) return;
    scale.value = 0;
    opacity.value = 0;
    translateY.value = -20;
    // Spring in.
    scale.value = withSpring(1, { damping: 10, stiffness: 240 });
    opacity.value = withTiming(1, { duration: 160 });
    translateY.value = withSpring(0, { damping: 14, stiffness: 220 });
    // Fade out after ~800ms total (160 in + 240 hold + 400 out).
    opacity.value = withDelay(400, withTiming(0, { duration: 400 }));
  }, [comboCount, scale, opacity, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  if (comboCount <= 0) return null;
  const text = label ?? `+${comboCount} COMBO`;

  return (
    <View pointerEvents="none" style={styles.host}>
      <Animated.View style={[styles.pill, animStyle]}>
        <Animated.Text style={styles.text}>{text}</Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 30,
  },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: Colors.gold,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...Shadow.lg,
  },
  text: {
    color: '#1B1726',
    fontFamily: 'BagelFatOne_400Regular',
    fontSize: FontSize.lg,
    letterSpacing: 0.5,
  },
});
