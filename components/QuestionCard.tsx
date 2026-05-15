import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import { MotionView } from '@/components/MotionView';

interface QuestionCardProps {
  question: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionKey: string | number;
}

const DIFFICULTY_COLOR: Record<QuestionCardProps['difficulty'], string> = {
  easy: Colors.success,
  medium: Colors.gold,
  hard: Colors.danger,
};

export function QuestionCard({ question, category, difficulty, questionKey }: QuestionCardProps) {
  return (
    <MotionView
      key={questionKey}
      entering={FadeInRight.springify().damping(15)}
      exiting={FadeOutLeft.duration(200)}
      style={styles.wrap}
    >
      <View style={styles.badges}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{category}</Text>
        </View>
        <View style={[styles.difficultyBadge, { borderColor: DIFFICULTY_COLOR[difficulty] }]}>
          <Text style={[styles.difficultyText, { color: DIFFICULTY_COLOR[difficulty] }]}>
            {difficulty.toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={styles.question}>{question}</Text>
    </MotionView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: Colors.bgElevated,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
  },
  categoryText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  difficultyBadge: {
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: Radius.full,
  },
  difficultyText: {
    fontFamily: 'BricolageGrotesque_700Bold',
    fontSize: FontSize.xs,
    letterSpacing: 0,
  },
  question: {
    fontFamily: 'BricolageGrotesque_700Bold',
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    lineHeight: 30,
  },
});
