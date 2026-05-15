import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
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
import { StreakPill } from '@/components/StreakBadge';
import { RollingNumber } from '@/components/RollingNumber';
import { Card, StatCard } from '@/components/Card';
import { XPBar } from '@/components/XPBar';
import { SectionHeader } from '@/components/SectionHeader';
import { MotionView } from '@/components/MotionView';
import { Colors, Gradients, Spacing, FontSize, Radius, MOTIVATIONAL_QUOTES } from '@/constants/theme';
import { hasPlayedToday, isStreakAtRisk, todayISO, yesterdayISO, getRecentGames, RecentGame } from '@/lib/storage';
import { useUserStore } from '@/store/useUserStore';
import { getXPForNextLevel } from '@/lib/trivia';
import { ssrSafeRandomIndex, ssrSafeTimeOfDay } from '@/lib/ssrSafe';
import { DailyChallengeCard } from '@/components/DailyChallengeCard';
import { SkeletonCard } from '@/components/SkeletonCard';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { HeroSheen } from '@/components/HeroSheen';
import { audio } from '@/lib/audio';
import { MINI_GAMES } from '@/constants/games';

export default function HomeScreen() {
  const profile = useUserStore((s) => s.profile);
  const streak = useUserStore((s) => s.streak);

  const [playedToday, setPlayedToday] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [recent, setRecent] = useState<RecentGame[] | null>(null);
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

  // Zustand owns the source of truth for streak + profile. Home just
  // refreshes the recent-games ring buffer (separate AsyncStorage key) and
  // re-evaluates the played-today flag against the in-memory streak.
  const refreshState = async () => {
    const rg = await getRecentGames();
    setRecent(rg);
    setPlayedToday(hasPlayedToday(streak));
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AnimatedBackground intensity="subtle" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={styles.scroll}
      >
        {/* 1. Greeting + StreakPill */}
        <MotionView style={[styles.header, headerStyle]}>
          <View>
            <Text style={styles.greeting}>Good {ssrSafeTimeOfDay()}</Text>
            <Text style={styles.username}>{profile.username}</Text>
          </View>
          <StreakPill streak={streak.current} />
        </MotionView>

        {/* 2. Brain Rush hero — limelight */}
        <MotionView entering={FadeInDown.delay(75).springify()}>
          <Pressable onPress={() => router.push('/play' as any)}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.brainRushHero}
            >
              <HeroSheen />
              <View style={styles.brainRushBody}>
                <Text style={styles.brainRushTag}>BRAIN RUSH — TODAY'S 5</Text>
                <Text style={styles.brainRushTitle}>{streak.current === 0 ? "Start your streak today" : playedToday ? "Today's round is done" : "Tap to play"}</Text>
                <Text style={styles.brainRushSub}>5 questions · 15s each · {streak.current} day streak</Text>
                <View style={styles.brainRushCta}>
                  <Text style={styles.brainRushCtaText}>{playedToday ? 'PLAY AGAIN' : 'TAP TO PLAY'}</Text>
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        </MotionView>

        {/* 3. Daily Challenge card */}
        <MotionView entering={FadeInDown.delay(125).springify()}>
          <DailyChallengeCard />
        </MotionView>

        {/* 4. Warmups mini-game horizontal rail */}
        <MotionView entering={FadeInDown.delay(175).springify()}>
          <SectionHeader title="Warmups" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.warmupsRail}>
            {MINI_GAMES.map((g) => (
              <Pressable
                key={g.id}
                onPress={() => router.push(g.path as any)}
                style={styles.warmupTile}
              >
                <View style={[styles.warmupMarker, { backgroundColor: g.color }]} />
                <Text style={styles.warmupTitle} numberOfLines={1}>{g.title}</Text>
                <Text style={styles.warmupSub} numberOfLines={1}>{g.sub}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </MotionView>

        {/* 5. Stats row */}
        <MotionView entering={FadeInDown.delay(200).springify()}>
          <SectionHeader title="Your stats" />
          <View style={styles.statsRow}>
            <StatCard label="Level" value={profile.level} color={Colors.primaryLight} />
            <StatCard label="Total XP" value={profile.totalXP.toLocaleString()} color={Colors.accent} />
            <StatCard label="Games" value={profile.gamesPlayed} color={Colors.gold} />
          </View>
        </MotionView>

        {/* 6. XP bar */}
        <MotionView entering={FadeInDown.delay(250).springify()}>
          <Card style={styles.xpCard}>
            <XPBar level={profile.level} xp={profile.totalXP} xpForNext={xpForNext} />
          </Card>
        </MotionView>

        {/* 7. Recent activity */}
        {recent === null && (
          <MotionView entering={FadeInDown.delay(300).springify()}>
            <SectionHeader title="Recent activity" />
            <SkeletonCard height={64} />
            <SkeletonCard height={64} />
            <SkeletonCard height={64} />
          </MotionView>
        )}

        {recent !== null && recent.length === 0 && (
          <MotionView entering={FadeInDown.delay(300).springify()}>
            <SectionHeader title="Recent activity" />
            <Card style={styles.recentEmptyCard}>
              <Text style={styles.recentEmptyTitle}>No rounds yet</Text>
              <Text style={styles.recentEmptySub}>
                Finish a quick round and your last 5 games show up here.
              </Text>
            </Card>
          </MotionView>
        )}

        {recent !== null && recent.length > 0 && (
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

        {/* 8. Motivational quote */}
        <MotionView entering={FadeInDown.delay(350).springify()}>
          <Card style={styles.quoteCard}>
            <Text style={styles.quoteText}>"{quote.text}"</Text>
            <Text style={styles.quoteAuthor}>— {quote.author}</Text>
          </Card>
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
  recentCard: { gap: 10, marginBottom: Spacing.md },
  recentEmptyCard: { gap: 6, marginBottom: Spacing.md, alignItems: 'flex-start' },
  recentEmptyTitle: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontFamily: 'BricolageGrotesque_700Bold',
  },
  recentEmptySub: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_400Regular',
    lineHeight: 20,
  },
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
  // Brain Rush hero
  brainRushHero: {
    borderRadius: 20,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 160,
  },
  brainRushBody: { gap: 6 },
  brainRushTag: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FontSize.xs,
    letterSpacing: 1.5,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  brainRushTitle: {
    color: '#FFFFFF',
    fontSize: FontSize.xxl,
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    lineHeight: FontSize.xxl + 4,
  },
  brainRushSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: FontSize.sm,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    marginTop: 2,
  },
  brainRushCta: {
    marginTop: Spacing.md,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderColor: 'rgba(255,255,255,0.35)',
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  brainRushCtaText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    letterSpacing: 1,
    fontFamily: 'BricolageGrotesque_800ExtraBold',
  },
  // Warmups rail
  warmupsRail: {
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  warmupTile: {
    width: 140,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  warmupMarker: {
    width: 24,
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  warmupTitle: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontFamily: 'BricolageGrotesque_700Bold',
  },
  warmupSub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
});
