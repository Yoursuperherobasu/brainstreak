// Cartoon "GO!" lightning-bolt zap. Drawn as a chunky 2-tone polygon with
// an orange outline + bright yellow fill, plus four small "spark" lines
// radiating out for that classic comic-book energy.
//
// Spring pop in: scale 0 → 1.1 → 1 with a quick rotation wiggle that settles
// to zero. Triggered by the `trigger` counter prop — bumping it kicks off a
// new animation cycle.

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import Svg, { Polygon, Line } from 'react-native-svg';

export interface ZapBurstProps {
  trigger: number;
  size?: number;
}

export function ZapBurst({ trigger, size = 96 }: ZapBurstProps) {
  const scale = useSharedValue(0);
  const rot = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (trigger <= 0) return;
    // Pop in.
    opacity.value = withSequence(
      withTiming(1, { duration: 90 }),
      withDelay(450, withTiming(0, { duration: 220 })),
    );
    scale.value = 0;
    scale.value = withSequence(
      withSpring(1.1, { damping: 6, stiffness: 180 }),
      withSpring(1, { damping: 9, stiffness: 200 }),
    );
    // Brief rotation wiggle that settles.
    rot.value = 0;
    rot.value = withSequence(
      withTiming(-9, { duration: 90, easing: Easing.out(Easing.quad) }),
      withTiming(7, { duration: 110, easing: Easing.inOut(Easing.quad) }),
      withTiming(-3, { duration: 110, easing: Easing.inOut(Easing.quad) }),
      withTiming(0, { duration: 120, easing: Easing.out(Easing.quad) }),
    );
  }, [trigger, scale, rot, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { rotate: `${rot.value}deg` }],
  }));

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Animated.View style={[{ width: size, height: size }, style]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          {/* spark rays — short orange tick-marks around the bolt */}
          <Line x1="50" y1="4" x2="50" y2="14" stroke="#FF7A2D" strokeWidth="4" strokeLinecap="round" />
          <Line x1="92" y1="22" x2="84" y2="30" stroke="#FF7A2D" strokeWidth="4" strokeLinecap="round" />
          <Line x1="96" y1="60" x2="86" y2="60" stroke="#FF7A2D" strokeWidth="4" strokeLinecap="round" />
          <Line x1="14" y1="78" x2="22" y2="70" stroke="#FF7A2D" strokeWidth="4" strokeLinecap="round" />
          <Line x1="6" y1="38" x2="16" y2="40" stroke="#FF7A2D" strokeWidth="4" strokeLinecap="round" />
          <Line x1="78" y1="84" x2="72" y2="76" stroke="#FF7A2D" strokeWidth="4" strokeLinecap="round" />
          {/* chunky lightning-bolt: yellow fill, fat orange outline */}
          <Polygon
            points="54,10 26,56 46,56 38,92 76,42 54,42 64,10"
            fill="#F2B233"
            stroke="#FF7A2D"
            strokeWidth="6"
            strokeLinejoin="round"
          />
          {/* inner highlight for a cartoon shine */}
          <Polygon
            points="52,18 38,48 50,48 50,28"
            fill="#FFE89E"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
