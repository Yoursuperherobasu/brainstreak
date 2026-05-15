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
import { View, StyleSheet, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Colors } from '@/constants/theme';
import { useUserStore } from '@/store/useUserStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { ensureForegroundHandler, getPermissionStatus } from '@/lib/notifications';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AchievementToast } from '@/components/AchievementToast';
import { useGameStore } from '@/store/useGameStore';

// Dev-only diagnostic instrumentation — captures every click, error,
// and unhandled rejection on web. Stripped entirely from production bundles
// (Metro's dead-code elimination drops the import + call when __DEV__ is false).
if (__DEV__) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@/lib/debug').installDebug();
}

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

  // Phase 6: pending achievement unlocks surface as a root-level floating toast
  // that overlays every screen (Stack, modals, etc).
  const pendingAchievementIds = useGameStore((s) => s.pendingAchievementIds);
  const clearPendingAchievements = useGameStore((s) => s.clearPendingAchievements);

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
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.root}>
      <StatusBar style="dark" backgroundColor={Colors.bg} />
      {/* On web, BrainStreak is a phone-shaped app. On wide viewports we
          center the content in a 480px-wide column so the layout doesn't
          stretch into a wall of whitespace on desktop. On native the
          wrapper is a no-op flex passthrough. */}
      <View style={styles.frame} pointerEvents="box-none">
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.bg },
          // Snappier than the 350ms default — feels more like a 2026 app.
          animationDuration: 220,
        }}
      >
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
          name="game/word-sprint"
          options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
        />
        <Stack.Screen
          name="game/number-sense"
          options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
        />
        <Stack.Screen
          name="game/memory-match"
          options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
        />
        <Stack.Screen
          name="game/reaction-tap"
          options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
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
        <Stack.Screen
          name="game/road-rush"
          options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
        />
        <Stack.Screen
          name="+not-found"
          options={{ title: 'Page not found' }}
        />
      </Stack>
      </View>
      <AchievementToast
        ids={pendingAchievementIds}
        onHide={clearPendingAchievements}
      />
    </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  frame: Platform.select({
    web: {
      flex: 1,
      width: '100%',
      maxWidth: 480,
      marginLeft: 'auto',
      marginRight: 'auto',
      backgroundColor: Colors.bg,
      // Side rails on wide viewports.
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: Colors.border,
    },
    default: { flex: 1, backgroundColor: Colors.bg },
  }) as any,
});
