import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

// Diagonal light-streak that slowly sweeps across a gradient card. Use
// inside a card that has `overflow: hidden` and is at least ~280px wide.
// The streak is a thin tilted bar with a soft glow; on web we use a CSS
// linear gradient for the streak fill to get the smooth fade.

export function HeroSheen({ widthFactor = 2 }: { widthFactor?: number }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: 5800, easing: Easing.linear }),
      -1,
      false,
    );
    return () => { cancelAnimation(t); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => {
    // Travel from -50% to 150% of card width, then wrap.
    const pct = -50 + t.value * 200;
    return {
      transform: [
        { translateX: pct + '%' as any },
        { rotateZ: '18deg' },
      ],
    };
  });

  // The streak itself — a soft white gradient bar. Web gets a CSS gradient
  // for the smooth fade; native renders a plain semi-transparent strip
  // which still reads nicely.
  const streakStyle =
    Platform.OS === 'web'
      ? {
          backgroundImage:
            'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0) 100%)',
        }
      : { backgroundColor: 'rgba(255,255,255,0.18)' };

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Animated.View style={[styles.streak, animStyle, { width: `${widthFactor * 60}%` as any }, streakStyle as any]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  streak: {
    position: 'absolute',
    top: '-50%',
    height: '200%',
  },
});
