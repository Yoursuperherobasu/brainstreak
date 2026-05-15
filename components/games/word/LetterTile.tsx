import React, { useEffect } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { Radius, FontSize } from '@/constants/theme';

interface Props {
  letter: string;
  index: number;
  /** When this flips to a new truthy value, the tile plays the "slot/pop" animation. */
  popKey: number;
  /** Whether the round is still active. When paused/over the tile holds at rest. */
  active: boolean;
}

// Cartoon Scrabble-style letter tile for Word Sprint.
// - Entrance: spring in from above with a stagger driven by `index`.
// - Slot pop: scale 1 → 1.2 → 1 with a quick opacity dip (visual "click").
// Pure transform + opacity, all on the UI thread.
const PAPER_TILE = '#FFF8E6';
const PAPER_INK  = '#5A4A2A';
const PAPER_GOLD = '#D99921';

export function LetterTile({ letter, index, popKey, active }: Props) {
  const ty = useSharedValue(-24);
  const op = useSharedValue(0);
  const scale = useSharedValue(0.85);
  const slotOp = useSharedValue(1);

  // Entrance: spring in from above with a 40ms-per-tile stagger.
  useEffect(() => {
    const delay = index * 40;
    ty.value = withDelay(delay, withSpring(0, { damping: 14, stiffness: 180 }));
    op.value = withDelay(delay, withTiming(1, { duration: 220 }));
    scale.value = withDelay(delay, withSpring(1, { damping: 14, stiffness: 180 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Slot/pop on demand (when parent bumps popKey).
  useEffect(() => {
    if (popKey === 0 || !active) return;
    // Pop in a staggered cascade based on index for a "wave" feel.
    const delay = index * 35;
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(1.2, { duration: 110 }),
        withSpring(1, { damping: 12, stiffness: 220 }),
      ),
    );
    slotOp.value = withDelay(
      delay,
      withSequence(
        withTiming(0.3, { duration: 110 }),
        withTiming(1, { duration: 220 }),
      ),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popKey]);

  const aStyle = useAnimatedStyle(() => ({
    opacity: op.value * slotOp.value,
    transform: [{ translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.tile, aStyle]}>
      <View style={styles.inner}>
        <Text style={styles.text}>{letter.toUpperCase()}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 56,
    height: 64,
    borderRadius: Radius.md,
    backgroundColor: PAPER_TILE,
    borderWidth: 2,
    borderColor: PAPER_GOLD,
    shadowColor: '#5A4A2A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: FontSize.xxl, color: PAPER_INK, fontFamily: 'BagelFatOne_400Regular' },
});
