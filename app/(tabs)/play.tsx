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
import { Colors, Spacing, FontSize, CATEGORIES, Radius } from '@/constants/theme';
import { fetchTriviaQuestions } from '@/lib/trivia';
import { useGameStore } from '@/store/useGameStore';
import { Config } from '@/constants/config';

type Difficulty = 'any' | 'easy' | 'medium' | 'hard';

const DIFFICULTIES: { id: Difficulty; label: string; emoji: string; color: string }[] = [
  { id: 'any', label: 'Mixed', emoji: '🎲', color: Colors.primaryLight },
  { id: 'easy', label: 'Easy', emoji: '😊', color: Colors.success },
  { id: 'medium', label: 'Medium', emoji: '🤔', color: Colors.gold },
  { id: 'hard', label: 'Hard', emoji: '🔥', color: Colors.danger },
];

export default function PlayScreen() {
  const [selectedCategory, setSelectedCategory] = useState('mixed');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('any');
  const [loading, setLoading] = useState(false);
  const { startGame, consumePrefetched } = useGameStore();

  const handlePlay = async () => {
    setLoading(true);
    try {
      const prefetched = consumePrefetched();
      const questions = prefetched && prefetched.category === selectedCategory
        ? prefetched.questions
        : await fetchTriviaQuestions(Config.QUESTIONS_PER_GAME, selectedCategory, selectedDifficulty);

      if (!questions.length) {
        Alert.alert('Oops!', 'Could not load questions. Try again.');
        return;
      }
      startGame(questions, selectedCategory);
      router.push('/game/session');
    } catch {
      Alert.alert('Error', 'Something went wrong. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const selectedCat = CATEGORIES.find((c) => c.id === selectedCategory);
  const selectedDiff = DIFFICULTIES.find((d) => d.id === selectedDifficulty);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <Animated.View entering={FadeInDown.springify()} style={styles.header}>
          <Text style={styles.title}>Pick a category</Text>
          <Text style={styles.subtitle}>{Config.QUESTIONS_PER_GAME} questions · {Config.ROUND_TIME_SECONDS} seconds each</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <CategoryTile
                key={cat.id}
                emoji={cat.emoji}
                label={cat.label}
                color={cat.color}
                selected={selectedCategory === cat.id}
                onPress={() => setSelectedCategory(cat.id)}
              />
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()}>
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
                  <Text style={styles.diffEmoji}>{d.emoji}</Text>
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
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Card style={styles.howCard}>
            <Text style={styles.howTitle}>How to play</Text>
            {[
              ['⚡', 'Answer 5 questions as fast as you can'],
              ['⏱️', '15 seconds per question — speed = bonus points'],
              ['🔥', 'Play daily to build your streak'],
              ['🧠', 'Earn XP and level up your brain'],
            ].map(([emoji, text]) => (
              <View key={text} style={styles.howRow}>
                <Text style={styles.howEmoji}>{emoji}</Text>
                <Text style={styles.howText}>{text}</Text>
              </View>
            ))}
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(350).springify()}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.summaryCard}
          >
            <Text style={styles.summaryText}>
              {selectedCat?.emoji} {selectedCat?.label} · {selectedDiff?.label}
            </Text>
            <Text style={styles.summaryXP}>+up to 750 XP</Text>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).springify()}>
          <Button
            label={loading ? 'Loading...' : 'Start game 🚀'}
            onPress={handlePlay}
            loading={loading}
            size="lg"
            style={styles.playBtn}
          />
        </Animated.View>

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
    fontFamily: 'Outfit_900Black',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
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
  diffEmoji: { fontSize: 20 },
  diffLabel: {
    fontSize: FontSize.xs,
    fontFamily: 'Outfit_700Bold',
  },
  howCard: { marginTop: Spacing.md, gap: 10 },
  howTitle: {
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
    marginBottom: 4,
  },
  howRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  howEmoji: { fontSize: 18, width: 26 },
  howText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
  },
  summaryCard: {
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
  },
  summaryXP: {
    fontSize: FontSize.sm,
    color: Colors.goldLight,
    fontFamily: 'Outfit_700Bold',
  },
  playBtn: { marginTop: Spacing.lg },
});
