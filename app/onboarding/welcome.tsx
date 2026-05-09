import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Button } from '@/components/Button';
import { MotionView, MotionText } from '@/components/MotionView';
import { Colors, Gradients, Spacing, FontSize } from '@/constants/theme';

export default function WelcomeScreen() {
  return (
    <LinearGradient colors={Gradients.hero} style={styles.bg}>
      <SafeAreaView style={styles.container}>
        <View style={styles.body}>
          <MotionText entering={FadeIn.duration(400)} style={styles.emoji}>🧠</MotionText>
          <MotionText entering={FadeInDown.delay(150).springify()} style={styles.title}>
            BrainStreak
          </MotionText>
          <MotionText entering={FadeInDown.delay(250).springify()} style={styles.tagline}>
            Sharpen your brain in 60 seconds a day.
          </MotionText>

          <MotionView entering={FadeInDown.delay(400).springify()} style={styles.points}>
            {[
              ['⚡', '5 questions, 15 seconds each'],
              ['🔥', 'Build a streak by playing daily'],
              ['🏆', 'Level up across 6 categories'],
            ].map(([emoji, text]) => (
              <View key={text} style={styles.point}>
                <Text style={styles.pointEmoji}>{emoji}</Text>
                <Text style={styles.pointText}>{text}</Text>
              </View>
            ))}
          </MotionView>
        </View>

        <MotionView entering={FadeInDown.delay(550).springify()} style={styles.footer}>
          <Button
            label="Let's go 🚀"
            onPress={() => router.push('/onboarding/username')}
            size="lg"
          />
        </MotionView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  container: { flex: 1 },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  emoji: { fontSize: 96 },
  title: {
    fontSize: 56,
    fontFamily: 'Outfit_900Black',
    color: Colors.textPrimary,
    letterSpacing: -1.5,
    marginTop: 8,
  },
  tagline: {
    fontSize: FontSize.lg,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  points: {
    marginTop: Spacing.lg,
    gap: 12,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.lg,
  },
  point: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pointEmoji: { fontSize: 22, width: 32 },
  pointText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontFamily: 'Inter_400Regular',
  },
  footer: { padding: Spacing.lg, paddingBottom: Spacing.xl },
});
