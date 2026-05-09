import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { Button } from '@/components/Button';
import { Colors, Gradients, Spacing, FontSize } from '@/constants/theme';

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

  // Use the Button component (which renders a native HTML <button> on web).
  // We still increment a visible counter so the user can SEE the click
  // event firing even before navigation completes.
  const handleStart = () => {
    setTapped((n) => n + 1);
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
          <Button label="Let’s go 🚀" onPress={handleStart} size="lg" style={styles.cta} />
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
  },
  debug: {
    marginTop: 8,
    fontSize: 11,
    color: Colors.success,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
