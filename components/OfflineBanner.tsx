import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { Colors, Spacing, FontSize } from '@/constants/theme';
import { subscribe, fetchOnce, NetworkStatus } from '@/lib/network';
import { useUserStore } from '@/store/useUserStore';
import { MotionView } from '@/components/MotionView';

export function OfflineBanner() {
  const authState = useUserStore((s) => s.authState);
  const [status, setStatus] = useState<NetworkStatus>('unknown');

  useEffect(() => {
    fetchOnce().then(setStatus);
    const unsub = subscribe(setStatus);
    return unsub;
  }, []);

  if (authState !== 'authenticated') return null;
  if (status !== 'offline') return null;

  return (
    <MotionView entering={FadeInUp.duration(180)} exiting={FadeOutUp.duration(180)} style={styles.bar}>
      <Text style={styles.emoji}>📡</Text>
      <Text style={styles.text}>Offline — changes will sync when you reconnect</Text>
    </MotionView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    backgroundColor: Colors.bgElevated,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  emoji: { fontSize: 16 },
  text: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
  },
});
