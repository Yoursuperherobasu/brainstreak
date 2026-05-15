import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { FadeIn } from 'react-native-reanimated';
import { MotionView } from '@/components/MotionView';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import { generateAnagramRound, scoreAnagramAttempt, type AnagramRound } from '@/lib/games/wordSprint';
import { Button } from '@/components/Button';
import { GameFrame } from '@/components/games/GameFrame';
import { GameOverCard } from '@/components/games/GameOverCard';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { haptics } from '@/lib/haptics';
import { recordMiniGameResult } from '@/lib/games/recordMiniGame';

const ROUND_SECONDS = 60;

export default function WordSprintScreen() {
  const [round, setRound] = useState<AnagramRound | null>(null);
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [used, setUsed] = useState<Set<string>>(new Set());
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [phase, setPhase] = useState<'playing' | 'over'>('playing');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordedRef = useRef(false);

  useEffect(() => {
    setRound(generateAnagramRound({ minLetters: 5, maxLetters: 6, level: 1 }));
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setPhase('over');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  useEffect(() => {
    if (phase !== 'over' || recordedRef.current) return;
    recordedRef.current = true;
    const xp = Math.floor(score / 4);
    // Word Sprint doesn't track invalid submissions, so reporting
    // total == correct would auto-unlock the "Flawless" perfect-round
    // achievement every time. Omit both fields so the predicate
    // (`g.total > 0 && g.correct === g.total`) skips this row.
    recordMiniGameResult({
      gameId: 'word-sprint',
      score,
      xp,
    }).catch(() => {/* swallow — UI already in over state */});
  }, [phase, score]);

  const submit = () => {
    if (!round) return;
    const result = scoreAnagramAttempt(round, input, used);
    if (result.ok) {
      setScore((s) => s + result.points);
      setUsed((u) => new Set(u).add(input.toLowerCase().trim()));
      haptics.success();
    } else {
      haptics.error();
    }
    setInput('');
  };

  const reshuffle = () => {
    if (!round) return;
    const shuffled = [...round.letters].sort(() => Math.random() - 0.5);
    setRound({ ...round, letters: shuffled });
    haptics.light();
  };

  if (!round) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AnimatedBackground intensity="subtle" tint={Colors.accent} />
      <GameFrame
        title="Word Sprint"
        accent={Colors.accent}
        seconds={secondsLeft}
        totalSeconds={ROUND_SECONDS}
        score={score}
        onExit={() => router.replace('/play')}
      />
      {phase === 'playing' ? (
        <MotionView entering={FadeIn} style={styles.body}>
          <Text style={styles.hint}>Make as many words as you can from these letters.</Text>
          <View style={styles.letters}>
            {round.letters.map((c, i) => (
              <View key={i} style={styles.letterTile}><Text style={styles.letterText}>{c.toUpperCase()}</Text></View>
            ))}
          </View>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type a word…"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={submit}
            style={styles.input}
          />
          <View style={styles.row}>
            <Button label="Submit" onPress={submit} />
            <Button label="Reshuffle" onPress={reshuffle} variant="secondary" />
          </View>
          {used.size > 0 && (
            <View style={styles.usedWrap}>
              <Text style={styles.usedLabel}>Found ({used.size}):</Text>
              <Text style={styles.usedList} numberOfLines={3}>{Array.from(used).join(', ')}</Text>
            </View>
          )}
        </MotionView>
      ) : (
        <MotionView entering={FadeIn} style={styles.body}>
          <GameOverCard
            title="Time!"
            score={score}
            stats={[
              { label: 'Words found', value: used.size.toString() },
              { label: 'Best possible', value: round.validWords.length.toString() },
              { label: 'XP earned', value: Math.floor(score / 4).toString() },
            ]}
            onPlayAgain={() => router.replace('/game/word-sprint')}
            onExit={() => router.replace('/play')}
          />
        </MotionView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  body: { flex: 1, padding: Spacing.md, gap: Spacing.md },
  hint: { color: Colors.textSecondary, fontSize: FontSize.sm, fontFamily: 'PlusJakartaSans_400Regular' },
  letters: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center' },
  letterTile: { width: 52, height: 60, borderRadius: Radius.md, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  letterText: { fontSize: FontSize.xl, color: Colors.textPrimary, fontFamily: 'BricolageGrotesque_700Bold' },
  input: { backgroundColor: Colors.bgCard, color: Colors.textPrimary, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 12, fontSize: FontSize.lg, borderWidth: 1, borderColor: Colors.border, fontFamily: 'PlusJakartaSans_600SemiBold' },
  row: { flexDirection: 'row', gap: Spacing.sm },
  usedWrap: { backgroundColor: Colors.bgElevated, padding: Spacing.md, borderRadius: Radius.md, gap: 4 },
  usedLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_600SemiBold' },
  usedList: { fontSize: FontSize.sm, color: Colors.textPrimary, fontFamily: 'PlusJakartaSans_400Regular' },
});
