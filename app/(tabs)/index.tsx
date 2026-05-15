import React, { useState, useCallback, useEffect } from 'react';
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
import { MotionView } from '@/components/MotionView';
import { Colors, Gradients, Spacing, FontSize, MOTIVATIONAL_QUOTES } from '@/constants/theme';
import { hasPlayedToday, getStreakData, isStreakAtRisk, todayISO, yesterdayISO, getRecentGames, RecentGame } from '@/lib/storage';
import { useUserStore } from '@/store/useUserStore';
import { getXPForNextLevel } from '@/lib/trivia';
import { ssrSafeRandomIndex, ssrSafeTimeOfDay } from '@/lib/ssrSafe';
import { DailyChallengeCard } from '@/components/DailyChallengeCard';

export default function HomeScreen() {
  const profile = useUserStore((s) => s.profile);
  const streak = useUserStore((s) => s.streak);
  const setStreak = useUserStore((s) => s.setStreak);

  const [playedToday, setPlayedToday] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [recent, setRecent] = useState<RecentGame[]>([]);
  // Deterministic during SSR/first paint; rotate to a real random quote after mount.
  const [quoteIdx, setQuoteIdx] = useState(0);
  useEffect(() => {
    setQuoteIdx(ssrSafeRandomIndex(MOTIVATIONAL_QUOTES.length));
  }, []);
  const quote = MOTIVATIONAL_QUOTES[quoteIdx];

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
    const [s, played, rg] = await Promise.all([
      getStreakData(),
      hasPlayedToday(),
      getRecentGames(),
    ]);
    setStreak(s);
    setPlayedToday(played);
    setRecent(rg);
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
    ? 'Start today'
    : playedToday
    ? "Today's round is done"
    : 'Keep the streak alive';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={styles.scroll}
      >
        <MotionView style={[styles.header, headerStyle]}>
          <View>
            <Text style={styles.greeting}>Good {ssrSafeTimeOfDay()}</Text>
            <Text style={styles.username}>{profile.username}</Text>
          </View>
          <StreakPill streak={streak.current} />
        </MotionView>

        <MotionView entering={FadeInDown.delay(75).springify()}>
          <DailyChallengeCard />
        </MotionView>

        <MotionView entering={FadeInDown.delay(100).springify()}>
          <LinearGradient
            colors={streak.current >= 7 ? Gradients.fire : Gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <StreakBadge
              streak={streak.current}
              size="lg"
              showLabel
              atRisk={isStreakAtRisk(streak, todayISO(), yesterdayISO())}
            />
            <View style={styles.heroRight}>
              <Text style={styles.heroTitle}>{heroLabel}</Text>
              <Text style={styles.heroSub}>
                Best: {streak.longest} {streak.longest === 1 ? 'day' : 'days'}
              </Text>
            </View>
          </LinearGradient>
        </MotionView>

        <MotionView entering={FadeInDown.delay(200).springify()}>
          <SectionHeader title="Your stats" />
          <View style={styles.statsRow}>
            <StatCard label="Level" value={profile.level} color={Colors.primaryLight} />
            <StatCard label="Total XP" value={profile.totalXP.toLocaleString()} color={Colors.accent} />
            <StatCard label="Games" value={profile.gamesPlayed} color={Colors.gold} />
          </View>
        </MotionView>

        <MotionView entering={FadeInDown.delay(250).springify()}>
          <Card style={styles.xpCard}>
            <XPBar level={profile.level} xp={profile.totalXP} xpForNext={xpForNext} />
          </Card>
        </MotionView>

        {recent.length > 0 && (
          <MotionView entering={FadeInDown.delay(300).springify()}>
            <SectionHeader title="Recent activity" />
            <Card style={styles.recentCard}>
              {recent.slice(0, 5).map((g) => {
                const accuracy = g.total > 0 ? Math.round((g.correct / g.total) * 100) : 0;
                return (
                  <View key={g.at} style={styles.recentRow}>
                    <Text style={styles.recentEmoji}>
                      {accuracy >= 80 ? 'A' : accuracy >= 60 ? 'B' : accuracy >= 40 ? 'C' : 'D'}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recentTitle}>
                        {g.category} · {g.correct}/{g.total} correct
                      </Text>
                      <Text style={styles.recentSub}>
                        {new Date(g.at).toLocaleDateString()} · {g.score.toLocaleString()} pts
                      </Text>
                    </View>
                    <Text style={styles.recentXP}>+{g.xp} XP</Text>
                  </View>
                );
              })}
            </Card>
          </MotionView>
        )}

        <MotionView entering={FadeInDown.delay(350).springify()}>
          <Card style={styles.quoteCard}>
            <Text style={styles.quoteText}>"{quote.text}"</Text>
            <Text style={styles.quoteAuthor}>— {quote.author}</Text>
          </Card>
        </MotionView>

        <MotionView entering={FadeInDown.delay(400).springify()} style={styles.ctaWrap}>
          <Button
            label={playedToday ? 'Play another round' : "Start today's game"}
            onPress={() => {
              router.push('/play');
            }}
            size="lg"
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  greeting: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  username: {
    fontSize: FontSize.xxl,
    color: Colors.textPrimary,
    fontFamily: 'BricolageGrotesque_700Bold',
  },
  heroCard: {
    borderRadius: 16,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  heroRight: { flex: 1 },
  heroTitle: {
    fontSize: FontSize.xl,
    color: '#FFFFFF',
    fontFamily: 'BricolageGrotesque_700Bold',
  },
  heroSub: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  xpCard: { marginBottom: Spacing.md },
  quoteCard: { marginBottom: Spacing.md, gap: 6 },
  quoteText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  quoteAuthor: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  ctaWrap: { marginTop: Spacing.sm },
  recentCard: { gap: 10, marginBottom: Spacing.md },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recentEmoji: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.bgElevated,
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontFamily: 'BricolageGrotesque_700Bold',
    textAlign: 'center',
    lineHeight: 28,
  },
  recentTitle: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  recentSub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontFamily: 'PlusJakartaSans_400Regular',
    marginTop: 1,
  },
  recentXP: {
    fontSize: FontSize.sm,
    color: Colors.gold,
    fontFamily: 'BricolageGrotesque_700Bold',
  },
});
