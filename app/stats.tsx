import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MotionView } from '@/components/MotionView';
import { Card } from '@/components/Card';
import { SectionHeader } from '@/components/SectionHeader';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { StreakHeatmap } from '@/components/charts/StreakHeatmap';
import { HighScoreBars } from '@/components/charts/HighScoreBars';
import { CategoryRadar } from '@/components/charts/CategoryRadar';
import { useUserStore } from '@/store/useUserStore';
import { usePersonalBestStore } from '@/store/usePersonalBestStore';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import { GAMES } from '@/constants/games';

export default function StatsScreen() {
  const streak = useUserStore((s) => s.streak);
  const profile = useUserStore((s) => s.profile);
  const bests = usePersonalBestStore((s) => s.bests);

  // Quick summary numbers
  const gamesWithBest = GAMES.filter((g) => (bests[g.id]?.bestScore ?? 0) > 0).length;
  const topScore = Math.max(0, ...GAMES.map((g) => bests[g.id]?.bestScore ?? 0));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AnimatedBackground intensity="subtle" />

      {/* Header */}
      <View style={styles.header}>
        {Platform.OS === 'web' ? (
          // eslint-disable-next-line jsx-a11y/control-has-associated-label
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              background: 'none',
              border: 'none',
              color: Colors.textSecondary,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            ← Back
          </button>
        ) : (
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.back}>← Back</Text>
          </Pressable>
        )}
        <Text style={styles.title}>Your stats</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Hero summary row */}
        <MotionView entering={FadeInDown.delay(0).springify()}>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryChip, { borderColor: Colors.primary }]}>
              <Text style={[styles.summaryNum, { color: Colors.primary }]}>{streak.current}</Text>
              <Text style={styles.summaryLbl}>day streak</Text>
            </View>
            <View style={[styles.summaryChip, { borderColor: Colors.gold }]}>
              <Text style={[styles.summaryNum, { color: Colors.gold }]}>{topScore > 0 ? topScore.toLocaleString() : '—'}</Text>
              <Text style={styles.summaryLbl}>top score</Text>
            </View>
            <View style={[styles.summaryChip, { borderColor: Colors.accent }]}>
              <Text style={[styles.summaryNum, { color: Colors.accent }]}>{gamesWithBest}/9</Text>
              <Text style={styles.summaryLbl}>games beaten</Text>
            </View>
          </View>
        </MotionView>

        {/* Streak heatmap */}
        <MotionView entering={FadeInDown.delay(60).springify()}>
          <SectionHeader title="Streak" />
          <Card>
            <StreakHeatmap
              current={streak.current}
              longest={streak.longest}
              lastPlayDate={streak.lastPlayDate}
            />
          </Card>
        </MotionView>

        {/* Category radar */}
        <MotionView entering={FadeInDown.delay(140).springify()}>
          <SectionHeader title="Brain Rush — by category" />
          <Card style={styles.radarCard}>
            <Text style={styles.radarHint}>
              Score strength across trivia categories
            </Text>
            <CategoryRadar />
          </Card>
        </MotionView>

        {/* High score bars */}
        <MotionView entering={FadeInDown.delay(220).springify()}>
          <SectionHeader title="All-time high scores" />
          <Card>
            <HighScoreBars />
          </Card>
        </MotionView>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  back: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  title: {
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    fontFamily: 'BricolageGrotesque_700Bold',
  },
  scroll: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  summaryChip: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  summaryNum: {
    fontSize: FontSize.xl,
    fontFamily: 'BricolageGrotesque_700Bold',
  },
  summaryLbl: {
    fontSize: 10,
    color: Colors.textMuted,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  radarCard: {
    alignItems: 'center',
    gap: 4,
  },
  radarHint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontFamily: 'PlusJakartaSans_400Regular',
    textAlign: 'center',
    marginBottom: 4,
  },
});
