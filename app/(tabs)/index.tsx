import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  FadeInDown,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StreakBadge, StreakPill } from '@/components/StreakBadge';
import { Card, StatCard } from '@/components/Card';
import { Colors, Gradients, Spacing, FontSize } from '@/constants/theme';
import {
  getStreakData,
  getLocalProfile,
  getHabits,
  hasPlayedToday,
  StreakData,
  LocalProfile,
  LocalHabit,
} from '@/lib/storage';
import { MOTIVATIONAL_QUOTES } from '@/constants/theme';

export default function HomeScreen() {
  const [streak, setStreak] = useState<StreakData>({ current: 0, longest: 0, lastPlayDate: null });
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [habits, setHabits] = useState<LocalHabit[]>([]);
  const [playedToday, setPlayedToday] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [quote] = useState(
    () => MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]
  );

  const headerScale = useSharedValue(0.9);
  const headerOpacity = useSharedValue(0);

  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: headerScale.value }],
    opacity: headerOpacity.value,
  }));

  const loadData = async () => {
    const [s, p, h, played] = await Promise.all([
      getStreakData(),
      getLocalProfile(),
      getHabits(),
      hasPlayedToday(),
    ]);
    setStreak(s);
    setProfile(p);
    setHabits(h);
    setPlayedToday(played);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
      headerScale.value = withSpring(1, { damping: 12, stiffness: 150 });
      headerOpacity.value = withTiming(1, { duration: 600 });
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const todayHabits = habits.filter((h) => h.completedToday).length;
  const level = profile?.level ?? 1;
  const xp = profile?.totalXP ?? 0;
  const xpForNext = Math.pow(level, 2) * 50;
  const xpProgress = Math.min(xp / xpForNext, 1);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={styles.scroll}
      >
        {/* Header */}
        <Animated.View style={[styles.header, headerStyle]}>
          <View>
            <Text style={styles.greeting}>Good {getTimeOfDay()} ✨</Text>
            <Text style={styles.username}>
              {profile?.username ?? 'BrainPlayer'}
            </Text>
          </View>
          <StreakPill streak={streak.current} />
        </Animated.View>

        {/* Hero Streak Card */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <LinearGradient
            colors={streak.current >= 7 ? Gradients.fire : Gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <StreakBadge streak={streak.current} size="lg" showLabel />
            <View style={styles.heroRight}>
              <Text style={styles.heroTitle}>
                {streak.current === 0
                  ? 'Start today! 🚀'
                  : playedToday
                  ? "Today's done! 🎉"
                  : "Don't break it! 💪"}
              </Text>
              <Text style={styles.heroSub}>
                Best: {streak.longest} {streak.longest === 1 ? 'day' : 'days'}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Quote Card */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Card style={styles.quoteCard}>
            <Text style={styles.quoteEmoji}>💡</Text>
            <Text style={styles.quoteText}>"{quote.text}"</Text>
            <Text style={styles.quoteAuthor}>— {quote.author}</Text>
          </Card>
        </Animated.View>

        {/* Stats Row */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.statsRow}>
            <StatCard label="Level" value={level} emoji="⚡" color={Colors.primaryLight} />
            <StatCard label="Total XP" value={xp.toLocaleString()} emoji="🧠" color={Colors.accent} />
            <StatCard label="Games" value={profile?.gamesPlayed ?? 0} emoji="🎮" color={Colors.gold} />
          </View>
        </Animated.View>

        {/* XP Progress */}
        <Animated.View entering={FadeInDown.delay(350).springify()}>
          <Card style={styles.xpCard}>
            <View style={styles.xpHeader}>
              <Text style={styles.xpLabel}>Level {level} → {level + 1}</Text>
              <Text style={styles.xpValue}>{xp} / {xpForNext} XP</Text>
            </View>
            <View style={styles.xpBarBg}>
              <Animated.View
                style={[
                  styles.xpBarFill,
                  { width: `${Math.round(xpProgress * 100)}%` },
                ]}
              />
            </View>
          </Card>
        </Animated.View>

        {/* Habits Summary */}
        <Animated.View entering={FadeInDown.delay(400).springify()}>
          <Text style={styles.sectionTitle}>Today's Habits</Text>
          <Card style={styles.habitSummary}>
            {habits.length === 0 ? (
              <Text style={styles.emptyText}>No habits yet. Add some in Habits tab! ✅</Text>
            ) : (
              <>
                <Text style={styles.habitCount}>
                  {todayHabits} / {habits.length} completed
                </Text>
                <View style={styles.habitPills}>
                  {habits.map((h) => (
                    <View
                      key={h.id}
                      style={[
                        styles.habitPill,
                        { borderColor: h.color, opacity: h.completedToday ? 1 : 0.4 },
                      ]}
                    >
                      <Text style={styles.habitPillEmoji}>{h.emoji}</Text>
                      <Text style={styles.habitPillText}>{h.title}</Text>
                      {h.completedToday && <Text style={{ fontSize: 12 }}>✅</Text>}
                    </View>
                  ))}
                </View>
              </>
            )}
          </Card>
        </Animated.View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  greeting: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
  },
  username: {
    fontSize: FontSize.xxl,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
  },
  heroCard: {
    borderRadius: 20,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  heroRight: { flex: 1 },
  heroTitle: {
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
  },
  heroSub: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  quoteCard: { marginBottom: Spacing.md, gap: 6 },
  quoteEmoji: { fontSize: 20 },
  quoteText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  quoteAuthor: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  xpCard: { marginBottom: Spacing.md, gap: 10 },
  xpHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  xpLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
  },
  xpValue: {
    fontSize: FontSize.sm,
    color: Colors.primaryLight,
    fontFamily: 'Outfit_700Bold',
  },
  xpBarBg: {
    height: 8,
    backgroundColor: Colors.bgOverlay,
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  habitSummary: { marginBottom: Spacing.md, gap: Spacing.sm },
  habitCount: {
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
  },
  habitPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  habitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: Colors.bgElevated,
  },
  habitPillEmoji: { fontSize: 14 },
  habitPillText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
});
