import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Colors, FontSize, Radius, Shadow } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

// One drifting answer bubble. Each gets its own random drift seed so the
// four siblings don't move in sync.
interface BubbleProps {
  letter: 'A' | 'B' | 'C' | 'D';
  text: string;
  color: string;
  state: 'idle' | 'correct' | 'wrong' | 'fading';
  onPress: () => void;
  index: number;
  size: number;
}

function Bubble({ letter, text, color, state, onPress, index, size }: BubbleProps) {
  const driftX = useSharedValue(0);
  const driftY = useSharedValue(0);
  const scale = useSharedValue(1);
  const shake = useSharedValue(0);

  useEffect(() => {
    // Bobbing in a small ellipse. Different period per bubble.
    const xRange = 6 + (index % 2) * 4;
    const yRange = 8 + (index % 3) * 3;
    const xDur = 1600 + index * 200;
    const yDur = 1900 + index * 150;
    driftX.value = withRepeat(
      withSequence(
        withTiming(xRange, { duration: xDur, easing: Easing.inOut(Easing.sin) }),
        withTiming(-xRange, { duration: xDur, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    driftY.value = withDelay(
      index * 120,
      withRepeat(
        withSequence(
          withTiming(yRange, { duration: yDur, easing: Easing.inOut(Easing.sin) }),
          withTiming(-yRange, { duration: yDur, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
  }, [index]);

  useEffect(() => {
    if (state === 'correct') {
      scale.value = withSequence(
        withSpring(1.18, { damping: 7, stiffness: 220 }),
        withTiming(0, { duration: 240, easing: Easing.in(Easing.cubic) })
      );
    } else if (state === 'wrong') {
      shake.value = withSequence(
        withTiming(-12, { duration: 60 }),
        withTiming(12, { duration: 60 }),
        withTiming(-8, { duration: 60 }),
        withTiming(0, { duration: 60 })
      );
    } else if (state === 'fading') {
      scale.value = withTiming(0, { duration: 240, easing: Easing.in(Easing.cubic) });
    } else if (state === 'idle') {
      scale.value = withSpring(1, { damping: 10, stiffness: 220 });
    }
  }, [state]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: driftX.value + shake.value },
      { translateY: driftY.value },
      { scale: scale.value },
    ],
  }));

  const isHit = state === 'correct';
  const isMiss = state === 'wrong';

  return (
    <Animated.View
      style={[
        styles.bubble,
        { width: size, height: size, backgroundColor: color },
        Shadow.md,
        animStyle,
      ]}
    >
      <Pressable
        onPress={() => {
          if (state !== 'idle') return;
          haptics.light();
          onPress();
        }}
        style={styles.pressArea}
        android_ripple={{ color: 'rgba(255,255,255,0.25)', borderless: true }}
      >
        <Text style={styles.letter}>{letter}</Text>
        <Text style={styles.text} numberOfLines={3}>
          {text}
        </Text>
        {isHit && <Text style={styles.badge}>✓</Text>}
        {isMiss && <Text style={styles.badge}>✕</Text>}
      </Pressable>
    </Animated.View>
  );
}

// ─── Field of 4 bubbles ──────────────────────────────────────────────────────

interface BubbleFieldProps {
  answers: string[];          // 4 answer strings
  correctAnswer: string;
  /** State per bubble. Driven by parent so we can replay identical layout. */
  states: Array<'idle' | 'correct' | 'wrong' | 'fading'>;
  onPick: (answerIndex: number) => void;
  /** Per-bubble color, length 4. */
  colors: string[];
}

export function BubbleField({ answers, states, onPick, colors }: BubbleFieldProps) {
  const screen = useMemo(() => Dimensions.get('window'), []);
  const size = Math.min(160, (screen.width - 64) / 2);

  return (
    <View style={styles.grid}>
      {answers.map((ans, i) => (
        <Bubble
          key={`${i}_${ans}`}
          letter={(['A', 'B', 'C', 'D'] as const)[i]}
          text={ans}
          color={colors[i]}
          state={states[i] ?? 'idle'}
          onPress={() => onPick(i)}
          index={i}
          size={size}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 16,
  },
  bubble: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  pressArea: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 4,
  },
  letter: {
    fontFamily: 'Outfit_900Black',
    fontSize: 22,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.5,
  },
  text: {
    fontFamily: 'Outfit_700Bold',
    fontSize: FontSize.md,
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  badge: {
    fontFamily: 'Outfit_900Black',
    fontSize: 28,
    color: '#FFFFFF',
    marginTop: 2,
  },
});
