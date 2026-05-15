import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button } from '@/components/Button';
import { MotionView } from '@/components/MotionView';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import { useUserStore } from '@/store/useUserStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { DEFAULT_USERNAME } from '@/lib/storage';

export default function UsernameScreen() {
  const currentUsername = useUserStore((s) => s.profile.username);
  const setUsername = useUserStore((s) => s.setUsername);
  const setOnboarded = useSettingsStore((s) => s.setOnboarded);
  const [draft, setDraft] = useState(
    currentUsername === DEFAULT_USERNAME ? '' : currentUsername
  );

  // Sign-in step is hidden until cloud sync ships. After username we mark
  // the user onboarded and drop them straight on the Home tab.
  const handleNext = () => {
    const trimmed = draft.trim();
    if (trimmed) {
      setUsername(trimmed.slice(0, 20));
    }
    setOnboarded(true);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.body}>
          <MotionView entering={FadeInDown.springify()}>
            <Text style={styles.step}>Last step</Text>
            <Text style={styles.title}>Pick a username</Text>
            <Text style={styles.subtitle}>
              Just for you — it shows up on your profile.
            </Text>

            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Yourname"
              placeholderTextColor={Colors.textMuted}
              maxLength={20}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              style={styles.input}
            />
            <Text style={styles.hint}>
              {draft.length}/20 — leave blank to keep "{DEFAULT_USERNAME}"
            </Text>
          </MotionView>
        </View>

        <View style={styles.footer}>
          <Button label="Continue" onPress={handleNext} size="lg" />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  body: { flex: 1, padding: Spacing.lg, paddingTop: Spacing.xl },
  step: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    marginBottom: 4,
  },
  title: {
    fontSize: FontSize.xxxl,
    color: Colors.textPrimary,
    fontFamily: 'BagelFatOne_400Regular',
    letterSpacing: 0,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_400Regular',
    marginBottom: Spacing.lg,
  },
  input: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: 16,
    paddingHorizontal: 16,
    color: Colors.textPrimary,
    fontFamily: 'BricolageGrotesque_700Bold',
    fontSize: FontSize.xl,
  },
  hint: {
    marginTop: 6,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  footer: { padding: Spacing.lg, paddingBottom: Spacing.xl },
});
