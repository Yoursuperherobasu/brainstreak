import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CategoryTile } from '@/components/CategoryTile';
import { SectionHeader } from '@/components/SectionHeader';
import { MotionView } from '@/components/MotionView';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { Colors, Spacing, FontSize, CATEGORIES, Radius } from '@/constants/theme';
import { fetchTriviaQuestions } from '@/lib/trivia';
import { generateBrainRush } from '@/lib/quiz-bank';
import { useGameStore } from '@/store/useGameStore';
import { useUserStore } from '@/store/useUserStore';
import { Config } from '@/constants/config';

type Difficulty = 'any' | 'easy' | 'medium' | 'hard';

const DIFFICULTIES: { id: Difficulty; label: string; color: string }[] = [
  { id: 'any', label: 'Mixed', color: Colors.primaryLight },
  { id: 'easy', label: 'Easy', color: Colors.success },
  { id: 'medium', label: 'Medium', color: Colors.gold },
  { id: 'hard', label: 'Hard', color: Colors.danger },
];

export default function PlayScreen() {
  const [selectedCategory, setSelectedCategory] = useState('brain');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('any');
  const [loading, setLoading] = useState(false);
  const { startGame, consumePrefetched } = useGameStore();
  const userLevel = useUserStore((s) => s.profile.level);

  const handlePlay = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // BrainRush mode (the new default): math + english + GK mixed,
      // generated locally so Play is instant on every platform — no
      // network round-trip, no OpenTDB dependency, no CORS surprises.
      // We still fall through to OpenTDB for the legacy trivia categories.
      let questions;
      if (selectedCategory === 'brain') {
        questions = generateBrainRush(Config.QUESTIONS_PER_GAME, userLevel);
      } else {
        const prefetched = consumePrefetched();
        questions = prefetched && prefetched.category === selectedCategory
          ? prefetched.questions
          : await fetchTriviaQuestions(Config.QUESTIONS_PER_GAME, selectedCategory, selectedDifficulty);
      }

      if (!questions || questions.length === 0) {
        Alert.alert('Oops!', 'Could not load questions. Try again.');
        return;
      }
      startGame(questions, selectedCategory);
      // Navigate after the store update so the session screen reads
      // the right phase on first paint.
      router.push('/game/session');
    } catch (err) {
      Alert.alert('Error', 'Something went wrong. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const selectedCat = CATEGORIES.find((c) => c.id === selectedCategory);
  const selectedDiff = DIFFICULTIES.find((d) => d.id === selectedDifficulty);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AnimatedBackground intensity="subtle" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <MotionView entering={FadeInDown.springify()} style={styles.header}>
          <Text style={styles.title}>Play</Text>
          <Text style={styles.subtitle}>6 ways to flex your brain — no doomscroll required.</Text>
        </MotionView>

        <MotionView entering={FadeInDown.delay(40).springify()}>
          <SectionHeader title="Arcade — 5 mini-games" />
          <View style={styles.miniGrid}>
            {(
              [
                { id: 'word-sprint',  title: 'Word Sprint',  sub: '60s anagram chase',       color: Colors.accent  },
                { id: 'number-sense', title: 'Number Sense', sub: '30s math drill',          color: Colors.primaryLight },
                { id: 'memory-match', title: 'Memory Match', sub: 'Simon-style sequence',    color: Colors.gold    },
                { id: 'reaction-tap', title: 'Reaction Tap', sub: 'Tap before it vanishes',  color: Colors.success },
                { id: 'road-rush',    title: 'Road Rush',    sub: 'Dodge traffic, no chill', color: Colors.danger  },
              ] as const
            ).map((g) => (
              <Card
                key={g.id}
                onPress={() => router.push(`/game/${g.id}` as any)}
                style={styles.miniCard}
              >
                <View style={[styles.miniMarker, { backgroundColor: g.color }]} />
                <Text style={styles.miniTitle}>{g.title}</Text>
                <Text style={styles.miniSub}>{g.sub}</Text>
              </Card>
            ))}
          </View>
        </MotionView>

        <MotionView entering={FadeInDown.delay(60).springify()}>
          <SectionHeader title="Brain Rush — pick a category" />
        </MotionView>

        <MotionView entering={FadeInDown.delay(100).springify()}>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <CategoryTile
                key={cat.id}
                label={cat.label}
                color={cat.color}
                selected={selectedCategory === cat.id}
                onPress={() => setSelectedCategory(cat.id)}
              />
            ))}
          </View>
        </MotionView>

        <MotionView entering={FadeInDown.delay(200).springify()}>
          <SectionHeader title="Difficulty" />
          <View style={styles.diffRow}>
            {DIFFICULTIES.map((d) => {
              const isSelected = selectedDifficulty === d.id;
              return (
                <TouchableOpacity
                  key={d.id}
                  onPress={() => setSelectedDifficulty(d.id)}
                  style={[
                    styles.diffChip,
                    { borderColor: isSelected ? d.color : Colors.border },
                    isSelected && { backgroundColor: `${d.color}20` },
                  ]}
                >
                  <View style={[styles.diffMarker, { backgroundColor: d.color }]} />
                  <Text
                    style={[
                      styles.diffLabel,
                      { color: isSelected ? d.color : Colors.textSecondary },
                    ]}
                  >
                    {d.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </MotionView>

        <MotionView entering={FadeInDown.delay(300).springify()}>
          <Card style={styles.howCard}>
            <Text style={styles.howTitle}>How to play</Text>
            {[
              ['01', 'Answer 5 questions as fast as you can'],
              ['02', '15 seconds per question. Speed adds bonus points'],
              ['03', 'Play daily to build your streak'],
              ['04', 'Earn XP and level up'],
            ].map(([step, text]) => (
              <View key={text} style={styles.howRow}>
                <Text style={styles.howStep}>{step}</Text>
                <Text style={styles.howText}>{text}</Text>
              </View>
            ))}
          </Card>
        </MotionView>

        <MotionView entering={FadeInDown.delay(350).springify()}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.summaryCard}
          >
            <Text style={styles.summaryText}>
              {selectedCat?.label} · {selectedDiff?.label}
            </Text>
            <Text style={styles.summaryXP}>+up to 750 XP</Text>
          </LinearGradient>
        </MotionView>

        <MotionView entering={FadeInDown.delay(400).springify()}>
          <Button
            label={loading ? 'Loading...' : 'Start game'}
            onPress={handlePlay}
            loading={loading}
            size="lg"
            style={styles.playBtn}
          />
        </MotionView>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  header: { marginBottom: Spacing.md },
  title: {
    fontSize: FontSize.xxxl,
    color: Colors.textPrimary,
    fontFamily: 'BagelFatOne_400Regular',
    letterSpacing: 0,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_400Regular',
    marginTop: 4,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  diffRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  diffChip: {
    flex: 1,
    minWidth: 70,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 4,
  },
  diffMarker: {
    width: 18,
    height: 4,
    borderRadius: 2,
  },
  diffLabel: {
    fontSize: FontSize.xs,
    fontFamily: 'BricolageGrotesque_700Bold',
  },
  howCard: { marginTop: Spacing.md, gap: 10 },
  howTitle: {
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    fontFamily: 'BricolageGrotesque_700Bold',
    marginBottom: 4,
  },
  howRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  howStep: {
    width: 28,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontFamily: 'BricolageGrotesque_700Bold',
  },
  howText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  summaryCard: {
    marginTop: Spacing.md,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: FontSize.md,
    color: '#FFFFFF',
    fontFamily: 'BricolageGrotesque_700Bold',
  },
  summaryXP: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.78)',
    fontFamily: 'BricolageGrotesque_700Bold',
  },
  playBtn: { marginTop: Spacing.lg },
  miniGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  miniCard: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  miniMarker: {
    width: 24,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  miniTitle: {
    fontFamily: 'BricolageGrotesque_700Bold',
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  miniSub: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
