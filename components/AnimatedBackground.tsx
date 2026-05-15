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
import { Colors } from '@/constants/theme';

// Soft drifting orbs that bloom behind content. Each orb is an absolutely
// positioned colored disc with low opacity, blurred via the CSS filter on
// web (a no-op on native — the soft color alone is enough on phones).
//
// All animations run via Reanimated worklets on the UI thread so there's
// no JS-thread work, no re-renders, and no SSR/hydration risk: the View
// renders identically on server and client; only transforms update after
// mount.

interface OrbSpec {
  color: string;
  size: number;       // px
  top: string;        // e.g. '10%'
  left: string;       // e.g. '20%'
  driftX: number;     // px peak-to-peak
  driftY: number;
  durationMs: number;
  delayMs: number;
  opacity: number;
}

const ORBS: OrbSpec[] = [
  { color: Colors.primary,    size: 280, top: '-12%', left: '-18%', driftX: 24, driftY: 18, durationMs: 9000,  delayMs:    0, opacity: 0.14 },
  { color: Colors.accent,     size: 220, top: '14%',  left: '60%',  driftX: 30, driftY: 22, durationMs: 11000, delayMs: 1200, opacity: 0.12 },
  { color: Colors.gold,       size: 180, top: '52%',  left: '-12%', driftX: 22, driftY: 28, durationMs: 12500, delayMs: 2400, opacity: 0.10 },
  { color: Colors.primaryLight, size: 160, top: '64%',  left: '58%',  driftX: 26, driftY: 20, durationMs: 10500, delayMs: 700,  opacity: 0.12 },
];

interface OrbProps extends OrbSpec {
  parallax?: number; // multiplier for drift amplitude
}

function Orb({ color, size, top, left, driftX, driftY, durationMs, delayMs, opacity, parallax = 1 }: OrbProps) {
  const t = useSharedValue(0);

  useEffect(() => {
    // Drive a 0→1 oscillation; mapped to sin in the animated style.
    t.value = withRepeat(
      withTiming(1, { duration: durationMs, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => { cancelAnimation(t); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const phase = t.value * Math.PI * 2;
    const dx = Math.sin(phase) * driftX * parallax;
    const dy = Math.cos(phase) * driftY * parallax;
    // Slight breathing scale tied to the same wave (90%..110%).
    const s = 0.95 + 0.08 * Math.sin(phase + Math.PI / 3);
    return { transform: [{ translateX: dx }, { translateY: dy }, { scale: s }] };
  });

  // Web: CSS blur filter on the inner color disc. Native ignores `filter`
  // gracefully (RN style typing doesn't have it, but RN-Web does). We hide
  // it on native — the soft color and large size already feel atmospheric.
  const webBlur = Platform.OS === 'web' ? { filter: 'blur(48px)' } : null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.orb,
        {
          width: size,
          height: size,
          top: top as any,
          left: left as any,
          opacity,
        },
        animatedStyle,
      ]}
    >
      <View style={[styles.disc, { backgroundColor: color, borderRadius: size / 2 }, webBlur as any]} />
    </Animated.View>
  );
}

interface Props {
  intensity?: 'subtle' | 'normal' | 'vivid';
}

export function AnimatedBackground({ intensity = 'normal' }: Props) {
  const parallax = intensity === 'vivid' ? 1.6 : intensity === 'subtle' ? 0.55 : 1;
  const dim = intensity === 'subtle' ? 0.6 : intensity === 'vivid' ? 1.2 : 1;
  return (
    <View pointerEvents="none" style={styles.root}>
      {ORBS.map((o, i) => (
        <Orb
          key={i}
          {...o}
          opacity={o.opacity * dim}
          parallax={parallax}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
  },
  disc: {
    width: '100%',
    height: '100%',
  },
});
