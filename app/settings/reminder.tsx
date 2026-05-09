import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getPermissionStatus, requestPermission } from '@/lib/notifications';

const PRESETS = ['07:00', '09:00', '12:00', '17:00', '19:00', '21:00'];

export default function ReminderScreen() {
  const dailyReminderTime = useSettingsStore((s) => s.dailyReminderTime);
  const setDailyReminderTime = useSettingsStore((s) => s.setDailyReminderTime);
  const [pending, setPending] = useState<string | null>(dailyReminderTime);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (pending === null) {
        setDailyReminderTime(null);
        router.back();
        return;
      }
      const status = await getPermissionStatus();
      if (status === 'denied') {
        Alert.alert(
          'Notifications disabled',
          'Open Settings → Apps → BrainStreak → Notifications to allow reminders.'
        );
        setSaving(false);
        return;
      }
      if (status === 'undetermined') {
        const next = await requestPermission();
        if (next !== 'granted') {
          Alert.alert(
            'Reminder not set',
            'You can enable notifications later from Profile.'
          );
          setSaving(false);
          return;
        }
      }
      setDailyReminderTime(pending);
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Daily reminder</Text>
        <Text style={styles.subtitle}>
          One short nudge each day to keep your streak alive.
        </Text>

        <View style={styles.presetGrid}>
          {PRESETS.map((time) => {
            const isSelected = pending === time;
            return (
              <TouchableOpacity
                key={time}
                onPress={() => setPending(time)}
                style={[
                  styles.preset,
                  isSelected && styles.presetActive,
                ]}
              >
                <Text style={[styles.presetText, isSelected && styles.presetTextActive]}>
                  {time}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity onPress={() => setPending(null)} style={styles.disableRow}>
          <Text style={[styles.disableText, pending === null && styles.disableTextActive]}>
            {pending === null ? '✓ Reminders off' : 'Turn reminders off'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          We never notify on days you've already played.
        </Text>

        <Button
          label={saving ? 'Saving...' : 'Save'}
          onPress={handleSave}
          loading={saving}
          size="lg"
          style={{ marginTop: Spacing.lg }}
        />
        <TouchableOpacity onPress={() => router.back()} style={styles.cancelWrap}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: Spacing.lg, paddingTop: Spacing.xl },
  title: {
    fontSize: FontSize.xxxl,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_900Black',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    marginBottom: Spacing.lg,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  preset: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 16,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  presetActive: {
    backgroundColor: `${Colors.primary}25`,
    borderColor: Colors.primary,
  },
  presetText: {
    fontSize: FontSize.lg,
    fontFamily: 'Outfit_700Bold',
    color: Colors.textSecondary,
  },
  presetTextActive: { color: Colors.primaryLight },
  disableRow: {
    marginTop: Spacing.md,
    paddingVertical: 14,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  disableText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
  },
  disableTextActive: { color: Colors.danger },
  note: {
    marginTop: Spacing.md,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  cancelWrap: { marginTop: Spacing.md, alignItems: 'center' },
  cancelText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontFamily: 'Inter_400Regular',
  },
});
