import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/Button';
import { Card, StatCard } from '@/components/Card';
import { StreakBadge } from '@/components/StreakBadge';
import { Colors, Spacing, FontSize, Radius, Gradients } from '@/constants/theme';
import {
  getLocalProfile,
  getStreakData,
  saveLocalProfile,
  LocalProfile,
  StreakData,
} from '@/lib/storage';
import { getLevelFromXP, getXPForNextLevel } from '@/lib/trivia';

const BADGES = [
  { id: 'first_game', emoji: '🎮', label: 'First Game', desc: 'Play your first game', xpReq: 0 },
  { id: 'streak_3', emoji: '🔥', label: 'On Fire', desc: '3 day streak', xpReq: 30 },
  { id: 'streak_7', emoji: '💎', label: 'Diamond', desc: '7 day streak', xpReq: 70 },
  { id: 'xp_100', emoji: '⚡', label: 'Charged', desc: '100 XP earned', xpReq: 100 },
  { id: 'xp_500', emoji: '🧠', label: 'Big Brain', desc: '500 XP earned', xpReq: 500 },
  { id: 'xp_1000', emoji: '🏆', label: 'Champion', desc: '1000 XP earned', xpReq: 1000 },
  { id: 'perfect', emoji: '⭐', label: 'Perfect', desc: '5/5 correct', xpReq: 200 },
];

export default function ProfileScreen() {
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [streak, setStreak] = useState<StreakData>({ current: 0, longest: 0, lastPlayDate: null });
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');

  const loadData = async () => {
    const [p, s] = await Promise.all([getLocalProfile(), getStreakData()]);
    setProfile(p);
    setStreak(s);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const handleSaveName = async () => {
    if (!draftName.trim()) return;
    const p = profile ?? {
      userId: `local_${Date.now()}`,
      username: 'BrainPlayer',
      totalXP: 0,
      level: 1,
      gamesPlayed: 0,
    };
    const updated = { ...p, username: draftName.trim() };
    await saveLocalProfile(updated);
    setProfile(updated);
    setEditing(false);
  };

  const xp = profile?.totalXP ?? 0;
  const level = profile?.level ?? 1;
  const xpForNext = getXPForNextLevel(level);
  const xpProgress = Math.min(xp / xpForNext, 1);

  const earnedBadges = BADGES.filter((b) => xp >= b.xpReq || (b.id === 'first_game' && (profile?.gamesPlayed ?? 0) > 0));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <Animated.View entering={FadeInDown.springify()}>
          <LinearGradient colors={Gradients.primary} style={styles.heroCard}>
            {/* Avatar */}
            <View style={styles.avatar}>
              <Text style={styles.avatarEmoji}>🧠</Text>
            </View>

            {/* Name (editable) */}
            {editing ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.nameInput}
                  value={draftName}
                  onChangeText={setDraftName}
                  autoFocus
                  maxLength={20}
                  placeholder="Your name"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  onSubmitEditing={handleSaveName}
                />
                <TouchableOpacity onPress={handleSaveName} style={styles.saveBtn}>
                  <Text style={styles.saveTxt}>✓</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => { setDraftName(profile?.username ?? 'BrainPlayer'); setEditing(true); }}>
                <Text style={styles.heroName}>{profile?.username ?? 'BrainPlayer'} ✏️</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.heroLevel}>Level {level} Brain</Text>

            {/* XP Bar */}
            <View style={styles.xpBarBg}>
              <View style={[styles.xpBarFill, { width: `${Math.round(xpProgress * 100)}%` }]} />
            </View>
            <Text style={styles.xpText}>{xp} / {xpForNext} XP to Level {level + 1}</Text>
          </LinearGradient>
        </Animated.View>

        {/* Streak */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Card style={styles.streakCard}>
            <StreakBadge streak={streak.current} size="md" />
            <View style={styles.streakRight}>
              <Text style={styles.streakBestLabel}>Best Streak</Text>
              <Text style={styles.streakBest}>🏆 {streak.longest} days</Text>
              <Text style={styles.streakLast}>
                Last played: {streak.lastPlayDate ?? 'Never'}
              </Text>
            </View>
          </Card>
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <Text style={styles.sectionTitle}>Stats</Text>
          <View style={styles.statsRow}>
            <StatCard label="Level" value={level} emoji="⚡" color={Colors.primaryLight} />
            <StatCard label="Total XP" value={xp.toLocaleString()} emoji="🧠" color={Colors.accent} />
            <StatCard label="Games" value={profile?.gamesPlayed ?? 0} emoji="🎮" color={Colors.gold} />
          </View>
        </Animated.View>

        {/* Badges */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text style={styles.sectionTitle}>Badges</Text>
          <View style={styles.badgeGrid}>
            {BADGES.map((badge) => {
              const earned = earnedBadges.some((b) => b.id === badge.id);
              return (
                <View
                  key={badge.id}
                  style={[styles.badge, !earned && styles.badgeLocked]}
                >
                  <Text style={[styles.badgeEmoji, !earned && { opacity: 0.3 }]}>
                    {badge.emoji}
                  </Text>
                  <Text style={[styles.badgeLabel, !earned && { opacity: 0.3 }]}>
                    {badge.label}
                  </Text>
                  <Text style={styles.badgeDesc}>{badge.desc}</Text>
                  {!earned && (
                    <Text style={styles.badgeLockText}>🔒</Text>
                  )}
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* Settings */}
        <Animated.View entering={FadeInDown.delay(250).springify()}>
          <Text style={styles.sectionTitle}>App Info</Text>
          <Card style={styles.infoCard}>
            {[
              ['🧠', 'BrainStreak', 'v1.0.0'],
              ['🎮', 'Game Engine', 'Open Trivia DB'],
              ['☁️', 'Backend', 'Supabase'],
              ['📱', 'Platform', 'iOS · Android · Web'],
            ].map(([emoji, label, value]) => (
              <View key={label} style={styles.infoRow}>
                <Text style={styles.infoEmoji}>{emoji}</Text>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value}</Text>
              </View>
            ))}
          </Card>
        </Animated.View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  heroCard: {
    borderRadius: 24,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarEmoji: { fontSize: 44 },
  heroName: {
    fontSize: FontSize.xxl,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
  },
  heroLevel: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Inter_400Regular',
  },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameInput: {
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
    borderBottomWidth: 2,
    borderBottomColor: Colors.primaryLight,
    minWidth: 150,
    textAlign: 'center',
    paddingVertical: 4,
  },
  saveBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveTxt: { color: Colors.textPrimary, fontSize: 20, fontWeight: '700' },
  xpBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: Colors.goldLight,
    borderRadius: 4,
  },
  xpText: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Inter_400Regular',
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  streakRight: { flex: 1, gap: 4 },
  streakBestLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontFamily: 'Inter_600SemiBold',
  },
  streakBest: {
    fontSize: FontSize.xl,
    color: Colors.goldLight,
    fontFamily: 'Outfit_700Bold',
  },
  streakLast: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontFamily: 'Inter_400Regular',
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  badge: {
    width: '30%',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeLocked: { borderStyle: 'dashed' },
  badgeEmoji: { fontSize: 28 },
  badgeLabel: {
    fontSize: FontSize.xs,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
    textAlign: 'center',
  },
  badgeDesc: {
    fontSize: 9,
    color: Colors.textMuted,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
  badgeLockText: { fontSize: 12 },
  infoCard: { gap: 10, marginBottom: Spacing.md },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoEmoji: { fontSize: 18, width: 24 },
  infoLabel: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
  },
  infoValue: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
  },
});
