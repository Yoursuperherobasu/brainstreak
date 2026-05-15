import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { FadeIn } from 'react-native-reanimated';
import { MotionView } from '@/components/MotionView';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import { generateProblem, scoreAttempt, type Problem } from '@/lib/games/numberSense';
import { GameFrame } from '@/components/games/GameFrame';
import { GameOverCard } from '@/components/games/GameOverCard';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { GraphPaperBackground } from '@/components/games/GraphPaperBackground';
import { haptics } from '@/lib/haptics';
import { recordMiniGameResult } from '@/lib/games/recordMiniGame';
import { usePausableInterval } from '@/lib/usePausableInterval';
import { audio } from '@/lib/audio';

const ROUND_SECONDS = 30;

export default function NumberSenseScreen() {
  // Defer first problem generation to post-mount so SSR and first client
  // render agree (Math.random in lazy useState init would mismatch the
  // server-rendered HTML and trigger React #418 hydration warnings).
  const [problem, setProblem] = useState<Problem | null>(null);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [seconds, setSeconds] = useState(ROUND_SECONDS);
  const [phase, setPhase] = useState<'playing' | 'over'>('playing');
  const [leveledUp, setLeveledUp] = useState(false);
  const [newBest, setNewBest] = useState(false);
  const [prevBest, setPrevBest] = useState(0);
  const recordedRef = useRef(false);

  useEffect(() => {
    setProblem(generateProblem(1));
  }, []);

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

  useEffect(() => {
    if (phase !== 'over' || recordedRef.current) return;
    recordedRef.current = true;
    const xp = Math.floor(score / 2);
    // Number Sense doesn't track wrong-pick count separately, so reporting
    // total == correct would auto-unlock the "Flawless" perfect-round
    // achievement every round. Omit both fields.
    recordMiniGameResult({
      gameId: 'number-sense',
      score,
      xp,
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
  }, [phase, score]);

  const pick = (v: number) => {
    if (!problem) return;
    const r = scoreAttempt(problem, v);
    setScore((s) => Math.max(0, s + r.points));
    if (r.ok) { setCorrectCount((c) => c + 1); haptics.success(); } else haptics.error();
    setProblem(generateProblem(1 + Math.floor(correctCount / 5)));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Number Sense visual identity: graph-paper notebook underlay so it
          reads like a math worksheet, not a generic blue card. */}
      <GraphPaperBackground />
      <AnimatedBackground intensity="subtle" tint={Colors.primary} />
      <GameFrame title="Number Sense" accent={Colors.primary} seconds={seconds} totalSeconds={ROUND_SECONDS} score={score} onExit={() => router.replace('/play')} />
      {phase === 'playing' ? (
        <MotionView entering={FadeIn} style={styles.body}>
          {problem ? (
            <>
              <Text style={styles.q}>{problem.a} {problem.op} {problem.b} = ?</Text>
              <View style={styles.choices}>
                {problem.choices.map((c) => (
                  <Pressable key={c} onPress={() => pick(c)} style={styles.choice}>
                    <Text style={styles.choiceText}>{c}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.loading}>Loading…</Text>
          )}
        </MotionView>
      ) : (
        <View style={styles.body}>
          <GameOverCard
            title="Time!"
            score={score}
            stats={[
              { label: 'Correct', value: correctCount.toString() },
              { label: 'XP', value: Math.floor(score / 2).toString() },
            ]}
            onPlayAgain={() => router.replace('/game/number-sense')}
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
  body: { flex: 1, padding: Spacing.lg, gap: Spacing.lg, justifyContent: 'center' },
  q: {
    textAlign: 'center',
    fontSize: 64,
    color: Colors.primaryDark,
    fontFamily: 'BagelFatOne_400Regular',
    // Soft ink-on-paper feel.
    textShadowColor: '#FFFFFFAA',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  choices: { flexDirection: 'row', gap: Spacing.md, justifyContent: 'center' },
  choice: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: Colors.primary,
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderRadius: Radius.lg,
    minWidth: 84,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 2,
  },
  choiceText: { fontSize: FontSize.xxl, color: Colors.primary, fontFamily: 'BricolageGrotesque_800ExtraBold' },
  loading: { textAlign: 'center', fontSize: FontSize.md, color: Colors.textMuted, fontFamily: 'PlusJakartaSans_600SemiBold' },
});
