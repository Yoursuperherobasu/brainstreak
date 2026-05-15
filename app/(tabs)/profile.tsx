import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { useFocusEffect } from 'expo-router';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { RollingNumber } from '@/components/RollingNumber';
import { Card, StatCard } from '@/components/Card';
import { CountingNumber } from '@/components/CountingNumber';
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
import { ACHIEVEMENTS } from '@/lib/achievements';
import { useAchievementsStore } from '@/store/useAchievementsStore';
import { usePersonalBestStore } from '@/store/usePersonalBestStore';
import { GAMES } from '@/constants/games';

function BadgeItem({
  achievement,
  isUnlocked,
  isHighlight,
}: {
  achievement: { id: string; title: string; description: string };
  isUnlocked: boolean;
  isHighlight: boolean;
}) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (isHighlight) {
      scale.value = withSequence(
        withSpring(1.1, { damping: 8, stiffness: 200 }),
        withSpring(1, { damping: 12, stiffness: 180 })
      );
    }
  }, [isHighlight]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.badge,
        isUnlocked ? styles.badgeUnlocked : styles.badgeLocked,
        isHighlight && styles.badgeGlow,
        animStyle,
      ]}
    >
      <View style={[styles.badgeMark, { backgroundColor: isUnlocked ? Colors.primary : Colors.borderBright }]} />
      <Text style={[styles.badgeTitle, !isUnlocked && styles.badgeTitleLocked]} numberOfLines={1}>
        {achievement.title}
      </Text>
      <Text style={styles.badgeDesc} numberOfLines={2}>
        {achievement.description}
      </Text>
      <Text style={styles.badgeState}>{isUnlocked ? 'Unlocked' : 'Locked'}</Text>
    </Animated.View>
  );
}

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

  const unlocked = useAchievementsStore((s) => s.unlocked);

  const prevUnlockedRef = useRef<Set<string> | null>(null);
  const [newlyUnlocked, setNewlyUnlocked] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      const curr = new Set(unlocked);
      if (prevUnlockedRef.current == null) {
        // First focus: seed with current state; don't animate pre-existing unlocks.
        prevUnlockedRef.current = curr;
        return;
      }
      const fresh = new Set<string>();
      curr.forEach((id) => {
        if (!prevUnlockedRef.current!.has(id)) fresh.add(id);
      });
      if (fresh.size > 0) {
        setNewlyUnlocked(fresh);
        const t = setTimeout(() => setNewlyUnlocked(new Set()), 1400);
        prevUnlockedRef.current = curr;
        return () => clearTimeout(t);
      }
      prevUnlockedRef.current = curr;
    }, [unlocked])
  );

  const bests = usePersonalBestStore((s) => s.bests);

  const atRisk = isStreakAtRisk(streak, todayISO(), yesterdayISO());

  const xpForNext = getXPForNextLevel(profile.level);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AnimatedBackground intensity="subtle" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <MotionView entering={FadeInDown.springify()}>
          <LinearGradient colors={Gradients.primary} style={styles.heroCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profile.username.slice(0, 1).toUpperCase()}</Text>
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
                  <Text style={styles.saveTxt}>Save</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => { setDraftName(profile.username); setEditing(true); }}>
                <Text style={styles.heroName}>{profile.username}</Text>
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
            <View style={styles.streakLeft}>
              <RollingNumber value={streak.current} style={styles.streakBigNum} />
              <Text style={styles.streakUnit}>
                {streak.current === 0
                  ? 'Start your streak'
                  : atRisk
                  ? 'Play today to keep it'
                  : streak.current === 1 ? 'day streak' : 'day streak'}
              </Text>
            </View>
            <View style={styles.streakDivider} />
            <View style={styles.streakRight}>
              <Text style={styles.streakBestLabel}>Best streak</Text>
              <Text style={styles.streakBest}>{streak.longest} {streak.longest === 1 ? 'day' : 'days'}</Text>
              <Text style={styles.streakLast}>
                Last played: {streak.lastPlayDate ?? 'Never'}
              </Text>
            </View>
          </Card>
        </MotionView>

        {/* Sign-in CTA temporarily removed — app runs anonymous-only for now.
            Re-enable when cloud sync is ready to ship. */}

        <MotionView entering={FadeInDown.delay(160).springify()}>
          <SectionHeader title="Stats" />
          <View style={styles.statsRow}>
            <StatCard
              label="Level"
              value={<CountingNumber value={profile.level} style={styles.statValueText} />}
              color={Colors.primaryLight}
            />
            <StatCard
              label="Total XP"
              value={<CountingNumber value={profile.totalXP} style={styles.statValueText} />}
              color={Colors.accent}
            />
            <StatCard
              label="Games"
              value={<CountingNumber value={profile.gamesPlayed} style={styles.statValueText} />}
              color={Colors.gold}
            />
          </View>
        </MotionView>

        <MotionView entering={FadeInDown.delay(180).springify()}>
          <SectionHeader title="Personal bests" />
          <View style={styles.bestsGrid}>
            {GAMES.map((g) => {
              const b = bests[g.id];
              return (
                <View key={g.id} style={styles.bestCard}>
                  <View style={[styles.bestMarker, { backgroundColor: g.color }]} />
                  <Text style={styles.bestTitle} numberOfLines={1}>{g.title}</Text>
                  <Text style={styles.bestValue}>{b ? b.bestScore.toLocaleString() : '—'}</Text>
                </View>
              );
            })}
          </View>
        </MotionView>

        <MotionView entering={FadeInDown.delay(200).springify()}>
          <SectionHeader title="Badges" />
          <View style={styles.badgesGrid}>
            {ACHIEVEMENTS.map((a) => {
              const isUnlocked = unlocked.includes(a.id);
              return (
                <BadgeItem
                  key={a.id}
                  achievement={a}
                  isUnlocked={isUnlocked}
                  isHighlight={newlyUnlocked.has(a.id)}
                />
              );
            })}
          </View>
        </MotionView>

        <MotionView entering={FadeInDown.delay(240).springify()}>
          <SectionHeader title="Settings" />
          <SettingsRow
            kind="toggle"
            label="Sound effects"
            description="Tick, ding, buzz, fanfare"
            value={soundOn}
            onChange={setSoundOn}
          />
          <SettingsRow
            kind="toggle"
            label="Haptics"
            description="Vibration feedback on tap and answer"
            value={hapticsOn}
            onChange={setHapticsOn}
          />
          <SettingsRow
            kind="nav"
            label="Daily reminder"
            description="Pick a time that works for you"
            rightLabel={dailyReminderTime ?? 'Off'}
            onPress={() => router.push('/settings/reminder')}
          />
          {authState === 'authenticated' && (
            <SettingsRow
              kind="nav"
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
              ['Version', `v${Config.APP_VERSION}`],
              ['Questions', 'Math, English, GK + Open Trivia DB'],
              ['Sync', authState === 'authenticated' ? 'On' : 'Off (anonymous)'],
              ['Platform', 'Android'],
            ].map(([label, value]) => (
              <View key={label} style={styles.infoRow}>
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
    borderRadius: 16,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: {
    fontSize: FontSize.xxxl,
    color: '#FFFFFF',
    fontFamily: 'BricolageGrotesque_800ExtraBold',
  },
  heroName: {
    fontSize: FontSize.xxl,
    color: '#FFFFFF',
    fontFamily: 'BricolageGrotesque_700Bold',
  },
  heroLevel: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.78)',
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  heroXp: { width: '100%', gap: 6, marginTop: 6 },
  heroXpText: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.78)',
    fontFamily: 'PlusJakartaSans_400Regular',
    textAlign: 'center',
  },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameInput: {
    fontSize: FontSize.xl,
    color: '#FFFFFF',
    fontFamily: 'BricolageGrotesque_700Bold',
    borderBottomWidth: 2,
    borderBottomColor: Colors.primaryLight,
    minWidth: 150,
    textAlign: 'center',
    paddingVertical: 4,
  },
  saveBtn: {
    minWidth: 54,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveTxt: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  streakLeft: {
    minWidth: 90,
    alignItems: 'center',
    gap: 2,
  },
  streakBigNum: {
    fontSize: 44,
    lineHeight: 48,
    color: Colors.textPrimary,
    fontFamily: 'BagelFatOne_400Regular',
  },
  streakUnit: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    textAlign: 'center',
    maxWidth: 110,
  },
  streakDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  streakRight: { flex: 1, gap: 4 },
  streakBestLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  streakBest: {
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    fontFamily: 'BricolageGrotesque_700Bold',
  },
  streakLast: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontFamily: 'PlusJakartaSans_400Regular',
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
    fontFamily: 'BricolageGrotesque_700Bold',
    marginBottom: 2,
  },
  signInBody: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_400Regular',
    lineHeight: 16,
  },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  statValueText: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    fontFamily: 'BricolageGrotesque_700Bold',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  badge: {
    flexBasis: '31%',
    flexGrow: 1,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    gap: 4,
    minHeight: 110,
  },
  badgeUnlocked: {
    borderColor: Colors.primary,
  },
  badgeLocked: {
    borderColor: Colors.border,
    borderStyle: 'dashed',
    opacity: 0.6,
  },
  badgeGlow: {
    borderColor: Colors.gold,
    borderWidth: 2,
    shadowColor: Colors.gold,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  badgeMark: {
    width: 24,
    height: 3,
    borderRadius: 2,
    marginBottom: 4,
  },
  badgeTitle: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontFamily: 'BricolageGrotesque_700Bold',
  },
  badgeTitleLocked: {
    color: Colors.textSecondary,
  },
  badgeDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_400Regular',
    lineHeight: 14,
  },
  badgeState: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    marginTop: 'auto',
    letterSpacing: 0.5,
  },
  bestsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  bestCard: {
    flexBasis: '31%',
    flexGrow: 1,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  bestMarker: { width: 18, height: 3, borderRadius: 2 },
  bestTitle: { fontSize: FontSize.xs, color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_600SemiBold' },
  bestValue: { fontSize: FontSize.lg, color: Colors.textPrimary, fontFamily: 'BricolageGrotesque_800ExtraBold' },
  infoCard: { gap: 10, marginBottom: Spacing.md },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoLabel: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  infoValue: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontFamily: 'BricolageGrotesque_700Bold',
  },
});
