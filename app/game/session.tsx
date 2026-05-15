import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  BackHandler,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  ZoomIn,
} from 'react-native-reanimated';
import { TimerRing } from '@/components/TimerRing';
import { QuestionCard } from '@/components/QuestionCard';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { BubbleField } from '@/components/BubbleField';
import { XPBar } from '@/components/XPBar';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { Button } from '@/components/Button';
import { MotionView } from '@/components/MotionView';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import { Config } from '@/constants/config';
import { useGameStore } from '@/store/useGameStore';
import { haptics } from '@/lib/haptics';
import { audio } from '@/lib/audio';
import { shouldPrefetch, prefetchNextRound } from '@/lib/prefetch';
import { getXPForNextLevel } from '@/lib/trivia';
import { useUserStore } from '@/store/useUserStore';

export default function GameSessionScreen() {
  const {
    phase,
    currentQuestion,
    currentIndex,
    questions,
    selectedAnswer,
    totalScore,
    correctCount,
    xpEarned,
    leveledUp,
    roundResults,
    selectAnswer,
    nextQuestion,
    resetGame,
    timeExpired,
    setTimeLeft,
    timeLeft,
    category,
    prefetchedQuestions,
    setPrefetched,
  } = useGameStore();

  const profile = useUserStore((s) => s.profile);

  // Guard: if a user navigates directly to /game/session without going
  // through /play (e.g. by typing the URL or refreshing on the route),
  // there are no questions in the store and the screen renders blank.
  // Bounce them back to Play so they can pick a category.
  useEffect(() => {
    if (phase === 'idle' && questions.length === 0) {
      const t = setTimeout(() => router.replace('/play'), 0);
      return () => clearTimeout(t);
    }
  }, [phase, questions.length]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const tickedRef = useRef<Set<number>>(new Set());
  const prefetchedKickedRef = useRef(false);
  const correctStreakRef = useRef(0); // C7: in-game correct-streak for milestone haptic
  const fanfarePlayedRef = useRef(false); // play fanfare exactly once

  const [countdownNum, setCountdownNum] = useState<number>(Config.COUNTDOWN_SECONDS);

  // ── Quit confirmation (A12) ────────────────────────────────────────────
  // Always returns to /play. On web, Alert.alert is a no-op so the dialog
  // never shows and the screen feels frozen — fall back to window.confirm.
  const quit = useCallback(() => {
    resetGame();
    // Replace (not back) so direct-linkers and refresh-on-game don't get
    // stuck without a history entry.
    router.replace('/play');
  }, [resetGame]);

  const confirmQuit = useCallback(() => {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      const ok = typeof window !== 'undefined'
        ? window.confirm('Quit the round? Your progress in this round will be lost.')
        : true;
      if (ok) quit();
      return;
    }
    Alert.alert(
      'Quit game?',
      'Your progress in this round will be lost.',
      [
        { text: 'Keep playing', style: 'cancel' },
        { text: 'Quit', style: 'destructive', onPress: quit },
      ]
    );
  }, [quit]);

  // Hardware back button on Android during play / result (not gameover).
  useEffect(() => {
    if (phase !== 'playing' && phase !== 'result' && phase !== 'countdown') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      confirmQuit();
      return true; // we handled it; don't let the system pop the screen
    });
    return () => sub.remove();
  }, [phase, confirmQuit]);

  const handleTimeExpired = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    haptics.warning();
    audio.wrong();
    correctStreakRef.current = 0;
    timeExpired();
  }, [timeExpired]);

  useEffect(() => {
    if (phase === 'playing') {
      setTimeLeft(Config.ROUND_TIME_SECONDS);
      startTimeRef.current = Date.now();
      tickedRef.current = new Set();

      timerRef.current = setInterval(() => {
        const remaining = Math.max(
          0,
          Config.ROUND_TIME_SECONDS - Math.floor((Date.now() - startTimeRef.current) / 1000)
        );
        setTimeLeft(remaining);
        if (remaining <= 3 && remaining > 0 && !tickedRef.current.has(remaining)) {
          tickedRef.current.add(remaining);
          audio.tick();
        }
        if (remaining === 0 && !tickedRef.current.has(0)) {
          tickedRef.current.add(0);
          handleTimeExpired();
        }
      }, 200);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, currentIndex, setTimeLeft, handleTimeExpired]);

  // A10: 3-2-1 countdown ticks audibly on every transition.
  useEffect(() => {
    if (phase === 'countdown') {
      setCountdownNum(Config.COUNTDOWN_SECONDS);
      audio.tick();
      const timers: ReturnType<typeof setTimeout>[] = [];
      for (let i = 1; i < Config.COUNTDOWN_SECONDS; i++) {
        timers.push(
          setTimeout(() => {
            setCountdownNum(Config.COUNTDOWN_SECONDS - i);
            audio.tick();
          }, i * 1000)
        );
      }
      return () => timers.forEach(clearTimeout);
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== 'playing' && phase !== 'result') return;
    const should = shouldPrefetch({
      currentIndex,
      totalQuestions: questions.length,
      alreadyPrefetched: !!prefetchedQuestions || prefetchedKickedRef.current,
    });
    if (should) {
      prefetchedKickedRef.current = true;
      prefetchNextRound(category)
        .then((qs) => setPrefetched(qs, category))
        .catch(() => {});
    }
  }, [currentIndex, phase, questions.length, prefetchedQuestions, category, setPrefetched]);

  const handleAnswer = (answer: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    // Float seconds, NOT integer: 100ms and 900ms must produce different
    // speed bonuses. Math.floor here previously collapsed every sub-second
    // answer to 0s, making the speed bonus binary.
    const timeTaken = (Date.now() - startTimeRef.current) / 1000;
    const isCorrect = answer === currentQuestion?.correct_answer;
    if (isCorrect) {
      correctStreakRef.current += 1;
      // C7 fix: heavy haptic on every 5-correct milestone within the round.
      if (correctStreakRef.current > 0 && correctStreakRef.current % 5 === 0) {
        haptics.heavy();
      } else {
        haptics.medium();
      }
      audio.correct();
    } else {
      correctStreakRef.current = 0;
      haptics.heavy();
      audio.wrong();
    }
    selectAnswer(answer, timeTaken);
  };

  // ── Countdown ──────────────────────────────────────────────────────────
  if (phase === 'countdown') {
    return (
      <LinearGradient colors={[Colors.bg, Colors.bgElevated]} style={styles.fullscreen}>
        <AnimatedBackground intensity="subtle" tint={Colors.primary} />
        {/* Floating X close button — user can back out before the round starts. */}
        <View style={styles.countdownExitWrap}>
          {Platform.OS === 'web' ? (
            // eslint-disable-next-line react/forbid-elements
            <button
              type="button"
              onClick={confirmQuit}
              aria-label="Quit round"
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                border: 'none',
                backgroundColor: Colors.bgElevated,
                color: Colors.textSecondary,
                fontSize: 20,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                fontFamily: 'BricolageGrotesque_700Bold',
              }}
            >
              ✕
            </button>
          ) : (
            <TouchableOpacity onPress={confirmQuit} style={styles.closeBtn} hitSlop={12}>
              <Text style={styles.closeTxt}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <MotionView key={countdownNum} entering={ZoomIn.duration(400)} style={styles.countdownContainer}>
          <Text style={styles.countdownNumber}>{countdownNum}</Text>
          <Text style={styles.countdownLabel}>Get Ready!</Text>
        </MotionView>
      </LinearGradient>
    );
  }

  // ── Game Over ──────────────────────────────────────────────────────────
  if (phase === 'gameover') {
    const accuracy = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
    const grade =
      accuracy >= 80 ? { label: 'Excellent', color: Colors.gold } :
      accuracy >= 60 ? { label: 'Strong round', color: Colors.success } :
      accuracy >= 40 ? { label: 'Good effort', color: Colors.accent } :
      { label: 'Keep going', color: Colors.primaryLight };

    const xpForNext = getXPForNextLevel(profile.level);
    // A9 fix: confetti fires on level-up (the actual "you progressed" moment),
    // not on accuracy. Accuracy already drives the grade label.
    const showConfetti = leveledUp;

    if (showConfetti && !fanfarePlayedRef.current) {
      fanfarePlayedRef.current = true;
      audio.levelup();
    }

    return (
      <SafeAreaView style={styles.container}>
        <AnimatedBackground intensity="subtle" tint={Colors.primary} />
        {showConfetti && <ConfettiBurst trigger={true} />}
        <ScrollView contentContainerStyle={styles.gameoverScroll} showsVerticalScrollIndicator={false}>
          <MotionView entering={ZoomIn.springify()}>
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.gameoverCard}>
              <Text style={styles.gameoverTitle}>{grade.label}</Text>
              {leveledUp && (
                <Text style={styles.levelUp}>LEVEL UP → {profile.level}</Text>
              )}
              <Text style={styles.gameoverScore}>{totalScore.toLocaleString()}</Text>
              <Text style={styles.gameoverScoreLabel}>points</Text>
              <View style={styles.gameoverStats}>
                <View style={styles.gameoverStat}>
                  <Text style={styles.gameoverStatVal}>{correctCount}/{questions.length}</Text>
                  <Text style={styles.gameoverStatLabel}>Correct</Text>
                </View>
                <View style={styles.gameoverStatDiv} />
                <View style={styles.gameoverStat}>
                  <Text style={styles.gameoverStatVal}>{accuracy}%</Text>
                  <Text style={styles.gameoverStatLabel}>Accuracy</Text>
                </View>
                <View style={styles.gameoverStatDiv} />
                <View style={styles.gameoverStat}>
                  <Text style={[styles.gameoverStatVal, { color: Colors.goldLight }]}>+{xpEarned}</Text>
                  <Text style={styles.gameoverStatLabel}>XP Earned</Text>
                </View>
              </View>
            </LinearGradient>
          </MotionView>

          <View style={styles.xpWrap}>
            <XPBar level={profile.level} xp={profile.totalXP} xpForNext={xpForNext} />
          </View>

          <Text style={styles.breakdownTitle}>Round Breakdown</Text>
          {roundResults.map((r, i) => (
            <MotionView key={i} entering={FadeIn.delay(i * 80).springify()}>
              <View style={[styles.roundRow, { borderColor: r.isCorrect ? Colors.success : Colors.danger }]}>
                <Text style={[styles.roundMark, { color: r.isCorrect ? Colors.success : Colors.danger }]}>
                  {r.isCorrect ? 'OK' : 'NO'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.roundQ} numberOfLines={2}>{r.question.question}</Text>
                  {!r.isCorrect && (
                    <Text style={styles.roundCorrect}>✓ {r.question.correct_answer}</Text>
                  )}
                </View>
                <Text style={[styles.roundPoints, { color: r.isCorrect ? Colors.success : Colors.textMuted }]}>
                  {r.isCorrect ? `+${r.pointsEarned}` : '0'}
                </Text>
              </View>
            </MotionView>
          ))}

          <View style={styles.gameoverBtns}>
            <Button
              label="Play again"
              onPress={() => {
                resetGame();
                router.back();
              }}
              style={{ flex: 1 }}
            />
            <Button
              label="Home"
              variant="ghost"
              onPress={() => {
                resetGame();
                router.replace('/(tabs)');
              }}
              style={{ flex: 1 }}
            />
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Playing / Result ───────────────────────────────────────────────────
  if (!currentQuestion) return null;

  const progress = ((currentIndex + 1) / questions.length) * 100;
  const showResult = phase === 'result';

  // Per-bubble visual state for the BubbleField. The arcade game shows
  // 4 bobbing color bubbles; the correct one stays put on a hit, the
  // wrong ones fade away when the round resolves.
  const BUBBLE_COLORS = [Colors.primary, Colors.accent, Colors.gold, '#7E5DB0'];

  function bubbleStateFor(answer: string): 'idle' | 'correct' | 'wrong' | 'fading' {
    if (!showResult) return 'idle';
    if (answer === currentQuestion!.correct_answer) return 'correct';
    if (selectedAnswer === answer) return 'wrong';
    return 'fading';
  }

  return (
    <SafeAreaView style={styles.container}>
      <AnimatedBackground intensity="subtle" tint={Colors.primary} />
      <View style={styles.topBar}>
        {/* Web uses a real <button> so the click is bulletproof; native
            keeps TouchableOpacity for haptics/ripple. */}
        {Platform.OS === 'web' ? (
          // eslint-disable-next-line react/forbid-elements
          <button
            type="button"
            onClick={confirmQuit}
            aria-label="Quit round"
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              border: 'none',
              backgroundColor: Colors.bgElevated,
              color: Colors.textSecondary,
              fontSize: 20,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              fontFamily: 'BricolageGrotesque_700Bold',
            }}
          >
            ✕
          </button>
        ) : (
          <TouchableOpacity onPress={confirmQuit} style={styles.closeBtn} hitSlop={12}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.progressLabel}>
          {currentIndex + 1} / {questions.length}
        </Text>
        <Text style={styles.scoreTxt}>{totalScore}</Text>
      </View>

      <View style={styles.progressBg}>
        <MotionView style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      {phase === 'playing' && (
        <View style={styles.timerWrap}>
          <TimerRing timeLeft={timeLeft} totalTime={Config.ROUND_TIME_SECONDS} />
        </View>
      )}

      <QuestionCard
        question={currentQuestion.question}
        category={currentQuestion.category}
        difficulty={currentQuestion.difficulty}
        questionKey={`q_${currentIndex}`}
      />

      <View style={styles.answersWrap}>
        <BubbleField
          answers={currentQuestion.answers}
          correctAnswer={currentQuestion.correct_answer}
          colors={BUBBLE_COLORS}
          states={currentQuestion.answers.map(bubbleStateFor)}
          onPick={(i) => {
            if (showResult) return;
            handleAnswer(currentQuestion.answers[i]);
          }}
        />
      </View>

      {showResult && (
        <MotionView entering={FadeIn.springify()} style={styles.nextWrap}>
          <Button
            label={currentIndex + 1 >= questions.length ? 'See results' : 'Next question'}
            onPress={nextQuestion}
            size="lg"
          />
        </MotionView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fullscreen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  countdownExitWrap: { position: 'absolute', top: Spacing.lg, left: Spacing.md, zIndex: 10 },
  container: { flex: 1, backgroundColor: Colors.bg },
  countdownContainer: { alignItems: 'center' },
  countdownNumber: {
    fontSize: 120,
    color: Colors.primary,
    fontFamily: 'BagelFatOne_400Regular',
    lineHeight: 130,
  },
  countdownLabel: {
    fontSize: FontSize.xl,
    color: Colors.textSecondary,
    fontFamily: 'BricolageGrotesque_700Bold',
  },
  gameoverScroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.lg },
  gameoverCard: {
    borderRadius: 16,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  gameoverTitle: {
    fontSize: FontSize.xxl,
    color: '#FFFFFF',
    fontFamily: 'BricolageGrotesque_700Bold',
    marginBottom: Spacing.sm,
  },
  levelUp: {
    fontSize: FontSize.sm,
    color: Colors.goldLight,
    fontFamily: 'BagelFatOne_400Regular',
    letterSpacing: 0,
    marginBottom: Spacing.sm,
  },
  gameoverScore: {
    fontSize: 72,
    color: '#FFFFFF',
    fontFamily: 'BagelFatOne_400Regular',
    lineHeight: 80,
  },
  gameoverScoreLabel: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'PlusJakartaSans_400Regular',
    marginBottom: Spacing.md,
  },
  gameoverStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  gameoverStat: { alignItems: 'center' },
  gameoverStatVal: {
    fontSize: FontSize.xl,
    color: '#FFFFFF',
    fontFamily: 'BricolageGrotesque_700Bold',
  },
  gameoverStatLabel: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  gameoverStatDiv: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },
  xpWrap: { marginBottom: Spacing.lg },
  breakdownTitle: {
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    fontFamily: 'BricolageGrotesque_700Bold',
    marginBottom: Spacing.sm,
  },
  roundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  roundMark: {
    width: 28,
    fontSize: FontSize.xs,
    fontFamily: 'BricolageGrotesque_700Bold',
    textAlign: 'center',
  },
  roundQ: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  roundCorrect: {
    fontSize: FontSize.xs,
    color: Colors.successLight,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    marginTop: 2,
  },
  roundPoints: {
    fontSize: FontSize.sm,
    fontFamily: 'BricolageGrotesque_700Bold',
    width: 36,
    textAlign: 'right',
  },
  gameoverBtns: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '700' },
  progressLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontFamily: 'BricolageGrotesque_700Bold',
  },
  scoreTxt: {
    fontSize: FontSize.md,
    color: Colors.primaryLight,
    fontFamily: 'BricolageGrotesque_700Bold',
    minWidth: 36,
    textAlign: 'right',
  },
  progressBg: {
    height: 4,
    backgroundColor: Colors.bgOverlay,
    marginHorizontal: Spacing.md,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  timerWrap: {
    paddingTop: Spacing.md,
    alignItems: 'center',
  },
  answersWrap: {
    paddingHorizontal: Spacing.md,
    gap: 10,
    flex: 1,
  },
  nextWrap: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
});
