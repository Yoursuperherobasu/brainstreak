import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/Button';
import { Colors, Gradients, Spacing, FontSize, Radius } from '@/constants/theme';
import { useSettingsStore } from '@/store/useSettingsStore';

export default function SignInPromptScreen() {
  const setOnboarded = useSettingsStore((s) => s.setOnboarded);

  const finish = (next: 'sign-in' | 'home') => {
    setOnboarded(true);
    if (next === 'sign-in') {
      router.replace('/auth/sign-in');
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.body}>
        <Animated.View entering={FadeInDown.springify()}>
          <Text style={styles.step}>Step 3 of 3</Text>
          <Text style={styles.title}>Sync across devices?</Text>
          <Text style={styles.subtitle}>
            Optional. Sign in to keep your XP, streak, and level safe on every device.
          </Text>

          <LinearGradient colors={Gradients.primary} style={styles.benefitCard}>
            {[
              ['☁️', 'Your progress in the cloud'],
              ['📱', 'Pick up where you left off on any phone'],
              ['🔒', 'Email + password only — no tracking'],
            ].map(([emoji, text]) => (
              <View key={text} style={styles.benefit}>
                <Text style={styles.benefitEmoji}>{emoji}</Text>
                <Text style={styles.benefitText}>{text}</Text>
              </View>
            ))}
          </LinearGradient>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <Button label="Sign me in" onPress={() => finish('sign-in')} size="lg" />
        <TouchableOpacity onPress={() => finish('home')} style={styles.skipWrap}>
          <Text style={styles.skipText}>Maybe later — start playing</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  body: { flex: 1, padding: Spacing.lg, paddingTop: Spacing.xl },
  step: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  title: {
    fontSize: FontSize.xxxl,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_900Black',
    letterSpacing: -0.5,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  benefitCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitEmoji: { fontSize: 22, width: 32 },
  benefitText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontFamily: 'Inter_400Regular',
  },
  footer: { padding: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.md },
  skipWrap: { alignItems: 'center', paddingVertical: 6 },
  skipText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontFamily: 'Inter_400Regular',
  },
});
