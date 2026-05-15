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
  durationMs?: number;
  formatter?: (n: number) => string;
  style?: TextStyle | TextStyle[];
}

export function CountingNumber({ value, durationMs = 600, formatter, style }: Props) {
  const t = useSharedValue(0);
  const [displayed, setDisplayed] = useState<number>(0);

  useEffect(() => {
    t.value = 0;
    t.value = withTiming(value, { duration: durationMs });
    return () => { cancelAnimation(t); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useAnimatedReaction(
    () => t.value,
    (current) => { runOnJS(setDisplayed)(Math.round(current)); },
  );

  return (
    <Text style={style as any}>
      {formatter ? formatter(displayed) : displayed.toLocaleString()}
    </Text>
  );
}
