# BrainStreak Phase 3 — Home / Play / Profile Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a cohesive, distinctive visual direction via the **frontend-design** skill, then rebuild the three main tab screens (Home, Play, Profile) against that direction. Wire screens to the persisted `useUserStore` and `useSettingsStore` (no more direct AsyncStorage reads in screens). Add a sign-in CTA stub that Phase 4 fills in.

**Architecture:** A frontend-design subagent generates an HTML reference mockup at `docs/superpowers/mockups/2026-05-09-screens.html`. That reference is a visual brief — we translate look and feel to React Native, we do not port HTML. New presentational components stay small and focused: `SettingsRow`, `SectionHeader`, `CategoryTile`. Screens read from Zustand stores rather than calling storage helpers directly.

**Tech Stack:** Expo SDK 54, React Native 0.81, Reanimated 3, expo-router 55, expo-linear-gradient, Zustand 5 with persist.

---

## File Map

**Files created in this phase:**
- `components/SettingsRow.tsx` — toggle / chevron row for Profile settings
- `components/SectionHeader.tsx` — uniform section title with optional accessory
- `components/CategoryTile.tsx` — large visual category card for Play
- `app/auth/sign-in.tsx` — Phase 4 wires this; stub page now
- `docs/superpowers/mockups/2026-05-09-screens.html` — visual reference, not shipped

**Files modified in this phase:**
- `app/(tabs)/index.tsx` — Home: read from `useUserStore`, apply mockup direction
- `app/(tabs)/play.tsx` — Play: replace category chips with `CategoryTile` grid, apply direction
- `app/(tabs)/profile.tsx` — Profile: read from `useUserStore`, fix stale `userId` reference, add `SettingsRow` toggles for sound/haptics, add sign-in CTA, apply direction
- `app/_layout.tsx` — register `auth/sign-in` modal route

---

### Task 1: Generate frontend-design mockups for the three screens

**Files:**
- Create: `docs/superpowers/mockups/2026-05-09-screens.html` (reference only — not shipped to Play Store)

This task dispatches a `frontend-design` subagent to produce the visual direction. The output is HTML/CSS we use as a brief; downstream tasks translate the look and feel to React Native.

- [ ] **Step 1: Create the mockups directory**

Run:
```bash
mkdir -p /Users/basusingh/Desktop/Mob_App/docs/superpowers/mockups
```

- [ ] **Step 2: Dispatch a frontend-design subagent**

Spawn the agent with this brief (include verbatim — the agent has zero context):

```
Produce a single HTML file at docs/superpowers/mockups/2026-05-09-screens.html
containing high-fidelity mockups of three mobile-app screens for "BrainStreak,"
a daily trivia/streak game targeting Android. Do NOT use generic AI-template
aesthetics. Distinctive editorial direction.

Constraints:
- Dark theme. Background #0A0A1A. Card surfaces #12122A and #1A1A35.
- Brand color #7C3AED (violet) with #06B6D4 (cyan) and #F59E0B (gold) accents.
- Type: Outfit Black for hero numbers, Outfit Bold for headings, Inter for body.
- Use the streak flame as a recurring metaphor: fully lit when on streak, ember when at risk.
- Mobile viewport (390 x 844 each frame). Three frames side by side.

Screens to mock:
1. HOME — top bar with greeting + streak pill, hero card showing today's status
   (streak ring or flame, "Today's done" or "Don't break it"), level/XP bar,
   stat tiles (Level / Total XP / Games), motivational quote card, primary
   "Play now" CTA at the bottom.
2. PLAY — page title "Pick a category", a 2x3 grid of large category tiles
   (Mixed, Science, History, Tech, Sports, Pop Culture) — each with the
   category emoji on a colored gradient surface and a label. Below: difficulty
   selector (Mixed / Easy / Medium / Hard) as segmented control. Then a
   summary line + big "Start game" button.
3. PROFILE — avatar circle with brain emoji + editable username, level badge,
   prominent XP progress bar, streak summary card (current + longest), a
   "Sign in to sync" card with a primary button (Phase 4 wires it; visible
   now), settings list with toggles for Sound and Haptics, and an app-info
   block at the bottom.

For each screen, write the HTML inside a phone-frame div. Use real CSS, not
images. Aim for ~300-500 lines total. The file must open standalone in a
browser. Do NOT add a build step. Do NOT use frameworks. Plain HTML/CSS.

When done, output ONLY the file path. The downstream agent will translate
look-and-feel to React Native — they do not need to use your HTML directly.
```

If the frontend-design subagent is unavailable in this environment, fall back to creating a minimal reference doc by hand using the same content brief. The downstream tasks must still happen — they only need a visual brief, not pixel-perfect mockups.

- [ ] **Step 3: Confirm the file exists**

Run:
```bash
ls -la /Users/basusingh/Desktop/Mob_App/docs/superpowers/mockups/2026-05-09-screens.html
```

Expected: file exists, > 5 KB.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/mockups/2026-05-09-screens.html
git commit -m "Add frontend-design mockups for Home, Play, Profile (visual reference)"
```

---

### Task 2: Add components/SectionHeader.tsx

**Files:**
- Create: `components/SectionHeader.tsx`

- [ ] **Step 1: Create the component**

Create `components/SectionHeader.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, FontSize } from '@/constants/theme';

interface SectionHeaderProps {
  title: string;
  accessory?: { label: string; onPress: () => void };
  marginTop?: number;
}

export function SectionHeader({ title, accessory, marginTop }: SectionHeaderProps) {
  return (
    <View style={[styles.row, marginTop !== undefined && { marginTop }]}>
      <Text style={styles.title}>{title}</Text>
      {accessory && (
        <TouchableOpacity onPress={accessory.onPress}>
          <Text style={styles.accessory}>{accessory.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  title: {
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
  },
  accessory: {
    fontSize: FontSize.sm,
    color: Colors.primaryLight,
    fontFamily: 'Inter_600SemiBold',
  },
});
```

- [ ] **Step 2: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add components/SectionHeader.tsx
git commit -m "Add SectionHeader — uniform section title with optional accessory link"
```

---

### Task 3: Add components/SettingsRow.tsx

**Files:**
- Create: `components/SettingsRow.tsx`

- [ ] **Step 1: Create the component**

Create `components/SettingsRow.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

interface BaseProps {
  emoji: string;
  label: string;
  description?: string;
}

interface ToggleRowProps extends BaseProps {
  kind: 'toggle';
  value: boolean;
  onChange: (next: boolean) => void;
}

interface NavRowProps extends BaseProps {
  kind: 'nav';
  rightLabel?: string;
  onPress: () => void;
}

interface ValueRowProps extends BaseProps {
  kind: 'value';
  value: string;
}

type SettingsRowProps = ToggleRowProps | NavRowProps | ValueRowProps;

export function SettingsRow(props: SettingsRowProps) {
  const inner = (
    <View style={styles.row}>
      <Text style={styles.emoji}>{props.emoji}</Text>
      <View style={styles.textCol}>
        <Text style={styles.label}>{props.label}</Text>
        {props.description && <Text style={styles.description}>{props.description}</Text>}
      </View>
      {props.kind === 'toggle' && (
        <Switch
          value={props.value}
          onValueChange={(v) => {
            haptics.selection();
            props.onChange(v);
          }}
          trackColor={{ false: Colors.bgOverlay, true: Colors.primary }}
          thumbColor={props.value ? Colors.primaryLight : Colors.textMuted}
        />
      )}
      {props.kind === 'nav' && (
        <Text style={styles.navAccessory}>
          {props.rightLabel ? `${props.rightLabel}  ` : ''}›
        </Text>
      )}
      {props.kind === 'value' && <Text style={styles.value}>{props.value}</Text>}
    </View>
  );

  if (props.kind === 'nav') {
    return (
      <TouchableOpacity onPress={props.onPress} activeOpacity={0.7}>
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  emoji: { fontSize: 22, width: 28 },
  textCol: { flex: 1, gap: 2 },
  label: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontFamily: 'Inter_600SemiBold',
  },
  description: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontFamily: 'Inter_400Regular',
  },
  navAccessory: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    fontFamily: 'Outfit_700Bold',
  },
  value: {
    fontSize: FontSize.sm,
    color: Colors.primaryLight,
    fontFamily: 'Outfit_700Bold',
  },
});
```

- [ ] **Step 2: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add components/SettingsRow.tsx
git commit -m "Add SettingsRow — toggle/nav/value variants for Profile settings"
```

---

### Task 4: Add components/CategoryTile.tsx

**Files:**
- Create: `components/CategoryTile.tsx`

- [ ] **Step 1: Create the component**

Create `components/CategoryTile.tsx`:

```tsx
import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors, FontSize, Radius } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

interface CategoryTileProps {
  emoji: string;
  label: string;
  color: string;
  selected: boolean;
  onPress: () => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function CategoryTile({ emoji, label, color, selected, onPress }: CategoryTileProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.95, { damping: 12, stiffness: 300 }, () => {
      scale.value = withSpring(1, { damping: 12, stiffness: 300 });
    });
    haptics.selection();
    onPress();
  };

  // Gradient: deeper variant of the category color when selected, neutral otherwise.
  const gradient: [string, string] = selected
    ? [color, `${color}99`]
    : [Colors.bgCard, Colors.bgElevated];

  return (
    <AnimatedTouchable
      activeOpacity={0.9}
      onPress={handlePress}
      style={[
        styles.outer,
        animStyle,
        { borderColor: selected ? color : Colors.border },
      ]}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.inner}
      >
        <Text style={styles.emoji}>{emoji}</Text>
        <Text
          style={[
            styles.label,
            { color: selected ? Colors.textPrimary : Colors.textSecondary },
          ]}
        >
          {label}
        </Text>
      </LinearGradient>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    minWidth: '30%',
    aspectRatio: 1,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emoji: { fontSize: 38 },
  label: {
    fontSize: FontSize.md,
    fontFamily: 'Outfit_700Bold',
  },
});
```

- [ ] **Step 2: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add components/CategoryTile.tsx
git commit -m "Add CategoryTile — large visual category card with gradient surface"
```

---

### Task 5: Add app/auth/sign-in.tsx stub

**Files:**
- Create: `app/auth/sign-in.tsx`
- Modify: `app/_layout.tsx` — register the route

- [ ] **Step 1: Create the stub screen**

Create `app/auth/sign-in.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Colors, Spacing, FontSize } from '@/constants/theme';

export default function SignInScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.body}>
        <Text style={styles.emoji}>☁️</Text>
        <Text style={styles.title}>Sign in coming soon</Text>
        <Text style={styles.body_text}>
          Cross-device sync arrives in the next update. For now, your progress
          stays safe on this device.
        </Text>
        <Button label="Got it" onPress={() => router.back()} size="lg" style={styles.btn} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  emoji: { fontSize: 56 },
  title: {
    fontSize: FontSize.xxl,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
    textAlign: 'center',
  },
  body_text: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  btn: { minWidth: 160 },
});
```

- [ ] **Step 2: Register the route in app/_layout.tsx**

Open `app/_layout.tsx` and locate the `<Stack>` element. It currently looks like:

```tsx
<Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
  <Stack.Screen name="(tabs)" />
  <Stack.Screen
    name="game/session"
    options={{
      animation: 'slide_from_bottom',
      presentation: 'fullScreenModal',
    }}
  />
</Stack>
```

Replace it with:

```tsx
<Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
  <Stack.Screen name="(tabs)" />
  <Stack.Screen
    name="game/session"
    options={{
      animation: 'slide_from_bottom',
      presentation: 'fullScreenModal',
    }}
  />
  <Stack.Screen
    name="auth/sign-in"
    options={{
      animation: 'slide_from_bottom',
      presentation: 'modal',
    }}
  />
</Stack>
```

- [ ] **Step 3: Verify type-check and tests**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit && npm test
```

Expected: 0 type errors; 31 tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/auth/sign-in.tsx app/_layout.tsx
git commit -m "Add sign-in stub screen and register modal route"
```

---

### Task 6: Refactor Home screen to use useUserStore

**Files:**
- Modify: `app/(tabs)/index.tsx`

The current Home screen reads from AsyncStorage on focus via `useFocusEffect` + `Promise.all`. After Phase 1 added `useUserStore`, the canonical source of truth is the store. Reading from the store also makes the UI reactive to changes from the game session without an explicit refresh.

- [ ] **Step 1: Replace contents of app/(tabs)/index.tsx**

Replace the entire contents of `app/(tabs)/index.tsx` with:

```tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeInDown,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StreakBadge, StreakPill } from '@/components/StreakBadge';
import { Card, StatCard } from '@/components/Card';
import { XPBar } from '@/components/XPBar';
import { Button } from '@/components/Button';
import { SectionHeader } from '@/components/SectionHeader';
import { Colors, Gradients, Spacing, FontSize, MOTIVATIONAL_QUOTES } from '@/constants/theme';
import { hasPlayedToday, getStreakData } from '@/lib/storage';
import { useUserStore } from '@/store/useUserStore';
import { getXPForNextLevel } from '@/lib/trivia';

export default function HomeScreen() {
  const profile = useUserStore((s) => s.profile);
  const streak = useUserStore((s) => s.streak);
  const setStreak = useUserStore((s) => s.setStreak);

  const [playedToday, setPlayedToday] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [quote] = useState(
    () => MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]
  );

  const headerScale = useSharedValue(0.9);
  const headerOpacity = useSharedValue(0);

  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: headerScale.value }],
    opacity: headerOpacity.value,
  }));

  const refreshState = async () => {
    const [s, played] = await Promise.all([getStreakData(), hasPlayedToday()]);
    setStreak(s);
    setPlayedToday(played);
  };

  useFocusEffect(
    useCallback(() => {
      refreshState();
      headerScale.value = withSpring(1, { damping: 12, stiffness: 150 });
      headerOpacity.value = withTiming(1, { duration: 600 });
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshState();
    setRefreshing(false);
  };

  const xpForNext = getXPForNextLevel(profile.level);

  const heroLabel = streak.current === 0
    ? 'Start today! 🚀'
    : playedToday
    ? "Today's done! 🎉"
    : "Don't break it! 💪";

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={styles.scroll}
      >
        <Animated.View style={[styles.header, headerStyle]}>
          <View>
            <Text style={styles.greeting}>Good {getTimeOfDay()} ✨</Text>
            <Text style={styles.username}>{profile.username}</Text>
          </View>
          <StreakPill streak={streak.current} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <LinearGradient
            colors={streak.current >= 7 ? Gradients.fire : Gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <StreakBadge streak={streak.current} size="lg" showLabel />
            <View style={styles.heroRight}>
              <Text style={styles.heroTitle}>{heroLabel}</Text>
              <Text style={styles.heroSub}>
                Best: {streak.longest} {streak.longest === 1 ? 'day' : 'days'}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <SectionHeader title="Your stats" />
          <View style={styles.statsRow}>
            <StatCard label="Level" value={profile.level} emoji="⚡" color={Colors.primaryLight} />
            <StatCard label="Total XP" value={profile.totalXP.toLocaleString()} emoji="🧠" color={Colors.accent} />
            <StatCard label="Games" value={profile.gamesPlayed} emoji="🎮" color={Colors.gold} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(250).springify()}>
          <Card style={styles.xpCard}>
            <XPBar level={profile.level} xp={profile.totalXP} xpForNext={xpForNext} />
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Card style={styles.quoteCard}>
            <Text style={styles.quoteEmoji}>💡</Text>
            <Text style={styles.quoteText}>"{quote.text}"</Text>
            <Text style={styles.quoteAuthor}>— {quote.author}</Text>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(350).springify()} style={styles.ctaWrap}>
          <Button
            label={playedToday ? 'Play another round 🎮' : 'Start today\'s game 🚀'}
            onPress={() => router.push('/(tabs)/play')}
            size="lg"
          />
        </Animated.View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  greeting: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
  },
  username: {
    fontSize: FontSize.xxl,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
  },
  heroCard: {
    borderRadius: 20,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  heroRight: { flex: 1 },
  heroTitle: {
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
  },
  heroSub: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  xpCard: { marginBottom: Spacing.md },
  quoteCard: { marginBottom: Spacing.md, gap: 6 },
  quoteEmoji: { fontSize: 20 },
  quoteText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  quoteAuthor: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
  },
  ctaWrap: { marginTop: Spacing.sm },
});
```

- [ ] **Step 2: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(tabs\)/index.tsx
git commit -m "Refactor Home: read from useUserStore, add Play CTA, use XPBar and SectionHeader"
```

---

### Task 7: Refactor Play screen to use CategoryTile grid

**Files:**
- Modify: `app/(tabs)/play.tsx`

- [ ] **Step 1: Replace contents of app/(tabs)/play.tsx**

Replace the entire contents of `app/(tabs)/play.tsx` with:

```tsx
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
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CategoryTile } from '@/components/CategoryTile';
import { SectionHeader } from '@/components/SectionHeader';
import { Colors, Spacing, FontSize, CATEGORIES, Radius } from '@/constants/theme';
import { fetchTriviaQuestions } from '@/lib/trivia';
import { useGameStore } from '@/store/useGameStore';
import { Config } from '@/constants/config';

type Difficulty = 'any' | 'easy' | 'medium' | 'hard';

const DIFFICULTIES: { id: Difficulty; label: string; emoji: string; color: string }[] = [
  { id: 'any', label: 'Mixed', emoji: '🎲', color: Colors.primaryLight },
  { id: 'easy', label: 'Easy', emoji: '😊', color: Colors.success },
  { id: 'medium', label: 'Medium', emoji: '🤔', color: Colors.gold },
  { id: 'hard', label: 'Hard', emoji: '🔥', color: Colors.danger },
];

export default function PlayScreen() {
  const [selectedCategory, setSelectedCategory] = useState('mixed');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('any');
  const [loading, setLoading] = useState(false);
  const { startGame, consumePrefetched } = useGameStore();

  const handlePlay = async () => {
    setLoading(true);
    try {
      const prefetched = consumePrefetched();
      let questions = prefetched && prefetched.category === selectedCategory
        ? prefetched.questions
        : await fetchTriviaQuestions(Config.QUESTIONS_PER_GAME, selectedCategory, selectedDifficulty);

      if (!questions.length) {
        Alert.alert('Oops!', 'Could not load questions. Try again.');
        return;
      }
      startGame(questions, selectedCategory);
      router.push('/game/session');
    } catch {
      Alert.alert('Error', 'Something went wrong. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const selectedCat = CATEGORIES.find((c) => c.id === selectedCategory);
  const selectedDiff = DIFFICULTIES.find((d) => d.id === selectedDifficulty);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <Animated.View entering={FadeInDown.springify()} style={styles.header}>
          <Text style={styles.title}>Pick a category</Text>
          <Text style={styles.subtitle}>{Config.QUESTIONS_PER_GAME} questions · {Config.ROUND_TIME_SECONDS} seconds each</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <CategoryTile
                key={cat.id}
                emoji={cat.emoji}
                label={cat.label}
                color={cat.color}
                selected={selectedCategory === cat.id}
                onPress={() => setSelectedCategory(cat.id)}
              />
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <SectionHeader title="Difficulty" />
          <View style={styles.diffRow}>
            {DIFFICULTIES.map((d) => {
              const isSelected = selectedDifficulty === d.id;
              return (
                <TouchableOpacity
                  key={d.id}
                  onPress={() => setSelectedDifficulty(d.id)}
                  style={[
                    styles.diffChip,
                    { borderColor: isSelected ? d.color : Colors.border },
                    isSelected && { backgroundColor: `${d.color}20` },
                  ]}
                >
                  <Text style={styles.diffEmoji}>{d.emoji}</Text>
                  <Text
                    style={[
                      styles.diffLabel,
                      { color: isSelected ? d.color : Colors.textSecondary },
                    ]}
                  >
                    {d.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Card style={styles.howCard}>
            <Text style={styles.howTitle}>How to play</Text>
            {[
              ['⚡', 'Answer 5 questions as fast as you can'],
              ['⏱️', '15 seconds per question — speed = bonus points'],
              ['🔥', 'Play daily to build your streak'],
              ['🧠', 'Earn XP and level up your brain'],
            ].map(([emoji, text]) => (
              <View key={text} style={styles.howRow}>
                <Text style={styles.howEmoji}>{emoji}</Text>
                <Text style={styles.howText}>{text}</Text>
              </View>
            ))}
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(350).springify()}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.summaryCard}
          >
            <Text style={styles.summaryText}>
              {selectedCat?.emoji} {selectedCat?.label} · {selectedDiff?.label}
            </Text>
            <Text style={styles.summaryXP}>+up to 750 XP</Text>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).springify()}>
          <Button
            label={loading ? 'Loading...' : 'Start game 🚀'}
            onPress={handlePlay}
            loading={loading}
            size="lg"
            style={styles.playBtn}
          />
        </Animated.View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  header: { marginBottom: Spacing.md },
  title: {
    fontSize: FontSize.xxxl,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_900Black',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  diffRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  diffChip: {
    flex: 1,
    minWidth: 70,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 4,
  },
  diffEmoji: { fontSize: 20 },
  diffLabel: {
    fontSize: FontSize.xs,
    fontFamily: 'Outfit_700Bold',
  },
  howCard: { marginTop: Spacing.md, gap: 10 },
  howTitle: {
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
    marginBottom: 4,
  },
  howRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  howEmoji: { fontSize: 18, width: 26 },
  howText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
  },
  summaryCard: {
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
  },
  summaryXP: {
    fontSize: FontSize.sm,
    color: Colors.goldLight,
    fontFamily: 'Outfit_700Bold',
  },
  playBtn: { marginTop: Spacing.lg },
});
```

- [ ] **Step 2: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(tabs\)/play.tsx
git commit -m "Refactor Play: CategoryTile grid, consume prefetched questions, Config constants"
```

---

### Task 8: Refactor Profile screen

**Files:**
- Modify: `app/(tabs)/profile.tsx`

This screen needs four substantive changes: (1) read from `useUserStore` instead of AsyncStorage, (2) drop the stale `userId` reference (Phase 1 removed that field from `LocalProfile`), (3) add `SettingsRow` toggles for sound and haptics, (4) add a sign-in CTA card that routes to the stub created in Task 5.

- [ ] **Step 1: Replace contents of app/(tabs)/profile.tsx**

Replace the entire contents of `app/(tabs)/profile.tsx` with:

```tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, StatCard } from '@/components/Card';
import { StreakBadge } from '@/components/StreakBadge';
import { XPBar } from '@/components/XPBar';
import { SectionHeader } from '@/components/SectionHeader';
import { SettingsRow } from '@/components/SettingsRow';
import { Button } from '@/components/Button';
import { Colors, Spacing, FontSize, Radius, Gradients } from '@/constants/theme';
import { Config } from '@/constants/config';
import { useUserStore } from '@/store/useUserStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getXPForNextLevel } from '@/lib/trivia';

const BADGES = [
  { id: 'first_game', emoji: '🎮', label: 'First Game', desc: 'Play your first game', xpReq: 0 },
  { id: 'streak_3', emoji: '🔥', label: 'On Fire', desc: '3 day streak', xpReq: 30 },
  { id: 'streak_7', emoji: '💎', label: 'Diamond', desc: '7 day streak', xpReq: 70 },
  { id: 'xp_100', emoji: '⚡', label: 'Charged', desc: '100 XP earned', xpReq: 100 },
  { id: 'xp_500', emoji: '🧠', label: 'Big Brain', desc: '500 XP earned', xpReq: 500 },
  { id: 'xp_1000', emoji: '🏆', label: 'Champion', desc: '1000 XP earned', xpReq: 1000 },
];

export default function ProfileScreen() {
  const profile = useUserStore((s) => s.profile);
  const streak = useUserStore((s) => s.streak);
  const setUsername = useUserStore((s) => s.setUsername);
  const authState = useUserStore((s) => s.authState);

  const soundOn = useSettingsStore((s) => s.soundOn);
  const setSoundOn = useSettingsStore((s) => s.setSoundOn);
  const hapticsOn = useSettingsStore((s) => s.hapticsOn);
  const setHapticsOn = useSettingsStore((s) => s.setHapticsOn);

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');

  const handleSaveName = () => {
    const trimmed = draftName.trim();
    if (!trimmed) {
      setEditing(false);
      return;
    }
    setUsername(trimmed);
    setEditing(false);
  };

  const xpForNext = getXPForNextLevel(profile.level);
  const earnedBadges = BADGES.filter(
    (b) => profile.totalXP >= b.xpReq || (b.id === 'first_game' && profile.gamesPlayed > 0)
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Animated.View entering={FadeInDown.springify()}>
          <LinearGradient colors={Gradients.primary} style={styles.heroCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarEmoji}>🧠</Text>
            </View>

            {editing ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.nameInput}
                  value={draftName}
                  onChangeText={setDraftName}
                  autoFocus
                  maxLength={20}
                  placeholder="Your name"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  onSubmitEditing={handleSaveName}
                />
                <TouchableOpacity onPress={handleSaveName} style={styles.saveBtn}>
                  <Text style={styles.saveTxt}>✓</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => { setDraftName(profile.username); setEditing(true); }}>
                <Text style={styles.heroName}>{profile.username} ✏️</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.heroLevel}>Level {profile.level} Brain</Text>

            <View style={styles.heroXp}>
              <XPBar level={profile.level} xp={profile.totalXP} xpForNext={xpForNext} showLabel={false} />
              <Text style={styles.heroXpText}>
                {profile.totalXP.toLocaleString()} / {xpForNext.toLocaleString()} XP to Level {profile.level + 1}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <Card style={styles.streakCard}>
            <StreakBadge streak={streak.current} size="md" />
            <View style={styles.streakRight}>
              <Text style={styles.streakBestLabel}>Best streak</Text>
              <Text style={styles.streakBest}>🏆 {streak.longest} {streak.longest === 1 ? 'day' : 'days'}</Text>
              <Text style={styles.streakLast}>
                Last played: {streak.lastPlayDate ?? 'Never'}
              </Text>
            </View>
          </Card>
        </Animated.View>

        {authState !== 'authenticated' && (
          <Animated.View entering={FadeInDown.delay(120).springify()}>
            <Card style={styles.signInCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.signInTitle}>Sync across devices</Text>
                <Text style={styles.signInBody}>
                  Sign in to keep your XP, streak, and level safe on every device.
                </Text>
              </View>
              <Button
                label="Sign in"
                size="sm"
                onPress={() => router.push('/auth/sign-in')}
              />
            </Card>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(160).springify()}>
          <SectionHeader title="Stats" />
          <View style={styles.statsRow}>
            <StatCard label="Level" value={profile.level} emoji="⚡" color={Colors.primaryLight} />
            <StatCard label="Total XP" value={profile.totalXP.toLocaleString()} emoji="🧠" color={Colors.accent} />
            <StatCard label="Games" value={profile.gamesPlayed} emoji="🎮" color={Colors.gold} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <SectionHeader title="Badges" />
          <View style={styles.badgeGrid}>
            {BADGES.map((badge) => {
              const earned = earnedBadges.some((b) => b.id === badge.id);
              return (
                <View
                  key={badge.id}
                  style={[styles.badge, !earned && styles.badgeLocked]}
                >
                  <Text style={[styles.badgeEmoji, !earned && { opacity: 0.3 }]}>
                    {badge.emoji}
                  </Text>
                  <Text style={[styles.badgeLabel, !earned && { opacity: 0.3 }]}>
                    {badge.label}
                  </Text>
                  <Text style={styles.badgeDesc}>{badge.desc}</Text>
                  {!earned && <Text style={styles.badgeLockText}>🔒</Text>}
                </View>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(240).springify()}>
          <SectionHeader title="Settings" />
          <SettingsRow
            kind="toggle"
            emoji="🔊"
            label="Sound effects"
            description="Tick, ding, buzz, fanfare"
            value={soundOn}
            onChange={setSoundOn}
          />
          <SettingsRow
            kind="toggle"
            emoji="📳"
            label="Haptics"
            description="Vibration feedback on tap and answer"
            value={hapticsOn}
            onChange={setHapticsOn}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(280).springify()}>
          <SectionHeader title="App info" />
          <Card style={styles.infoCard}>
            {[
              ['🧠', 'Version', `v${Config.APP_VERSION}`],
              ['🎮', 'Questions', 'Open Trivia DB'],
              ['☁️', 'Sync', authState === 'authenticated' ? 'On' : 'Off (anonymous)'],
              ['📱', 'Platform', 'Android'],
            ].map(([emoji, label, value]) => (
              <View key={label} style={styles.infoRow}>
                <Text style={styles.infoEmoji}>{emoji}</Text>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value}</Text>
              </View>
            ))}
          </Card>
        </Animated.View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  heroCard: {
    borderRadius: 24,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarEmoji: { fontSize: 44 },
  heroName: {
    fontSize: FontSize.xxl,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
  },
  heroLevel: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Inter_400Regular',
  },
  heroXp: { width: '100%', gap: 6, marginTop: 6 },
  heroXpText: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameInput: {
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
    borderBottomWidth: 2,
    borderBottomColor: Colors.primaryLight,
    minWidth: 150,
    textAlign: 'center',
    paddingVertical: 4,
  },
  saveBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveTxt: { color: Colors.textPrimary, fontSize: 20, fontWeight: '700' },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  streakRight: { flex: 1, gap: 4 },
  streakBestLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontFamily: 'Inter_600SemiBold',
  },
  streakBest: {
    fontSize: FontSize.xl,
    color: Colors.goldLight,
    fontFamily: 'Outfit_700Bold',
  },
  streakLast: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontFamily: 'Inter_400Regular',
  },
  signInCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  signInTitle: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
    marginBottom: 2,
  },
  signInBody: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    lineHeight: 16,
  },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  badge: {
    width: '30%',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeLocked: { borderStyle: 'dashed' },
  badgeEmoji: { fontSize: 28 },
  badgeLabel: {
    fontSize: FontSize.xs,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
    textAlign: 'center',
  },
  badgeDesc: {
    fontSize: 9,
    color: Colors.textMuted,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
  badgeLockText: { fontSize: 12 },
  infoCard: { gap: 10, marginBottom: Spacing.md },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoEmoji: { fontSize: 18, width: 24 },
  infoLabel: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
  },
  infoValue: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
  },
});
```

- [ ] **Step 2: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors. (Specifically, the stale `userId` reference is gone.)

- [ ] **Step 3: Commit**

```bash
git add app/\(tabs\)/profile.tsx
git commit -m "Refactor Profile: useUserStore + useSettingsStore, sign-in CTA, settings toggles"
```

---

### Task 9: Final verification — bundle, tests, typecheck

**Files:** none modified.

- [ ] **Step 1: Type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Run the full test suite**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npm test
```

Expected: 31 tests pass (no new tests this phase — all changes are presentational).

- [ ] **Step 3: Confirm bundle**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx expo export --platform android --output-dir .expo/phase3-smoke 2>&1 | tail -10
```

Expected: bundle exports without errors. Then:

```bash
rm -rf /Users/basusingh/Desktop/Mob_App/.expo/phase3-smoke
```

- [ ] **Step 4: Confirm screens read from stores, not direct AsyncStorage**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && grep -rn "getLocalProfile\|saveLocalProfile" app/\(tabs\)/ 2>&1 | grep -v node_modules
```

Expected: 0 results in the tab screens. (`lib/storage.ts` still defines these for `useGameStore.finishGame()` and Phase 4 sync; only the screens should be off them.)

- [ ] **Step 5: Final commit if any cleanup**

```bash
cd /Users/basusingh/Desktop/Mob_App && git status
```

If anything is uncommitted from steps above, commit it:

```bash
git add -A
git commit -m "Phase 3 verification cleanup"
```

If clean, skip.

---

## Self-Review Notes

- **Spec coverage:** Phase 3 scope per spec section 15 = generate frontend-design mockups ✓ (Task 1), build Home/Play/Profile screens against the direction ✓ (Tasks 6/7/8). Spec section 4 IA: 3 tabs are already in place since Phase 1; this phase fills the screens. Spec section 11 polish — sign-in CTA in Profile ✓ (Task 8 + Task 5 stub). Settings toggles for sound and haptics ✓ (Task 8 uses SettingsRow). Username editing ✓ (Task 8).
- **Placeholders:** none. Every step has runnable code or commands. The frontend-design dispatch (Task 1) gives the subagent a complete content brief.
- **Type consistency:** `useUserStore` selectors used identically across Home and Profile (Tasks 6 and 8). `useSettingsStore` `soundOn`/`hapticsOn` getters and setters match the store defined in Phase 1. `getXPForNextLevel`, `getStreakData`, `hasPlayedToday` come from `@/lib/trivia` and `@/lib/storage` respectively, both already exported. `Config.QUESTIONS_PER_GAME`, `Config.ROUND_TIME_SECONDS`, `Config.APP_VERSION` defined in Phase 1's `constants/config.ts`. `SectionHeader` (Task 2), `SettingsRow` (Task 3), `CategoryTile` (Task 4) are all consumed in Tasks 6/7/8. `consumePrefetched` from `useGameStore` (added in Phase 2) is consumed in Task 7.

---

## Plan Summary

9 tasks. After Phase 3:
- Visual direction is locked (frontend-design mockups committed as reference).
- Three new presentational components (`SectionHeader`, `SettingsRow`, `CategoryTile`).
- Home reads from `useUserStore`, drives a primary Play CTA.
- Play uses `CategoryTile` grid and consumes prefetched questions when category matches.
- Profile reads from both stores, exposes Sound and Haptics toggles, surfaces a sign-in CTA, and the stale `userId` reference is gone.
- Sign-in route exists as a stub; Phase 4 fills it in.

Ready for Phase 4 (Auth + sync).
