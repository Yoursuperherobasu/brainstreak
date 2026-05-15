import React, { useEffect, useState } from 'react';
import { Text, TextStyle } from 'react-native';
import {
  useSharedValue,
  withTiming,
  runOnJS,
  cancelAnimation,
  useAnimatedReaction,
} from 'react-native-reanimated';

interface Props {
  value: number;
  /** Bumped by parent when a fresh problem appears, so we re-count up. */
  resetKey: number;
  durationMs?: number;
  /**
   * Optional explicit start value for the count-up. When omitted, the
   * component starts near `value` (target - 5 for small numbers, 0.7×target
   * for larger) so the count reads as a finishing flourish rather than a
   * from-scratch "0 + 0 = ?" ticker that QA flagged as looking broken.
   * Pass `0` explicitly to restore the legacy from-zero behavior.
   */
  from?: number;
  style?: TextStyle | TextStyle[];
}

function defaultStart(target: number): number {
  if (!Number.isFinite(target)) return 0;
  if (target <= 20) return Math.max(0, Math.round(target - 5));
  return Math.max(0, Math.round(target * 0.7));
}

// Counts up from a value near `value` → `value` over `durationMs` whenever
// `resetKey` changes or `value` changes. Uses Reanimated's shared value
// driven by withTiming for a smooth UI-thread sweep; emits the rounded
// display value back to JS via runOnJS only when it ticks (cheap —
// Math.round comparison).
export function CountingOperand({ value, resetKey, durationMs = 150, from, style }: Props) {
  const t = useSharedValue(0);
  // Pre-compute the start value so we never paint "0" for a target > 0.
  const start = from !== undefined ? from : defaultStart(value);
  const [displayed, setDisplayed] = useState<number>(start);

  useEffect(() => {
    const s = from !== undefined ? from : defaultStart(value);
    t.value = s;
    setDisplayed(s);
    t.value = withTiming(value, { duration: durationMs });
    return () => cancelAnimation(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, resetKey, from]);

  useAnimatedReaction(
    () => t.value,
    (current) => { runOnJS(setDisplayed)(Math.round(current)); },
  );

  return <Text style={style as any}>{displayed}</Text>;
}
