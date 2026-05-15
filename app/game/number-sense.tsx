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
import { haptics } from '@/lib/haptics';
import { recordMiniGameResult } from '@/lib/games/recordMiniGame';

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
  const intRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordedRef = useRef(false);

  useEffect(() => {
    setProblem(generateProblem(1));
    intRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) { clearInterval(intRef.current!); setPhase('over'); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => { if (intRef.current) clearInterval(intRef.current); };
  }, []);

  useEffect(() => {
    if (phase !== 'over' || recordedRef.current) return;
    recordedRef.current = true;
    const xp = Math.floor(score / 2);
    recordMiniGameResult({
      gameId: 'number-sense',
      score,
      xp,
      correct: correctCount,
      total: correctCount,
    }).catch(() => {});
  }, [phase, score, correctCount]);

  const pick = (v: number) => {
    if (!problem) return;
    const r = scoreAttempt(problem, v);
    setScore((s) => Math.max(0, s + r.points));
    if (r.ok) { setCorrectCount((c) => c + 1); haptics.success(); } else haptics.error();
    setProblem(generateProblem(1 + Math.floor(correctCount / 5)));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  body: { flex: 1, padding: Spacing.lg, gap: Spacing.lg, justifyContent: 'center' },
  q: { textAlign: 'center', fontSize: 56, color: Colors.textPrimary, fontFamily: 'BagelFatOne_400Regular' },
  choices: { flexDirection: 'row', gap: Spacing.md, justifyContent: 'center' },
  choice: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, paddingVertical: 18, paddingHorizontal: 28, borderRadius: Radius.lg, minWidth: 84, alignItems: 'center' },
  choiceText: { fontSize: FontSize.xxl, color: Colors.primary, fontFamily: 'BricolageGrotesque_800ExtraBold' },
  loading: { textAlign: 'center', fontSize: FontSize.md, color: Colors.textMuted, fontFamily: 'PlusJakartaSans_600SemiBold' },
});
