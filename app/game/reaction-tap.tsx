import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, type GestureResponderEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/constants/theme';
import { GameFrame } from '@/components/games/GameFrame';
import { GameOverCard } from '@/components/games/GameOverCard';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { spawnTarget, windowMs, type Target } from '@/lib/games/reactionTap';
import { haptics } from '@/lib/haptics';
import { recordMiniGameResult } from '@/lib/games/recordMiniGame';
import { usePausableInterval } from '@/lib/usePausableInterval';
import { audio } from '@/lib/audio';
import { useGameBackHandler } from '@/lib/useGameBackHandler';
import { ZapBurst } from '@/components/games/reaction/ZapBurst';
import { TapShockwave } from '@/components/games/reaction/TapShockwave';
import { XStamp } from '@/components/games/reaction/XStamp';

const ROUND_SECONDS = 20;
const DOT_SIZE = 72;

export default function ReactionTapScreen() {
  const [target, setTarget] = useState<Target>(spawnTarget());
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [seconds, setSeconds] = useState(ROUND_SECONDS);
  const [phase, setPhase] = useState<'playing' | 'over'>('playing');
  const [leveledUp, setLeveledUp] = useState(false);
  const [newBest, setNewBest] = useState(false);
  const [prevBest, setPrevBest] = useState(0);
  // We measure the play area via onLayout so we don't depend on
  // useWindowDimensions, which returns 0 during SSR / first paint and
  // collapsed the field on web.
  const [fieldSize, setFieldSize] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordedRef = useRef(false);
  const dotScale = useSharedValue(1);
  const dotStyle = useAnimatedStyle(() => ({ transform: [{ scale: dotScale.value }] }));
  // Flourishes: each is driven by a counter that bumps to retrigger the
  // animation, plus an optional position for the local-coord ones.
  const [zapTrigger, setZapTrigger] = useState(0);
  const [shockTrigger, setShockTrigger] = useState(0);
  const [shockCenter, setShockCenter] = useState<{ x: number; y: number } | null>(null);
  const [xTrigger, setXTrigger] = useState(0);
  const [xCenter, setXCenter] = useState<{ x: number; y: number } | null>(null);

  const respawn = (currentScore: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setTarget(spawnTarget());
    dotScale.value = withSequence(withTiming(0.85, { duration: 80 }), withTiming(1, { duration: 220 }));
    // GO cue — chunky lightning-bolt zap pops in over the field.
    setZapTrigger((z) => z + 1);
    timeoutRef.current = setTimeout(() => {
      setMisses((m) => m + 1);
      respawn(currentScore);
    }, windowMs(currentScore));
  };

  useEffect(() => {
    respawn(0);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  usePausableInterval({
    durationMs: ROUND_SECONDS * 1000,
    tickMs: 1000,
    enabled: phase === 'playing',
    onTick: (remainingMs) => setSeconds(Math.ceil(remainingMs / 1000)),
    onComplete: () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setPhase('over');
      setSeconds(0);
    },
  });

  useGameBackHandler({ enabled: phase === 'playing', onExit: () => router.replace('/play') });

  useEffect(() => {
    if (phase !== 'over' || recordedRef.current) return;
    recordedRef.current = true;
    const xp = score * 2;
    recordMiniGameResult({
      gameId: 'reaction-tap',
      score,
      xp,
      total: score + misses,
      correct: score,
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
  }, [phase, score, misses]);

  const dotMax = Math.max(0, fieldSize - DOT_SIZE);

  const tap = () => {
    setScore((s) => s + 1);
    haptics.success();
    // Shockwave from current dot center (in field-local coords).
    const cx = target.x * dotMax + DOT_SIZE / 2;
    const cy = target.y * dotMax + DOT_SIZE / 2;
    setShockCenter({ x: cx, y: cy });
    setShockTrigger((t) => t + 1);
    respawn(score + 1);
  };

  // Field-level tap handler: if the tap didn't hit the dot, stamp a red X
  // at the tap location to scold the player. Only the empty-space taps fall
  // through here — the dot's own Pressable swallows successful taps.
  const onFieldMiss = (e: GestureResponderEvent) => {
    if (phase !== 'playing') return;
    const { locationX, locationY } = e.nativeEvent;
    setXCenter({ x: locationX, y: locationY });
    setXTrigger((t) => t + 1);
    haptics.light();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AnimatedBackground intensity="subtle" tint="#21D07A" />
      <GameFrame
        title="Reaction Tap"
        accent="#21D07A"
        seconds={seconds}
        totalSeconds={ROUND_SECONDS}
        score={score}
        onExit={() => router.replace('/play')}
      />
      {phase === 'playing' ? (
        <View style={styles.body}>
          <Pressable
            style={styles.field}
            onPress={onFieldMiss}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              setFieldSize(Math.min(width, height));
            }}
          >
            {fieldSize > 0 && (
              <>
                <Animated.View
                  style={[
                    styles.dotWrap,
                    dotStyle,
                    { left: target.x * dotMax, top: target.y * dotMax },
                  ]}
                >
                  <Pressable onPress={tap} style={styles.dot} hitSlop={12} />
                </Animated.View>
                {/* GO! lightning-bolt zap — pops at field center on each
                    target spawn. Pointer-events:none so it doesn't block
                    taps. */}
                <ZapBurst trigger={zapTrigger} />
                {/* Shockwave rings burst from the dot center on success. */}
                <TapShockwave center={shockCenter} trigger={shockTrigger} />
                {/* Red X stamp on empty-space (premature / mis-aimed) taps. */}
                <XStamp center={xCenter} trigger={xTrigger} />
              </>
            )}
          </Pressable>
          <View style={styles.statsRow}>
            <Text style={styles.statLabel}>Hits</Text>
            <Text style={styles.statValue}>{score}</Text>
            <Text style={styles.divider}>·</Text>
            <Text style={styles.statLabel}>Misses</Text>
            <Text style={[styles.statValue, misses > 0 && { color: Colors.danger }]}>{misses}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.body}>
          <GameOverCard
            title="Time!"
            score={score}
            stats={[
              { label: 'Hits', value: score.toString() },
              { label: 'Misses', value: misses.toString() },
              { label: 'XP', value: (score * 2).toString() },
            ]}
            onPlayAgain={() => router.replace('/game/reaction-tap')}
            onExit={() => router.replace('/play')}
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
  body: { flex: 1, padding: Spacing.md, gap: Spacing.md, alignItems: 'center' },
  // Field is a 1:1 square that takes the full available width. We use
  // aspectRatio (not useWindowDimensions) so it renders correctly under
  // SSR where window dimensions are 0.
  // Reaction Tap visual identity: neon green dot on a dark "lab" field.
  // Reads completely differently from every other game and signals
  // "twitch reflex" the moment you land on it.
  field: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 480,
    backgroundColor: '#0E1722',
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: '#1A2A40',
    position: 'relative',
    overflow: 'hidden',
    ...Shadow.lg,
  },
  dotWrap: {
    position: 'absolute',
    width: DOT_SIZE,
    height: DOT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: '#21D07A',
    borderWidth: 4,
    borderColor: '#9BF2C7',
    // Neon glow on web via boxShadow; on native the shadow approximates it.
    shadowColor: '#21D07A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 18,
    elevation: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  statLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  statValue: {
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    fontFamily: 'BricolageGrotesque_700Bold',
    minWidth: 24,
    textAlign: 'center',
  },
  divider: {
    fontSize: FontSize.lg,
    color: Colors.textMuted,
  },
});
