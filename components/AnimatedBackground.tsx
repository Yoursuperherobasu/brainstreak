import React, { useEffect, useMemo } from 'react';
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

interface OrbSpec {
  color: string;
  size: number;
  top: string;
  left: string;
  driftX: number;
  driftY: number;
  durationMs: number;
  delayMs: number;
  opacity: number;
}

const DEFAULT_ORBS: OrbSpec[] = [
  { color: Colors.primary,      size: 340, top: '-14%', left: '-20%', driftX: 18, driftY: 14, durationMs: 13000, delayMs:    0, opacity: 0.22 },
  { color: Colors.accent,       size: 280, top: '10%',  left: '58%',  driftX: 22, driftY: 16, durationMs: 15000, delayMs: 1400, opacity: 0.20 },
  { color: Colors.catPop,       size: 220, top: '50%',  left: '-14%', driftX: 18, driftY: 22, durationMs: 16500, delayMs: 2800, opacity: 0.18 },
  { color: Colors.gold,         size: 200, top: '62%',  left: '56%',  driftX: 20, driftY: 16, durationMs: 14000, delayMs:  900, opacity: 0.22 },
];

function shade(hex: string, percent: number): string {
  // percent: -1..1, negative = darker, positive = lighter.
  // Accepts #RRGGBB; if other format, returns hex unchanged.
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const num = parseInt(m[1], 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  if (percent >= 0) {
    r = Math.round(r + (255 - r) * percent);
    g = Math.round(g + (255 - g) * percent);
    b = Math.round(b + (255 - b) * percent);
  } else {
    const p = 1 + percent;
    r = Math.round(r * p);
    g = Math.round(g * p);
    b = Math.round(b * p);
  }
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function tintedOrbs(tint: string): OrbSpec[] {
  const variants = [tint, shade(tint, 0.25), shade(tint, -0.15), shade(tint, 0.5)];
  return DEFAULT_ORBS.map((o, i) => ({ ...o, color: variants[i] }));
}

interface OrbProps extends OrbSpec { parallax?: number }
function Orb({ color, size, top, left, driftX, driftY, durationMs, delayMs, opacity, parallax = 1 }: OrbProps) {
  const t = useSharedValue(0);
  useEffect(() => {
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
    const s = 0.95 + 0.08 * Math.sin(phase + Math.PI / 3);
    return { transform: [{ translateX: dx }, { translateY: dy }, { scale: s }] };
  });
  const webBlur = Platform.OS === 'web' ? { filter: 'blur(64px)' } : null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.orb,
        { width: size, height: size, top: top as any, left: left as any, opacity },
        animatedStyle,
      ]}
    >
      <View style={[styles.disc, { backgroundColor: color, borderRadius: size / 2 }, webBlur as any]} />
    </Animated.View>
  );
}

interface Props {
  intensity?: 'subtle' | 'normal' | 'vivid';
  tint?: string;
}

export function AnimatedBackground({ intensity = 'normal', tint }: Props) {
  const parallax = intensity === 'vivid' ? 1.6 : intensity === 'subtle' ? 0.55 : 1;
  const dim = intensity === 'subtle' ? 0.6 : intensity === 'vivid' ? 1.2 : 1;
  const orbs = useMemo(() => (tint ? tintedOrbs(tint) : DEFAULT_ORBS), [tint]);
  return (
    <View pointerEvents="none" style={styles.root}>
      {orbs.map((o, i) => (
        <Orb key={i} {...o} opacity={o.opacity * dim} parallax={parallax} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  orb: { position: 'absolute' },
  disc: { width: '100%', height: '100%' },
});
