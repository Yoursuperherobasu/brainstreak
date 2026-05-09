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
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Colors, Spacing, FontSize, CATEGORIES, Radius } from '@/constants/theme';
import { fetchTriviaQuestions } from '@/lib/trivia';
import { useGameStore } from '@/store/useGameStore';

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
  const { startGame } = useGameStore();

  const handlePlay = async () => {
    setLoading(true);
    try {
      const questions = await fetchTriviaQuestions(5, selectedCategory, selectedDifficulty === 'any' ? 'any' : selectedDifficulty);
      if (!questions.length) {
        Alert.alert('Oops!', 'Could not load questions. Try again!');
        return;
      }
      startGame(questions, selectedCategory);
      router.push('/game/session');
    } catch (err) {
      Alert.alert('Error', 'Something went wrong. Check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.springify()} style={styles.header}>
          <Text style={styles.title}>Play 🎮</Text>
          <Text style={styles.subtitle}>5 questions · 15 seconds each</Text>
        </Animated.View>

        {/* Category Selection */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Text style={styles.sectionLabel}>Choose Category</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  style={[
                    styles.categoryChip,
                    { borderColor: isSelected ? cat.color : Colors.border },
                    isSelected && { backgroundColor: `${cat.color}20` },
                  ]}
                >
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  <Text
                    style={[
                      styles.categoryLabel,
                      { color: isSelected ? cat.color : Colors.textSecondary },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* Difficulty Selection */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text style={styles.sectionLabel}>Difficulty</Text>
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

        {/* How to Play Card */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Card style={styles.howCard}>
            <Text style={styles.howTitle}>How to Play</Text>
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

        {/* Selected Summary */}
        <Animated.View entering={FadeInDown.delay(350).springify()}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.summaryCard}
          >
            <Text style={styles.summaryText}>
              {CATEGORIES.find((c) => c.id === selectedCategory)?.emoji}{' '}
              {CATEGORIES.find((c) => c.id === selectedCategory)?.label} ·{' '}
              {DIFFICULTIES.find((d) => d.id === selectedDifficulty)?.label}
            </Text>
            <Text style={styles.summaryXP}>+up to 750 XP</Text>
          </LinearGradient>
        </Animated.View>

        {/* Play Button */}
        <Animated.View entering={FadeInDown.delay(400).springify()}>
          <Button
            label={loading ? 'Loading...' : 'Start Game 🚀'}
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
  header: { marginBottom: Spacing.lg },
  title: {
    fontSize: FontSize.xxxl,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_900Black',
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontFamily: 'Outfit_700Bold',
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  categoryEmoji: { fontSize: 18 },
  categoryLabel: {
    fontSize: FontSize.sm,
    fontFamily: 'Outfit_700Bold',
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
