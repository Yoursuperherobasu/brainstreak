import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, StatCard } from '@/components/Card';
import { StreakBadge } from '@/components/StreakBadge';
import { XPBar } from '@/components/XPBar';
import { SectionHeader } from '@/components/SectionHeader';
import { SettingsRow } from '@/components/SettingsRow';
import { MotionView } from '@/components/MotionView';
import { Button } from '@/components/Button';
import { Colors, Spacing, FontSize, Radius, Gradients } from '@/constants/theme';
import { Config } from '@/constants/config';
import { useUserStore } from '@/store/useUserStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getXPForNextLevel } from '@/lib/trivia';
import { signOut } from '@/lib/auth';
import { isStreakAtRisk, todayISO, yesterdayISO } from '@/lib/storage';

const BADGES = [
  { id: 'first_game', emoji: '🎮', label: 'First Game', desc: 'Play your first game', xpReq: 0 },
  { id: 'streak_3', emoji: '🔥', label: 'On Fire', desc: '3 day streak', xpReq: 30 },
  { id: 'streak_7', emoji: '💎', label: 'Diamond', desc: '7 day streak', xpReq: 70 },
  { id: 'xp_100', emoji: '⚡', label: 'Charged', desc: '100 XP earned', xpReq: 100 },
  { id: 'xp_500', emoji: '🧠', label: 'Big Brain', desc: '500 XP earned', xpReq: 500 },
  { id: 'xp_1000', emoji: '🏆', label: 'Champion', desc: '1000 XP earned', xpReq: 1000 },
];

export default function ProfileScreen() {
  const profile = useUserStore((s) => s.profile);
  const streak = useUserStore((s) => s.streak);
  const setUsername = useUserStore((s) => s.setUsername);
  const authState = useUserStore((s) => s.authState);
  const setAnonymous = useUserStore((s) => s.setAnonymous);

  const soundOn = useSettingsStore((s) => s.soundOn);
  const setSoundOn = useSettingsStore((s) => s.setSoundOn);
  const hapticsOn = useSettingsStore((s) => s.hapticsOn);
  const setHapticsOn = useSettingsStore((s) => s.setHapticsOn);
  const dailyReminderTime = useSettingsStore((s) => s.dailyReminderTime);

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');

  const handleSaveName = () => {
    const trimmed = draftName.trim();
    if (!trimmed) {
      setEditing(false);
      return;
    }
    setUsername(trimmed);
    setEditing(false);
  };

  // A5: signOut() result must be checked. If it fails, surface the error
  // and leave the user in the authenticated state so they aren't silently
  // re-authenticated by getCurrentSession() on the next launch.
  const handleSignOut = () => {
    Alert.alert(
      'Sign out',
      'Your local progress stays on this device. Sign in again to resume sync.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            const result = await signOut();
            if (!result.ok) {
              Alert.alert(
                'Sign out failed',
                result.error ?? 'Could not sign out. Check your connection and try again.'
              );
              return;
            }
            setAnonymous();
          },
        },
      ]
    );
  };

  const atRisk = isStreakAtRisk(streak, todayISO(), yesterdayISO());

  const xpForNext = getXPForNextLevel(profile.level);
  const earnedBadges = BADGES.filter(
    (b) => profile.totalXP >= b.xpReq || (b.id === 'first_game' && profile.gamesPlayed > 0)
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <MotionView entering={FadeInDown.springify()}>
          <LinearGradient colors={Gradients.primary} style={styles.heroCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarEmoji}>🧠</Text>
            </View>

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
              <TouchableOpacity onPress={() => { setDraftName(profile.username); setEditing(true); }}>
                <Text style={styles.heroName}>{profile.username} ✏️</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.heroLevel}>Level {profile.level} Brain</Text>

            <View style={styles.heroXp}>
              <XPBar level={profile.level} xp={profile.totalXP} xpForNext={xpForNext} showLabel={false} />
              <Text style={styles.heroXpText}>
                {profile.totalXP.toLocaleString()} / {xpForNext.toLocaleString()} XP to Level {profile.level + 1}
              </Text>
            </View>
          </LinearGradient>
        </MotionView>

        <MotionView entering={FadeInDown.delay(80).springify()}>
          <Card style={styles.streakCard}>
            <StreakBadge streak={streak.current} size="md" atRisk={atRisk} />
            <View style={styles.streakRight}>
              <Text style={styles.streakBestLabel}>Best streak</Text>
              <Text style={styles.streakBest}>🏆 {streak.longest} {streak.longest === 1 ? 'day' : 'days'}</Text>
              <Text style={styles.streakLast}>
                Last played: {streak.lastPlayDate ?? 'Never'}
              </Text>
            </View>
          </Card>
        </MotionView>

        {authState !== 'authenticated' && (
          <MotionView entering={FadeInDown.delay(120).springify()}>
            <Card style={styles.signInCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.signInTitle}>Sync across devices</Text>
                <Text style={styles.signInBody}>
                  Sign in to keep your XP, streak, and level safe on every device.
                </Text>
              </View>
              <Button
                label="Sign in"
                size="sm"
                onPress={() => router.push('/auth/sign-in')}
              />
            </Card>
          </MotionView>
        )}

        <MotionView entering={FadeInDown.delay(160).springify()}>
          <SectionHeader title="Stats" />
          <View style={styles.statsRow}>
            <StatCard label="Level" value={profile.level} emoji="⚡" color={Colors.primaryLight} />
            <StatCard label="Total XP" value={profile.totalXP.toLocaleString()} emoji="🧠" color={Colors.accent} />
            <StatCard label="Games" value={profile.gamesPlayed} emoji="🎮" color={Colors.gold} />
          </View>
        </MotionView>

        <MotionView entering={FadeInDown.delay(200).springify()}>
          <SectionHeader title="Badges" />
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
                  {!earned && <Text style={styles.badgeLockText}>🔒</Text>}
                </View>
              );
            })}
          </View>
        </MotionView>

        <MotionView entering={FadeInDown.delay(240).springify()}>
          <SectionHeader title="Settings" />
          <SettingsRow
            kind="toggle"
            emoji="🔊"
            label="Sound effects"
            description="Tick, ding, buzz, fanfare"
            value={soundOn}
            onChange={setSoundOn}
          />
          <SettingsRow
            kind="toggle"
            emoji="📳"
            label="Haptics"
            description="Vibration feedback on tap and answer"
            value={hapticsOn}
            onChange={setHapticsOn}
          />
          <SettingsRow
            kind="nav"
            emoji="⏰"
            label="Daily reminder"
            description="Pick a time that works for you"
            rightLabel={dailyReminderTime ?? 'Off'}
            onPress={() => router.push('/settings/reminder')}
          />
          {authState === 'authenticated' && (
            <SettingsRow
              kind="nav"
              emoji="🚪"
              label="Sign out"
              description="Stop syncing on this device"
              onPress={handleSignOut}
            />
          )}
        </MotionView>

        <MotionView entering={FadeInDown.delay(280).springify()}>
          <SectionHeader title="App info" />
          <Card style={styles.infoCard}>
            {[
              ['🧠', 'Version', `v${Config.APP_VERSION}`],
              ['🎮', 'Questions', 'Open Trivia DB'],
              ['☁️', 'Sync', authState === 'authenticated' ? 'On' : 'Off (anonymous)'],
              ['📱', 'Platform', 'Android'],
            ].map(([emoji, label, value]) => (
              <View key={label} style={styles.infoRow}>
                <Text style={styles.infoEmoji}>{emoji}</Text>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value}</Text>
              </View>
            ))}
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
  heroXp: { width: '100%', gap: 6, marginTop: 6 },
  heroXpText: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
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
  signInCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  signInTitle: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
    marginBottom: 2,
  },
  signInBody: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    lineHeight: 16,
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
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
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
