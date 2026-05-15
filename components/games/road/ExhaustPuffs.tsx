// Exhaust puff trail — small grey-white circles that fade out and drift
// downward behind the player car. Cheap, additive, capped to ≤8 concurrent.
//
// We spawn from the parent screen via a ref-callback so this component owns
// the puff lifecycle. The parent only tells us the trail's anchor point and
// whether the game is active.

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

interface Puff {
  id: number;
  x: number; // px relative to parent field
  y: number;
}

const MAX_PUFFS = 8;
const PUFF_MS = 700;
const SIZE = 22; // px draw box for each puff

export interface ExhaustPuffsProps {
  // Anchor: where new puffs spawn (typically the rear bumper of the player car).
  anchor: { x: number; y: number } | null;
  // Game must be live for puffs to spawn.
  active: boolean;
}

export function ExhaustPuffs({ anchor, active }: ExhaustPuffsProps) {
  const [puffs, setPuffs] = useState<Puff[]>([]);
  const nextId = useRef(0);
  const spawnTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active || !anchor) {
      if (spawnTimer.current) clearInterval(spawnTimer.current);
      spawnTimer.current = null;
      return;
    }
    // Slight jitter on cadence so puffs don't pulse mechanically.
    const tick = () => {
      // Capture the latest anchor in closure each tick — we read via ref-like
      // pattern through a stable callback bound below.
      currentAnchor.current && setPuffs((prev) => {
        if (prev.length >= MAX_PUFFS) return prev;
        const a = currentAnchor.current!;
        const id = nextId.current++;
        const jitterY = (Math.random() - 0.5) * 6;
        return [...prev, { id, x: a.x, y: a.y + jitterY }];
      });
    };
    const interval = 120 + Math.random() * 80; // 120–200ms
    spawnTimer.current = setInterval(tick, interval);
    return () => {
      if (spawnTimer.current) clearInterval(spawnTimer.current);
      spawnTimer.current = null;
    };
  }, [active, anchor !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep anchor accessible to the timer without re-creating the interval each
  // time anchor changes (anchor changes every frame as the car bobs).
  const currentAnchor = useRef(anchor);
  useEffect(() => {
    currentAnchor.current = anchor;
  }, [anchor]);

  const remove = (id: number) => {
    setPuffs((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <>
      {puffs.map((p) => (
        <SinglePuff key={p.id} puff={p} onDone={() => remove(p.id)} />
      ))}
    </>
  );
}

function SinglePuff({ puff, onDone }: { puff: Puff; onDone: () => void }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withTiming(1, { duration: PUFF_MS, easing: Easing.out(Easing.quad) }, (done) => {
      'worklet';
      if (done) {
        // Hop back to JS to remove from the list.
        runOnJS(onDone)();
      }
    });
    return () => {
      t.value = 0;
    };
  }, [onDone, t]);

  const style = useAnimatedStyle(() => {
    const scale = 0.6 + t.value * 0.6; // 0.6 → 1.2
    const opacity = 0.6 * (1 - t.value); // 0.6 → 0
    const driftY = t.value * 14; // drifts down ~14px
    const driftX = t.value * 8; // and slightly right (behind the car)
    return {
      opacity,
      transform: [{ translateX: driftX }, { translateY: driftY }, { scale }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.puff,
        { left: puff.x - SIZE / 2, top: puff.y - SIZE / 2 },
        style,
      ]}
    >
      <Svg width={SIZE} height={SIZE} viewBox="0 0 20 20">
        {/* lumpy cartoon puff: three overlapping circles in warm grey */}
        <Circle cx="8" cy="11" r="5" fill="#C4B9A8" />
        <Circle cx="12" cy="9" r="4.5" fill="#D9D1C2" />
        <Circle cx="10" cy="13" r="3.5" fill="#EFE6D4" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  puff: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
  },
});
