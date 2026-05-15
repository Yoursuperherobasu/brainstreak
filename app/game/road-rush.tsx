import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/constants/theme';
import { GameFrame } from '@/components/games/GameFrame';
import { GameOverCard } from '@/components/games/GameOverCard';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { PlayerCar, Obstacle as ObstacleSvg, obstacleKindFor } from '@/components/games/road/RoadVehicles';
import { ExhaustPuffs } from '@/components/games/road/ExhaustPuffs';
import { CrashFlash } from '@/components/games/road/CrashFlash';
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
import { usePausableInterval } from '@/lib/usePausableInterval';
import { useGameBackHandler } from '@/lib/useGameBackHandler';

const ROUND_SECONDS = 60; // shown in the timer bar; the round usually ends earlier by crash
const FRAME_MS = 30; // ~33 FPS — smooth enough, cheap enough

export default function RoadRushScreen() {
  const [state, setState] = useState<RoadState>(() => createInitialState());
  // A new 'idle' phase shows a Tap-to-start overlay so the round doesn't start
  // running (and crashing) the instant the screen mounts. It also satisfies
  // Chrome's autoplay policy — bgStart() only runs after the first user tap.
  const [phase, setPhase] = useState<'idle' | 'playing' | 'over'>('idle');
  const [leveledUp, setLeveledUp] = useState(false);
  const [newBest, setNewBest] = useState(false);
  const [prevBest, setPrevBest] = useState(0);
  const [seconds, setSeconds] = useState(ROUND_SECONDS);
  const [fieldSize, setFieldSize] = useState({ w: 0, h: 0 });
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordedRef = useRef(false);
  const stripeOffset = useSharedValue(0);
  // Car bob — gentle vertical sine, ±2px on a 600ms cycle. Drives the
  // player and (cheap copy) all enemy cars too.
  const carBob = useSharedValue(0);
  // Each collision bumps this counter, which retriggers <CrashFlash />.
  const [crashTrigger, setCrashTrigger] = useState(0);

  // Animate the lane stripes scrolling — pure visual.
  useEffect(() => {
    const id = setInterval(() => {
      stripeOffset.value = withTiming((stripeOffset.value + 24) % 48, { duration: FRAME_MS });
    }, FRAME_MS);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Car bob — runs only while playing. ±2px / 600ms cycle, smoothed with a
  // sin-feel easing. Paused on game over / idle so the car looks "engine off".
  useEffect(() => {
    if (phase === 'playing') {
      carBob.value = 0;
      carBob.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 300, easing: Easing.inOut(Easing.sin) }),
          withTiming(-1, { duration: 300, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(carBob);
      carBob.value = withTiming(0, { duration: 120 });
    }
    return () => cancelAnimation(carBob);
  }, [phase, carBob]);

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
  usePausableInterval({
    durationMs: ROUND_SECONDS * 1000,
    tickMs: 1000,
    enabled: phase === 'playing',
    onTick: (remainingMs) => setSeconds(Math.ceil(remainingMs / 1000)),
    onComplete: () => {
      setPhase('over');
      setSeconds(0);
    },
  });

  useGameBackHandler({
    enabled: phase === 'playing',
    onExit: () => { audio.bgStop(); router.replace('/play'); },
  });

  // End condition: crash.
  useEffect(() => {
    if (!state.alive && phase === 'playing') {
      setPhase('over');
      // One crash flash per collision — bump the trigger so <CrashFlash />
      // animates exactly once.
      setCrashTrigger((c) => c + 1);
    }
  }, [state.alive, phase]);

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
    }).then((res) => {
      if (res.leveledUp) {
        setLeveledUp(true);
        audio.levelup();
      }
      if (res.wasNewBest) {
        setNewBest(true);
        setPrevBest(res.previousBest);
      }
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
  // ±2px bob driven by carBob (-1..1).
  const carBobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: carBob.value * 2 }],
  }));
  // Enemies bob at half amplitude with an inverted phase so the road feels
  // alive without becoming visually noisy.
  const enemyBobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -carBob.value * 1 }],
  }));

  const restart = () => {
    setState(createInitialState());
    // Start in idle so the player has a beat to focus before the loop fires.
    setPhase('idle');
    setSeconds(ROUND_SECONDS);
    setLeveledUp(false);
    setNewBest(false);
    setPrevBest(0);
    recordedRef.current = false;
    // Reset crash flash so a future crash retriggers it cleanly.
    setCrashTrigger(0);
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

            {/* obstacles: cone / enemy car / barrier, picked stably per id.
                Enemy cars get a tiny inverted bob so traffic feels alive;
                cones/barriers stay stock-still (they're static props on the
                road). */}
            {fieldSize.h > 0 && state.obstacles.map((o) => {
              const obH = laneH * 0.78;
              const isEnemy = obstacleKindFor(o.id) === 'enemy';
              const boxStyle = [
                styles.obstacleBox,
                {
                  width: obW,
                  height: obH,
                  left: o.x * fieldSize.w - obW,
                  top: laneH * o.lane + (laneH - obH) / 2,
                },
              ];
              if (isEnemy) {
                return (
                  <Animated.View key={o.id} style={[boxStyle, enemyBobStyle]}>
                    <ObstacleSvg id={o.id} width={obW} height={obH} />
                  </Animated.View>
                );
              }
              return (
                <View key={o.id} style={boxStyle}>
                  <ObstacleSvg id={o.id} width={obW} height={obH} />
                </View>
              );
            })}

            {/* player car: top-down SVG (body, cabin, windshield, wheels,
                headlights). Wheels spin and the whole box gently bobs while
                playing. Exhaust puffs spawn from the rear bumper (right side,
                since the car faces left). */}
            {fieldSize.h > 0 && (() => {
              const playerH = laneH * 0.82;
              // RIGHT_INSET keeps the player off the field's right border. The
              // PlayerCar SVG renders wheels that extend to the full width of
              // its box (right wheel at x = width - wheelW), so without enough
              // breathing room the wheel + 1.5px body stroke visibly clips
              // the 2px playfield border. 16px gives a clear visual gap.
              const RIGHT_INSET = 16;
              const carLeft = fieldSize.w - carW - RIGHT_INSET;
              const carTop = laneH * state.carLane + (laneH - playerH) / 2;
              // Rear bumper anchor for puffs — just behind the car, still
              // inside the field.
              const puffX = carLeft + carW + 2;
              const puffY = carTop + playerH / 2;
              return (
                <>
                  <Animated.View
                    style={[
                      styles.carBox,
                      {
                        width: carW,
                        height: playerH,
                        left: carLeft,
                        top: carTop,
                      },
                      carBobStyle,
                    ]}
                  >
                    <PlayerCar width={carW} height={playerH} spinning={phase === 'playing'} />
                  </Animated.View>
                  <ExhaustPuffs
                    anchor={{ x: puffX, y: puffY }}
                    active={phase === 'playing'}
                  />
                </>
              );
            })()}

            {/* Crash flash sits above everything inside the field. Mounted
                always so its trigger-counter prop drives a single animation
                cycle per collision. */}
            <CrashFlash trigger={crashTrigger} />

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
            newBest={newBest}
            delta={score - prevBest}
            leveledUp={leveledUp}
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
  carBox: {
    position: 'absolute',
  },
  obstacleBox: {
    position: 'absolute',
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
