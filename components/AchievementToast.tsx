import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/constants/theme';
import { ACHIEVEMENTS } from '@/lib/achievements';

export function AchievementToast({ ids, onHide }: { ids: string[]; onHide: () => void }) {
  useEffect(() => {
    if (ids.length === 0) return;
    const t = setTimeout(onHide, 2400 + ids.length * 800);
    return () => clearTimeout(t);
  }, [ids]);

  if (ids.length === 0) return null;
  const first = ACHIEVEMENTS.find((a) => a.id === ids[0]);
  if (!first) return null;
  return (
    <Animated.View entering={FadeInUp} exiting={FadeOutDown} style={styles.toast}>
      <View style={styles.dot} />
      <View style={{ flex: 1 }}>
        <Text style={styles.tag}>UNLOCKED</Text>
        <Text style={styles.title}>{first.title}</Text>
        <Text style={styles.sub}>{first.description}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    bottom: Spacing.xl,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.lg,
  },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.accent },
  tag: {
    fontSize: FontSize.xs,
    color: Colors.accent,
    letterSpacing: 1,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  title: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontFamily: 'BricolageGrotesque_700Bold',
  },
  sub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
});
