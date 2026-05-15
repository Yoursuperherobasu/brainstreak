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
import { LetterTile } from '@/components/games/word/LetterTile';
import { SolveHalo } from '@/components/games/word/SolveHalo';
import { haptics } from '@/lib/haptics';
import { recordMiniGameResult } from '@/lib/games/recordMiniGame';
import { usePausableInterval } from '@/lib/usePausableInterval';
import { audio } from '@/lib/audio';
import { useGameBackHandler } from '@/lib/useGameBackHandler';

const ROUND_SECONDS = 60;

export default function WordSprintScreen() {
  const [round, setRound] = useState<AnagramRound | null>(null);
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [used, setUsed] = useState<Set<string>>(new Set());
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [phase, setPhase] = useState<'playing' | 'over'>('playing');
  const [leveledUp, setLeveledUp] = useState(false);
  const [newBest, setNewBest] = useState(false);
  const [prevBest, setPrevBest] = useState(0);
  const recordedRef = useRef(false);
  // Cartoon flourishes: bump `popKey` to trigger letter-tile slot pop on
  // valid submit; bump `haloKey` for the golden halo behind the input row.
  const [popKey, setPopKey] = useState(0);
  const [haloKey, setHaloKey] = useState(0);
  // Bumped when letters are reshuffled so the entrance staggers replay.
  const [tilesKey, setTilesKey] = useState(0);

  useEffect(() => {
    setRound(generateAnagramRound({ minLetters: 5, maxLetters: 6, level: 1 }));
  }, []);

  usePausableInterval({
    durationMs: ROUND_SECONDS * 1000,
    tickMs: 1000,
    enabled: phase === 'playing',
    onTick: (remainingMs) => setSecondsLeft(Math.ceil(remainingMs / 1000)),
    onComplete: () => {
      setPhase('over');
      setSecondsLeft(0);
    },
  });

  useGameBackHandler({
    enabled: phase === 'playing',
    onExit: () => router.replace('/play'),
  });

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
    }).then((res) => {
      if (res.leveledUp) {
        setLeveledUp(true);
        audio.levelup();
      }
      if (res.wasNewBest) {
        setNewBest(true);
        setPrevBest(res.previousBest);
      }
    }).catch(() => {/* swallow — UI already in over state */});
  }, [phase, score]);

  const submit = () => {
    if (!round) return;
    const result = scoreAnagramAttempt(round, input, used);
    if (result.ok) {
      setScore((s) => s + result.points);
      setUsed((u) => new Set(u).add(input.toLowerCase().trim()));
      haptics.success();
      // Trigger cartoon flourishes only for valid solves so the screen stays
      // calm on misses. popKey cascades a per-tile pop; haloKey expands a
      // golden glow behind the answer row.
      setPopKey((k) => k + 1);
      setHaloKey((k) => k + 1);
    } else {
      haptics.error();
    }
    setInput('');
  };

  const reshuffle = () => {
    if (!round) return;
    const shuffled = [...round.letters].sort(() => Math.random() - 0.5);
    setRound({ ...round, letters: shuffled });
    setTilesKey((k) => k + 1);
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
              <LetterTile
                key={`${tilesKey}-${i}`}
                letter={c}
                index={i}
                popKey={popKey}
                active={phase === 'playing'}
              />
            ))}
          </View>
          <View style={styles.answerRow}>
            <SolveHalo burstKey={haloKey} />
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
            newBest={newBest}
            delta={score - prevBest}
            leveledUp={leveledUp}
          />
        </MotionView>
      )}
    </SafeAreaView>
  );
}

// Word Sprint visual identity: paper-y warm tan accent. Letter tiles look
// like Scrabble pieces (warm cream, gold border, subtle shadow). The body
// gets a faint warm wash so the screen feels like a notebook page, not
// "another blue card".
const PAPER_BG    = '#FBF6EA';
const PAPER_TILE  = '#FFF8E6';
const PAPER_INK   = '#5A4A2A';
const PAPER_GOLD  = '#D99921';
const PAPER_FOUND = '#F2E6C9';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  body: { flex: 1, padding: Spacing.md, gap: Spacing.md, backgroundColor: PAPER_BG },
  hint: { color: PAPER_INK, fontSize: FontSize.sm, fontFamily: 'PlusJakartaSans_600SemiBold' },
  letters: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center', paddingVertical: Spacing.sm },
  // Wraps the input + action row so the SolveHalo (absolutely positioned)
  // sits behind both and glows the whole answer area on solve.
  answerRow: { position: 'relative', gap: Spacing.md },
  input: {
    backgroundColor: PAPER_TILE,
    color: PAPER_INK,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: FontSize.lg,
    borderWidth: 1.5,
    borderColor: PAPER_GOLD,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  row: { flexDirection: 'row', gap: Spacing.sm },
  usedWrap: {
    backgroundColor: PAPER_FOUND,
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: 4,
    borderWidth: 1,
    borderColor: PAPER_GOLD,
  },
  usedLabel: { fontSize: FontSize.xs, color: PAPER_INK, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 0.5 },
  usedList: { fontSize: FontSize.sm, color: PAPER_INK, fontFamily: 'PlusJakartaSans_500Medium' },
});
