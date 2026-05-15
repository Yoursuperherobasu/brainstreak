import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/constants/theme';
import { GameFrame } from '@/components/games/GameFrame';
import { GameOverCard } from '@/components/games/GameOverCard';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import {
  createInitialState,
  cycleLane,
  moveLane,
  step,
  distanceMeters,
  xpForRun,
  LANES,
  CAR_WIDTH_PCT,
  OBSTACLE_WIDTH_PCT,
  type RoadState,
} from '@/lib/games/roadRush';
import { haptics } from '@/lib/haptics';
import { audio } from '@/lib/audio';
import { recordMiniGameResult } from '@/lib/games/recordMiniGame';

const ROUND_SECONDS = 60; // shown in the timer bar; the round usually ends earlier by crash
const FRAME_MS = 30; // ~33 FPS — smooth enough, cheap enough

export default function RoadRushScreen() {
  const [state, setState] = useState<RoadState>(() => createInitialState());
  // A new 'idle' phase shows a Tap-to-start overlay so the round doesn't start
  // running (and crashing) the instant the screen mounts. It also satisfies
  // Chrome's autoplay policy — bgStart() only runs after the first user tap.
  const [phase, setPhase] = useState<'idle' | 'playing' | 'over'>('idle');
  const [seconds, setSeconds] = useState(ROUND_SECONDS);
  const [fieldSize, setFieldSize] = useState({ w: 0, h: 0 });
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordedRef = useRef(false);
  const stripeOffset = useSharedValue(0);

  // Animate the lane stripes scrolling — pure visual.
  useEffect(() => {
    const id = setInterval(() => {
      stripeOffset.value = withTiming((stripeOffset.value + 24) % 48, { duration: FRAME_MS });
    }, FRAME_MS);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Background music while the round is live. Start on transition INTO
  // 'playing' (the first tap), stop on cleanup.
  useEffect(() => {
    if (phase !== 'playing') return;
    audio.bgStart();
    return () => audio.bgStop();
  }, [phase]);

  // Main game loop.
  useEffect(() => {
    if (phase !== 'playing') return;
    tickRef.current = setInterval(() => {
      setState((prev) => {
        const next = step(prev);
        if (!next.alive) {
          audio.crash();
          haptics.heavy();
        }
        return next;
      });
    }, FRAME_MS);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [phase]);

  // Round timer.
  useEffect(() => {
    if (phase !== 'playing') return;
    secRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) { clearInterval(secRef.current!); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => { if (secRef.current) clearInterval(secRef.current); };
  }, [phase]);

  // End condition: time runs out OR crash.
  useEffect(() => {
    if (!state.alive && phase === 'playing') {
      setPhase('over');
    }
  }, [state.alive, phase]);

  useEffect(() => {
    if (seconds === 0 && phase === 'playing') setPhase('over');
  }, [seconds, phase]);

  useEffect(() => {
    if (phase !== 'over' || recordedRef.current) return;
    recordedRef.current = true;
    const meters = distanceMeters(state.distance);
    const xp = xpForRun(state.distance);
    recordMiniGameResult({
      gameId: 'road-rush',
      score: meters,
      xp,
      total: state.obstacles.length,
    }).catch(() => {});
  }, [phase, state.distance, state.obstacles.length]);

  const tap = useCallback(() => {
    haptics.light();
    audio.tap();
    if (phase === 'idle') {
      setPhase('playing');
      return;
    }
    setState((s) => cycleLane(s));
  }, [phase]);

  const stripeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -stripeOffset.value }],
  }));

  const restart = () => {
    setState(createInitialState());
    // Start in idle so the player has a beat to focus before the loop fires.
    setPhase('idle');
    setSeconds(ROUND_SECONDS);
    recordedRef.current = false;
  };

  const score = distanceMeters(state.distance);
  const laneH = fieldSize.h / LANES;
  const carW = fieldSize.w * CAR_WIDTH_PCT;
  const obW = fieldSize.w * OBSTACLE_WIDTH_PCT;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AnimatedBackground intensity="subtle" tint={Colors.danger} />
      <GameFrame
        title="Road Rush"
        accent={Colors.danger}
        seconds={seconds}
        totalSeconds={ROUND_SECONDS}
        score={score}
        onExit={() => { audio.bgStop(); router.replace('/play'); }}
      />
      {phase !== 'over' ? (
        <Pressable onPress={tap} style={styles.body}>
          <View
            style={styles.field}
            onLayout={(e) => {
              setFieldSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
            }}
          >
            {/* lane separators (animated stripes) */}
            {fieldSize.h > 0 && Array.from({ length: LANES - 1 }).map((_, i) => (
              <View key={i} style={[styles.laneSep, { top: laneH * (i + 1) - 1 }]}>
                <Animated.View style={[styles.stripeRow, stripeStyle]}>
                  {Array.from({ length: 40 }).map((__, j) => (
                    <View key={j} style={styles.stripe} />
                  ))}
                </Animated.View>
              </View>
            ))}

            {/* obstacles */}
            {fieldSize.h > 0 && state.obstacles.map((o) => (
              <View
                key={o.id}
                style={[
                  styles.obstacle,
                  {
                    width: obW,
                    height: laneH * 0.62,
                    left: o.x * fieldSize.w - obW,
                    top: laneH * o.lane + (laneH * 0.19),
                  },
                ]}
              />
            ))}

            {/* car */}
            {fieldSize.h > 0 && (
              <View
                style={[
                  styles.car,
                  {
                    width: carW,
                    height: laneH * 0.7,
                    left: fieldSize.w - carW - 12,
                    top: laneH * state.carLane + (laneH * 0.15),
                  },
                ]}
              >
                <View style={styles.carRoof} />
              </View>
            )}

            {/* Tap-to-start overlay — sits ON TOP of the lane/car preview
                so the player sees what the round will look like before
                the loop starts running. */}
            {phase === 'idle' && (
              <View style={styles.idleOverlay} pointerEvents="none">
                <Text style={styles.idleTitle}>Ready?</Text>
                <Text style={styles.idleSub}>
                  {Platform.OS === 'web'
                    ? 'Click anywhere to start. Each click switches lanes.'
                    : 'Tap anywhere to start. Each tap switches lanes.'}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.hint}>
            {phase === 'idle'
              ? (Platform.OS === 'web' ? 'Click to start' : 'Tap to start')
              : (Platform.OS === 'web' ? 'Click anywhere to switch lane' : 'Tap to switch lane')}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.body}>
          <GameOverCard
            title={state.alive ? 'Time!' : 'Crash'}
            score={score}
            stats={[
              { label: 'Distance', value: `${score} m` },
              { label: 'Obstacles', value: state.obstacles.length.toString() },
              { label: 'XP', value: xpForRun(state.distance).toString() },
            ]}
            onPlayAgain={restart}
            onExit={() => { audio.bgStop(); router.replace('/play'); }}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  body: { flex: 1, padding: Spacing.md, gap: Spacing.md, alignItems: 'stretch' },
  field: {
    flex: 1,
    width: '100%',
    minHeight: 320,
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: '#2C2F3A', // asphalt
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: '#3F4655',
    overflow: 'hidden',
    position: 'relative',
    ...Shadow.lg,
  },
  laneSep: {
    position: 'absolute',
    left: 0, right: 0,
    height: 2,
    overflow: 'hidden',
  },
  stripeRow: {
    flexDirection: 'row',
    width: 48 * 40,
    height: 2,
    gap: 24,
  },
  stripe: {
    width: 24,
    height: 2,
    backgroundColor: '#F2C86B', // road dashes
  },
  car: {
    position: 'absolute',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carRoof: {
    width: '60%',
    height: '40%',
    backgroundColor: '#FFFFFF55',
    borderRadius: 4,
  },
  obstacle: {
    position: 'absolute',
    backgroundColor: Colors.danger,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF22',
  },
  hint: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: FontSize.sm,
  },
  idleOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23,32,51,0.55)',
    paddingHorizontal: Spacing.lg,
    gap: 6,
  },
  idleTitle: {
    fontSize: 48,
    color: '#FFFFFF',
    fontFamily: 'BagelFatOne_400Regular',
  },
  idleSub: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'PlusJakartaSans_600SemiBold',
    textAlign: 'center',
    maxWidth: 280,
  },
});
