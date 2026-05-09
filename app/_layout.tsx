import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import { BagelFatOne_400Regular } from '@expo-google-fonts/bagel-fat-one';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Colors } from '@/constants/theme';
import { useUserStore } from '@/store/useUserStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { ensureForegroundHandler, getPermissionStatus } from '@/lib/notifications';

// Install foreground notification handler at module load — needs to run
// before any notification arrives, including ones the OS shows on cold start.
if (Platform.OS !== 'web') {
  ensureForegroundHandler();
}

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    BagelFatOne_400Regular,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  const userHydrated = useUserStore((s) => s.hydrated);
  const settingsHydrated = useSettingsStore((s) => s.hydrated);
  const bootstrapAuth = useUserStore((s) => s.bootstrapAuth);
  const onboarded = useSettingsStore((s) => s.onboarded);
  const dailyReminderTime = useSettingsStore((s) => s.dailyReminderTime);
  const applyReminder = useSettingsStore((s) => s.applyReminder);
  const segments = useSegments();

  // On native, we wait for fonts + stores to hydrate before showing UI to
  // avoid flicker. On web, useFonts() never resolves reliably for some
  // setups, so we render unconditionally and let fonts swap in when ready.
  const ready = fontsLoaded && userHydrated && settingsHydrated;
  const stable = userHydrated && settingsHydrated; // good enough for routing

  useEffect(() => {
    if (userHydrated) {
      bootstrapAuth();
    }
  }, [userHydrated]);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  useEffect(() => {
    if (!stable) return;
    const inOnboarding = segments[0] === 'onboarding';
    if (!onboarded && !inOnboarding) {
      router.replace('/onboarding/welcome');
    }
  }, [stable, onboarded, segments]);

  // A3: re-apply the daily reminder once per launch. CALENDAR repeats means
  // the OS schedules the recurrence, but we still call applyReminder so a
  // fresh install or settings change gets the right time. Skip on web.
  useEffect(() => {
    if (!stable || Platform.OS === 'web') return;
    if (!dailyReminderTime) return;
    (async () => {
      const status = await getPermissionStatus();
      if (status === 'granted') {
        applyReminder().catch(() => {});
      }
    })();
  }, [stable]);

  // Don't gate render on fonts — let the Stack mount with system-font fallback
  // until @expo-google-fonts loads. Stores are local and rehydrate fast.

  // (LayoutAnimationConfig wrapper removed: it was wrapping everything and
  // suspected of intercepting/swallowing pointer events on web. MotionView
  // already handles the entering-animation problem at the component level,
  // so the global wrapper was redundant.)

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="dark" backgroundColor={Colors.bg} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="game/session"
          options={{
            animation: 'slide_from_bottom',
            presentation: 'card', // simpler on web; native still slides up
            gestureEnabled: false, // A12: prevent swipe-to-dismiss losing game state
          }}
        />
        <Stack.Screen
          name="auth/sign-in"
          options={{
            animation: 'slide_from_bottom',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="settings/reminder"
          options={{
            animation: 'slide_from_bottom',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="onboarding"
          options={{
            animation: 'fade',
            presentation: 'fullScreenModal',
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
});
