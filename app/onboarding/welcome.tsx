import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { Colors, Gradients, Spacing, FontSize, Shadow, Radius } from '@/constants/theme';

// Build timestamp baked into the bundle so the user can confirm they
// reloaded the new build. If they see today's date in the corner, the
// browser is on the fresh bundle.
const BUILD_STAMP = new Date().toISOString().slice(0, 16).replace('T', ' ');

export default function WelcomeScreen() {
  const [tapped, setTapped] = useState(0);

  // Continuously animate the brain emoji so the screen feels alive.
  const float = useSharedValue(0);
  React.useEffect(() => {
    float.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(12, { duration: 1400, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);
  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value }],
  }));

  // Button press: visible scale, count taps so the user can SEE clicks
  // are firing even before navigation completes.
  const pressScale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: pressScale.value }] }));
  const handleStart = () => {
    setTapped((n) => n + 1);
    pressScale.value = withSequence(
      withSpring(0.94, { damping: 10, stiffness: 320 }),
      withSpring(1, { damping: 10, stiffness: 320 })
    );
    console.log('[Welcome] Let’s go tapped, navigating to /onboarding/username');
    router.push('/onboarding/username');
  };

  return (
    <LinearGradient colors={Gradients.hero} style={styles.bg}>
      <SafeAreaView style={styles.container}>
        <Text style={styles.buildStamp}>BUILD {BUILD_STAMP}</Text>

        <View style={styles.body}>
          <Animated.View entering={FadeIn.duration(400)} style={floatStyle}>
            <Text style={styles.emoji}>🧠</Text>
          </Animated.View>
          <Text style={styles.title}>BrainStreak</Text>
          <Text style={styles.tagline}>
            60 seconds a day.{'\n'}Math, words, and the world.
          </Text>

          <View style={styles.points}>
            {[
              ['⚡', '5 questions, 15 seconds each'],
              ['🔥', 'Daily streak — don’t break it'],
              ['🏆', 'Math · English · GK rotates'],
            ].map(([emoji, text]) => (
              <View key={text} style={styles.point}>
                <Text style={styles.pointEmoji}>{emoji}</Text>
                <Text style={styles.pointText}>{text}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <Animated.View style={[pressStyle, Shadow.lg]}>
            <Pressable
              onPress={handleStart}
              style={({ pressed }) => [styles.cta, pressed && { opacity: 0.92 }]}
              android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
            >
              <LinearGradient
                colors={Gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaInner}
              >
                <Text style={styles.ctaText}>Let’s go 🚀</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
          {tapped > 0 && (
            <Text style={styles.debug}>tap registered #{tapped}</Text>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  container: { flex: 1 },
  buildStamp: {
    position: 'absolute',
    top: 8,
    right: 12,
    fontSize: 9,
    color: Colors.textMuted,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  emoji: { fontSize: 110 },
  title: {
    fontSize: 56,
    fontFamily: 'BagelFatOne_400Regular',
    color: Colors.textPrimary,
    letterSpacing: -1.5,
    marginTop: 4,
  },
  tagline: {
    fontSize: FontSize.lg,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 24,
  },
  points: {
    marginTop: Spacing.xl,
    gap: 14,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.xl,
  },
  point: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  pointEmoji: { fontSize: 24, width: 32 },
  pointText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  footer: { padding: Spacing.lg, paddingBottom: Spacing.xl, alignItems: 'center' },
  cta: {
    minWidth: 240,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  ctaInner: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: 'BagelFatOne_400Regular',
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  debug: {
    marginTop: 8,
    fontSize: 11,
    color: Colors.success,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
