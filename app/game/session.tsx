import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  ZoomIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Timer } from '@/components/Timer';
import { Button } from '@/components/Button';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import { useGameStore } from '@/store/useGameStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ROUND_TIME = 15;

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
    roundResults,
    selectAnswer,
    nextQuestion,
    resetGame,
    timeExpired,
    setTimeLeft,
    timeLeft,
  } = useGameStore();

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Countdown phase (3-2-1)
  const [countdownNum, setCountdownNum] = useState(3);

  // Timer logic
  useEffect(() => {
    if (phase === 'playing') {
      setTimeLeft(ROUND_TIME);
      startTimeRef.current = Date.now();

      timerRef.current = setInterval(() => {
        setTimeLeft(Math.max(0, ROUND_TIME - Math.floor((Date.now() - startTimeRef.current) / 1000)));
      }, 200);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, currentIndex]);

  // Countdown
  useEffect(() => {
    if (phase === 'countdown') {
      setCountdownNum(3);
      const t1 = setTimeout(() => setCountdownNum(2), 1000);
      const t2 = setTimeout(() => setCountdownNum(1), 2000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [phase]);

  const handleAnswer = (answer: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const isCorrect = answer === currentQuestion?.correct_answer;
    Haptics.impactAsync(
      isCorrect ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Heavy
    ).catch(() => {});
    selectAnswer(answer, timeTaken);
  };

  const handleTimeExpired = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    timeExpired();
  };

  // ── Countdown Screen ─────────────────────────────────────────────────────
  if (phase === 'countdown') {
    return (
      <LinearGradient colors={[Colors.bg, '#1A0A3A']} style={styles.fullscreen}>
        <Animated.View key={countdownNum} entering={ZoomIn.duration(400)} style={styles.countdownContainer}>
          <Text style={styles.countdownNumber}>{countdownNum}</Text>
          <Text style={styles.countdownLabel}>Get Ready!</Text>
        </Animated.View>
      </LinearGradient>
    );
  }

  // ── Game Over Screen ──────────────────────────────────────────────────────
  if (phase === 'gameover') {
    const accuracy = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
    const grade =
      accuracy >= 80 ? { label: 'Brilliant! 🌟', color: Colors.gold } :
      accuracy >= 60 ? { label: 'Great! 🎉', color: Colors.success } :
      accuracy >= 40 ? { label: 'Not bad 👍', color: Colors.accent } :
      { label: 'Keep trying 💪', color: Colors.primaryLight };

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.gameoverScroll} showsVerticalScrollIndicator={false}>
          <Animated.View entering={ZoomIn.springify()}>
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.gameoverCard}>
              <Text style={styles.gameoverTitle}>{grade.label}</Text>
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
          </Animated.View>

          {/* Round by Round */}
          <Text style={styles.breakdownTitle}>Round Breakdown</Text>
          {roundResults.map((r, i) => (
            <Animated.View key={i} entering={FadeIn.delay(i * 80).springify()}>
              <View style={[styles.roundRow, { borderColor: r.isCorrect ? Colors.success : Colors.danger }]}>
                <Text style={styles.roundEmoji}>{r.isCorrect ? '✅' : '❌'}</Text>
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
            </Animated.View>
          ))}

          <View style={styles.gameoverBtns}>
            <Button
              label="Play Again 🎮"
              onPress={() => {
                resetGame();
                router.replace('/game/session' as any);
                router.back();
              }}
              style={{ flex: 1 }}
            />
            <Button
              label="Home 🏠"
              variant="ghost"
              onPress={() => {
                resetGame();
                router.replace('/(tabs)/');
              }}
              style={{ flex: 1 }}
            />
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Playing / Result Screen ───────────────────────────────────────────────
  if (!currentQuestion) return null;

  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => { resetGame(); router.back(); }}
          style={styles.closeBtn}
        >
          <Text style={styles.closeTxt}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.progressLabel}>
          {currentIndex + 1} / {questions.length}
        </Text>
        <Text style={styles.scoreTxt}>{totalScore}</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBg}>
        <Animated.View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      {/* Timer */}
      {phase === 'playing' && (
        <View style={styles.timerWrap}>
          <Timer timeLeft={timeLeft} totalTime={ROUND_TIME} onExpire={handleTimeExpired} />
        </View>
      )}

      {/* Question */}
      <Animated.View
        key={`q_${currentIndex}`}
        entering={SlideInRight.springify()}
        exiting={SlideOutLeft.springify()}
        style={styles.questionWrap}
      >
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryTxt}>{currentQuestion.category}</Text>
          <Text style={styles.diffBadge}>{currentQuestion.difficulty.toUpperCase()}</Text>
        </View>
        <Text style={styles.questionText}>{currentQuestion.question}</Text>
      </Animated.View>

      {/* Answer Options */}
      <View style={styles.answersWrap}>
        {currentQuestion.answers.map((answer, i) => {
          const isSelected = selectedAnswer === answer;
          const isCorrect = answer === currentQuestion.correct_answer;
          const showResult = phase === 'result';

          let borderColor = Colors.border;
          let bgColor = Colors.bgCard;
          let textColor = Colors.textPrimary;

          if (showResult) {
            if (isCorrect) {
              borderColor = Colors.success;
              bgColor = `${Colors.success}20`;
              textColor = Colors.successLight;
            } else if (isSelected && !isCorrect) {
              borderColor = Colors.danger;
              bgColor = `${Colors.danger}15`;
              textColor = Colors.dangerLight;
            }
          } else if (isSelected) {
            borderColor = Colors.primary;
            bgColor = `${Colors.primary}20`;
          }

          return (
            <Animated.View key={`${currentIndex}_${i}`} entering={FadeIn.delay(i * 60).springify()}>
              <TouchableOpacity
                onPress={() => handleAnswer(answer)}
                disabled={phase === 'result'}
                style={[styles.answerChip, { borderColor, backgroundColor: bgColor }]}
              >
                <View style={styles.answerInner}>
                  <Text style={styles.answerLetter}>
                    {['A', 'B', 'C', 'D'][i]}
                  </Text>
                  <Text style={[styles.answerText, { color: textColor }]}>{answer}</Text>
                  {showResult && isCorrect && <Text style={{ fontSize: 16 }}>✅</Text>}
                  {showResult && isSelected && !isCorrect && <Text style={{ fontSize: 16 }}>❌</Text>}
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      {/* Next Button (after answer) */}
      {phase === 'result' && (
        <Animated.View entering={FadeIn.springify()} style={styles.nextWrap}>
          <Button
            label={currentIndex + 1 >= questions.length ? 'See Results 🏆' : 'Next Question →'}
            onPress={nextQuestion}
            size="lg"
          />
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fullscreen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: Colors.bg },
  countdownContainer: { alignItems: 'center' },
  countdownNumber: {
    fontSize: 120,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_900Black',
    lineHeight: 130,
  },
  countdownLabel: {
    fontSize: FontSize.xl,
    color: Colors.textSecondary,
    fontFamily: 'Outfit_700Bold',
  },
  gameoverScroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.lg },
  gameoverCard: {
    borderRadius: 24,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  gameoverTitle: {
    fontSize: FontSize.xxl,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
    marginBottom: Spacing.sm,
  },
  gameoverScore: {
    fontSize: 72,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_900Black',
    lineHeight: 80,
  },
  gameoverScoreLabel: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Inter_400Regular',
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
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
  },
  gameoverStatLabel: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Inter_400Regular',
  },
  gameoverStatDiv: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },
  breakdownTitle: {
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
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
  roundEmoji: { fontSize: 18, width: 24 },
  roundQ: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontFamily: 'Inter_400Regular',
  },
  roundCorrect: {
    fontSize: FontSize.xs,
    color: Colors.successLight,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 2,
  },
  roundPoints: {
    fontSize: FontSize.sm,
    fontFamily: 'Outfit_700Bold',
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
    fontFamily: 'Outfit_700Bold',
  },
  scoreTxt: {
    fontSize: FontSize.md,
    color: Colors.primaryLight,
    fontFamily: 'Outfit_700Bold',
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
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  questionWrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    flex: 0,
  },
  categoryBadge: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  categoryTxt: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
    backgroundColor: Colors.bgElevated,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 20,
  },
  diffBadge: {
    fontSize: FontSize.xs,
    color: Colors.gold,
    fontFamily: 'Outfit_700Bold',
  },
  questionText: {
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
    lineHeight: 28,
  },
  answersWrap: {
    paddingHorizontal: Spacing.md,
    gap: 10,
    flex: 1,
  },
  answerChip: {
    borderRadius: Radius.md,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  answerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: 12,
  },
  answerLetter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.bgOverlay,
    textAlign: 'center',
    lineHeight: 28,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'Outfit_700Bold',
  },
  answerText: {
    flex: 1,
    fontSize: FontSize.md,
    fontFamily: 'Inter_400Regular',
  },
  nextWrap: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
});
