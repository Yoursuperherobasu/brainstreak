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

export default function WelcomeScreen() {
  const [tapped, setTapped] = useState(false);

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

  const handleStart = () => {
    if (tapped) return;
    setTapped(true);
    router.push('/onboarding/username');
  };

  return (
    <LinearGradient colors={Gradients.hero} style={styles.bg}>
      <SafeAreaView style={styles.container}>
        <View style={styles.body}>
          <Animated.View entering={FadeIn.duration(400)} style={floatStyle}>
            <View style={styles.brandMark}>
              <Text style={styles.brandLetter}>B</Text>
            </View>
          </Animated.View>
          <Text style={styles.title}>BrainStreak</Text>
          <Text style={styles.tagline}>
            60 seconds a day.{'\n'}Math, words, and the world.
          </Text>

          <View style={styles.points}>
            {[
              ['01', '5 questions, 15 seconds each'],
              ['02', 'Daily streaks without the clutter'],
              ['03', 'Math, English, and general knowledge'],
            ].map(([step, text]) => (
              <View key={text} style={styles.point}>
                <Text style={styles.pointStep}>{step}</Text>
                <Text style={styles.pointText}>{text}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <Button label="Get started" onPress={handleStart} size="lg" style={styles.cta} />
        </View>
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
  brandMark: {
    width: 108,
    height: 108,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLetter: {
    fontSize: 62,
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    color: '#FFFFFF',
  },
  title: {
    fontSize: 56,
    fontFamily: 'BagelFatOne_400Regular',
    color: Colors.textPrimary,
    letterSpacing: 0,
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
  pointStep: {
    width: 32,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontFamily: 'BricolageGrotesque_700Bold',
  },
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
});
