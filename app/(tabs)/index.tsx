import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeInDown,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StreakBadge, StreakPill } from '@/components/StreakBadge';
import { Card, StatCard } from '@/components/Card';
import { XPBar } from '@/components/XPBar';
import { Button } from '@/components/Button';
import { SectionHeader } from '@/components/SectionHeader';
import { Colors, Gradients, Spacing, FontSize, MOTIVATIONAL_QUOTES } from '@/constants/theme';
import { hasPlayedToday, getStreakData } from '@/lib/storage';
import { useUserStore } from '@/store/useUserStore';
import { getXPForNextLevel } from '@/lib/trivia';

export default function HomeScreen() {
  const profile = useUserStore((s) => s.profile);
  const streak = useUserStore((s) => s.streak);
  const setStreak = useUserStore((s) => s.setStreak);

  const [playedToday, setPlayedToday] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [quote] = useState(
    () => MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]
  );

  // Start at the visible state so the header is rendered even if the
  // entrance animation never fires (e.g. on web). useFocusEffect below
  // animates from these values on native.
  const headerScale = useSharedValue(1);
  const headerOpacity = useSharedValue(1);

  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: headerScale.value }],
    opacity: headerOpacity.value,
  }));

  const refreshState = async () => {
    const [s, played] = await Promise.all([getStreakData(), hasPlayedToday()]);
    setStreak(s);
    setPlayedToday(played);
  };

  useFocusEffect(
    useCallback(() => {
      refreshState();
      headerScale.value = withSpring(1, { damping: 12, stiffness: 150 });
      headerOpacity.value = withTiming(1, { duration: 600 });
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshState();
    setRefreshing(false);
  };

  const xpForNext = getXPForNextLevel(profile.level);

  const heroLabel = streak.current === 0
    ? 'Start today! 🚀'
    : playedToday
    ? "Today's done! 🎉"
    : "Don't break it! 💪";

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={styles.scroll}
      >
        <Animated.View style={[styles.header, headerStyle]}>
          <View>
            <Text style={styles.greeting}>Good {getTimeOfDay()} ✨</Text>
            <Text style={styles.username}>{profile.username}</Text>
          </View>
          <StreakPill streak={streak.current} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <LinearGradient
            colors={streak.current >= 7 ? Gradients.fire : Gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <StreakBadge streak={streak.current} size="lg" showLabel />
            <View style={styles.heroRight}>
              <Text style={styles.heroTitle}>{heroLabel}</Text>
              <Text style={styles.heroSub}>
                Best: {streak.longest} {streak.longest === 1 ? 'day' : 'days'}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <SectionHeader title="Your stats" />
          <View style={styles.statsRow}>
            <StatCard label="Level" value={profile.level} emoji="⚡" color={Colors.primaryLight} />
            <StatCard label="Total XP" value={profile.totalXP.toLocaleString()} emoji="🧠" color={Colors.accent} />
            <StatCard label="Games" value={profile.gamesPlayed} emoji="🎮" color={Colors.gold} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(250).springify()}>
          <Card style={styles.xpCard}>
            <XPBar level={profile.level} xp={profile.totalXP} xpForNext={xpForNext} />
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Card style={styles.quoteCard}>
            <Text style={styles.quoteEmoji}>💡</Text>
            <Text style={styles.quoteText}>"{quote.text}"</Text>
            <Text style={styles.quoteAuthor}>— {quote.author}</Text>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(350).springify()} style={styles.ctaWrap}>
          <Button
            label={playedToday ? 'Play another round 🎮' : "Start today's game 🚀"}
            onPress={() => router.push('/(tabs)/play')}
            size="lg"
          />
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
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  xpCard: { marginBottom: Spacing.md },
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
  ctaWrap: { marginTop: Spacing.sm },
});
