import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { FadeIn } from 'react-native-reanimated';
import { MotionView } from '@/components/MotionView';
import { Colors, Spacing, FontSize } from '@/constants/theme';
import { generateProblem, scoreAttempt, type Problem } from '@/lib/games/numberSense';
import { GameFrame } from '@/components/games/GameFrame';
import { GameOverCard } from '@/components/games/GameOverCard';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { CountingOperand } from '@/components/games/number/CountingOperand';
import { ChoiceButton, type ChoiceFlash } from '@/components/games/number/ChoiceButton';
import { FloatingXP } from '@/components/games/number/FloatingXP';
import { haptics } from '@/lib/haptics';
import { recordMiniGameResult } from '@/lib/games/recordMiniGame';
import { usePausableInterval } from '@/lib/usePausableInterval';
import { audio } from '@/lib/audio';
import { useGameBackHandler } from '@/lib/useGameBackHandler';

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
  // Cartoon flourishes: which choice (by index) is flashing, and the kind
  // of flash (correct/wrong). `flashKey` bumps each pick so the same index
  // can be flashed twice in a row (e.g., pick wrong then pick wrong again).
  const [flashIdx, setFlashIdx] = useState<number | null>(null);
  const [flashKind, setFlashKind] = useState<ChoiceFlash>(null);
  const [flashKey, setFlashKey] = useState(0);
  const [xpBurst, setXpBurst] = useState(0);
  // Bumped on new problem to reset CountingOperand from 0 and clear halos.
  const [problemKey, setProblemKey] = useState(0);

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

  useGameBackHandler({ enabled: phase === 'playing', onExit: () => router.replace('/play') });

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

  const pick = (v: number, idx: number) => {
    if (!problem || phase !== 'playing') return;
    const r = scoreAttempt(problem, v);
    setScore((s) => Math.max(0, s + r.points));
    setFlashIdx(idx);
    setFlashKind(r.ok ? 'correct' : 'wrong');
    setFlashKey((k) => k + 1);
    if (r.ok) {
      setCorrectCount((c) => c + 1);
      haptics.success();
      setXpBurst((k) => k + 1);
      // Advance after the halo finishes (350ms) so the player sees the win.
      setTimeout(() => {
        setProblem(generateProblem(1 + Math.floor((correctCount + 1) / 5)));
        setProblemKey((k) => k + 1);
        setFlashIdx(null);
        setFlashKind(null);
      }, 380);
    } else {
      haptics.error();
      // Wrong-answer shake runs ~420ms; advance just after so the shake
      // finishes on the original wrong choice.
      setTimeout(() => {
        setProblem(generateProblem(1 + Math.floor(correctCount / 5)));
        setProblemKey((k) => k + 1);
        setFlashIdx(null);
        setFlashKind(null);
      }, 450);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Sunwashed-palette background: warm cream paper with the same subtle
          orb field every other on-theme game uses. The earlier graph-paper
          underlay tinted the screen lavender, which clashed with the rest of
          the app. */}
      <AnimatedBackground intensity="subtle" tint={Colors.primary} />
      <GameFrame title="Number Sense" accent={Colors.primary} seconds={seconds} totalSeconds={ROUND_SECONDS} score={score} onExit={() => router.replace('/play')} />
      {phase === 'playing' ? (
        <MotionView entering={FadeIn} style={styles.body}>
          {problem ? (
            <>
              <Text style={styles.q}>
                <CountingOperand value={problem.a} resetKey={problemKey} />
                {` ${problem.op} `}
                <CountingOperand value={problem.b} resetKey={problemKey} />
                {' = ?'}
              </Text>
              <View style={styles.choicesWrap}>
                <FloatingXP burstKey={xpBurst} amount={10} />
                <View style={styles.choices}>
                  {problem.choices.map((c, i) => (
                    <ChoiceButton
                      key={`${problemKey}-${i}-${c}`}
                      value={c}
                      onPress={() => pick(c, i)}
                      flash={flashIdx === i ? flashKind : null}
                      resetKey={flashKey}
                    />
                  ))}
                </View>
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
  // `choicesWrap` provides a relative anchor so the FloatingXP can absolute-
  // position itself centred above the row.
  choicesWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  choices: { flexDirection: 'row', gap: Spacing.md, justifyContent: 'center' },
  loading: { textAlign: 'center', fontSize: FontSize.md, color: Colors.textMuted, fontFamily: 'PlusJakartaSans_600SemiBold' },
});
