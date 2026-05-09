import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '@/components/Card';
import { Colors, Spacing, FontSize, Radius, CATEGORIES } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { getLocalProfile } from '@/lib/storage';

interface LeaderEntry {
  username: string;
  score: number;
  category: string;
  questions_correct: number;
  questions_total: number;
  created_at: string;
  rank?: number;
}

type Period = 'daily' | 'weekly' | 'alltime';

const PERIOD_LABELS: Record<Period, string> = {
  daily: 'Today',
  weekly: 'This Week',
  alltime: 'All Time',
};

// Fallback mock data when Supabase is not configured
const MOCK_DATA: LeaderEntry[] = [
  { username: 'BrainMaster', score: 980, category: 'Science', questions_correct: 5, questions_total: 5, created_at: new Date().toISOString() },
  { username: 'QuizPro', score: 875, category: 'History', questions_correct: 5, questions_total: 5, created_at: new Date().toISOString() },
  { username: 'TechGeek', score: 750, category: 'Tech', questions_correct: 4, questions_total: 5, created_at: new Date().toISOString() },
  { username: 'SportsFan', score: 650, category: 'Sports', questions_correct: 4, questions_total: 5, created_at: new Date().toISOString() },
  { username: 'PopStar', score: 600, category: 'Pop', questions_correct: 4, questions_total: 5, created_at: new Date().toISOString() },
  { username: 'Newbie123', score: 400, category: 'Mixed', questions_correct: 3, questions_total: 5, created_at: new Date().toISOString() },
];

async function fetchLeaderboard(period: Period): Promise<LeaderEntry[]> {
  try {
    const now = new Date();
    let from: string | null = null;

    if (period === 'daily') {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    } else if (period === 'weekly') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      from = d.toISOString();
    }

    let query = supabase
      .from('scores')
      .select('username, score, category, questions_correct, questions_total, created_at')
      .order('score', { ascending: false })
      .limit(20);

    if (from) query = query.gte('created_at', from);

    const { data, error } = await query;
    if (error || !data?.length) throw new Error(error?.message ?? 'no data');

    return data.map((entry, i) => ({ ...entry, rank: i + 1 }));
  } catch {
    // Supabase not configured — show mock
    return MOCK_DATA.map((e, i) => ({ ...e, rank: i + 1 }));
  }
}

export default function LeaderboardScreen() {
  const [period, setPeriod] = useState<Period>('daily');
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myUsername, setMyUsername] = useState<string | null>(null);

  const load = async () => {
    const [data, profile] = await Promise.all([
      fetchLeaderboard(period),
      getLocalProfile(),
    ]);
    setEntries(data);
    setMyUsername(profile?.username ?? null);
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [period])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const getCategoryEmoji = (cat: string) => {
    const found = CATEGORIES.find((c) => c.label.toLowerCase() === cat.toLowerCase());
    return found?.emoji ?? '🎯';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={styles.scroll}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.springify()} style={styles.header}>
          <Text style={styles.title}>Leaderboard 🏆</Text>
        </Animated.View>

        {/* Period Selector */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.periodRow}>
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <View
              key={p}
              style={[styles.periodChip, period === p && styles.periodActive]}
            >
              <Text
                style={[styles.periodLabel, { color: period === p ? Colors.primary : Colors.textMuted }]}
                onPress={() => setPeriod(p)}
              >
                {PERIOD_LABELS[p]}
              </Text>
            </View>
          ))}
        </Animated.View>

        {/* Top 3 Podium */}
        {!loading && entries.length >= 3 && (
          <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.podium}>
            {/* 2nd */}
            <PodiumItem entry={entries[1]} rank={2} isMe={entries[1].username === myUsername} />
            {/* 1st */}
            <PodiumItem entry={entries[0]} rank={1} isMe={entries[0].username === myUsername} />
            {/* 3rd */}
            {entries[2] && <PodiumItem entry={entries[2]} rank={3} isMe={entries[2].username === myUsername} />}
          </Animated.View>
        )}

        {/* Full List */}
        {loading ? (
          <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />
        ) : (
          entries.slice(3).map((entry, i) => (
            <Animated.View key={`${entry.username}_${i}`} entering={FadeIn.delay(i * 50).springify()}>
              <LeaderRow
                entry={entry}
                rank={i + 4}
                isMe={entry.username === myUsername}
                emoji={getCategoryEmoji(entry.category)}
              />
            </Animated.View>
          ))
        )}

        {/* Supabase note */}
        <Animated.View entering={FadeIn.delay(300).springify()}>
          <Card style={styles.noteCard}>
            <Text style={styles.noteText}>
              🔗 Connect Supabase to see live global scores!{'\n'}
              Check README for setup instructions.
            </Text>
          </Card>
        </Animated.View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function PodiumItem({ entry, rank, isMe }: { entry: LeaderEntry; rank: number; isMe: boolean }) {
  const heights = { 1: 100, 2: 80, 3: 65 };
  const colors: Record<number, [string, string]> = {
    1: [Colors.gold, '#B45309'],
    2: ['#94A3B8', '#64748B'],
    3: ['#CD7F32', '#92400E'],
  };
  const emojis = { 1: '🥇', 2: '🥈', 3: '🥉' };

  return (
    <View style={[styles.podiumItem, rank === 1 && { marginTop: -20 }]}>
      <Text style={styles.podiumUsername} numberOfLines={1}>{entry.username}</Text>
      <Text style={styles.podiumScore}>{entry.score.toLocaleString()}</Text>
      <LinearGradient
        colors={colors[rank]}
        style={[styles.podiumBar, { height: heights[rank as keyof typeof heights] }]}
      >
        <Text style={styles.podiumEmoji}>{emojis[rank as keyof typeof emojis]}</Text>
      </LinearGradient>
    </View>
  );
}

function LeaderRow({
  entry,
  rank,
  isMe,
  emoji,
}: {
  entry: LeaderEntry;
  rank: number;
  isMe: boolean;
  emoji: string;
}) {
  return (
    <View style={[styles.row, isMe && styles.rowMe]}>
      <Text style={styles.rowRank}>#{rank}</Text>
      <Text style={styles.rowEmoji}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowUsername, isMe && { color: Colors.primaryLight }]}>
          {entry.username} {isMe ? '(You)' : ''}
        </Text>
        <Text style={styles.rowMeta}>
          {entry.questions_correct}/{entry.questions_total} correct · {entry.category}
        </Text>
      </View>
      <Text style={styles.rowScore}>{entry.score.toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  header: { marginBottom: Spacing.md },
  title: { fontSize: FontSize.xxxl, color: Colors.textPrimary, fontFamily: 'Outfit_900Black' },
  periodRow: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: 4,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  periodChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  periodActive: { backgroundColor: Colors.bgElevated },
  periodLabel: { fontSize: FontSize.sm, fontFamily: 'Outfit_700Bold' },
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  podiumItem: { flex: 1, alignItems: 'center', gap: 4 },
  podiumUsername: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
  },
  podiumScore: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
  },
  podiumBar: {
    width: '100%',
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumEmoji: { fontSize: 28 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rowMe: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}15` },
  rowRank: { width: 28, fontSize: FontSize.sm, color: Colors.textMuted, fontFamily: 'Outfit_700Bold' },
  rowEmoji: { fontSize: 18 },
  rowUsername: { fontSize: FontSize.md, color: Colors.textPrimary, fontFamily: 'Outfit_700Bold' },
  rowMeta: { fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: 'Inter_400Regular' },
  rowScore: { fontSize: FontSize.lg, color: Colors.gold, fontFamily: 'Outfit_900Black' },
  noteCard: { marginTop: Spacing.md },
  noteText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
    textAlign: 'center',
  },
});
