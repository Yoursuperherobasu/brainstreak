import React, { useEffect, useState, useRef } from 'react';
import { TextStyle, View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface Props {
  value: number;
  style?: TextStyle | TextStyle[];
  durationMs?: number;
}

// Number that rolls/flips on change. Renders two stacked Text elements; on
// value change, the outgoing element slides up + fades out while the
// incoming element slides up from below into the slot.
export function RollingNumber({ value, style, durationMs = 300 }: Props) {
  const [prev, setPrev] = useState(value);
  const [next, setNext] = useState(value);
  const [animKey, setAnimKey] = useState(0);
  const y = useSharedValue(0);
  const opacity = useSharedValue(1);
  const incomingY = useSharedValue(0);
  const incomingOpacity = useSharedValue(0);
  const valueRef = useRef(value);

  useEffect(() => {
    if (value === valueRef.current) return;
    const direction = value > valueRef.current ? 1 : -1;
    setPrev(valueRef.current);
    setNext(value);
    valueRef.current = value;
    y.value = 0;
    opacity.value = 1;
    incomingY.value = direction * 16;
    incomingOpacity.value = 0;
    setAnimKey((k) => k + 1);
    y.value = withTiming(-direction * 16, { duration: durationMs, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(0, { duration: durationMs });
    incomingY.value = withTiming(0, { duration: durationMs, easing: Easing.out(Easing.cubic) });
    incomingOpacity.value = withTiming(1, { duration: durationMs });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const outgoingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
    opacity: opacity.value,
  }));
  const incomingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: incomingY.value }],
    opacity: incomingOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.Text key={`out-${animKey}`} style={[style as any, styles.layer, outgoingStyle]}>
        {prev}
      </Animated.Text>
      <Animated.Text key={`in-${animKey}`} style={[style as any, incomingStyle]}>
        {next}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative' },
  layer: { position: 'absolute', left: 0, right: 0 },
});
