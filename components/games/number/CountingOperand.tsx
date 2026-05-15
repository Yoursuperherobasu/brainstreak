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
  /** Bumped by parent when a fresh problem appears, so we re-count from 0. */
  resetKey: number;
  durationMs?: number;
  style?: TextStyle | TextStyle[];
}

// Counts up from 0 → `value` over `durationMs` whenever `resetKey` changes
// or `value` changes. Uses Reanimated's shared value driven by withTiming
// for a smooth UI-thread sweep; emits the rounded display value back to JS
// via runOnJS only when it ticks (cheap — Math.round comparison).
export function CountingOperand({ value, resetKey, durationMs = 200, style }: Props) {
  const t = useSharedValue(0);
  const [displayed, setDisplayed] = useState<number>(value);

  useEffect(() => {
    t.value = 0;
    setDisplayed(0);
    t.value = withTiming(value, { duration: durationMs });
    return () => cancelAnimation(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, resetKey]);

  useAnimatedReaction(
    () => t.value,
    (current) => { runOnJS(setDisplayed)(Math.round(current)); },
  );

  return <Text style={style as any}>{displayed}</Text>;
}
