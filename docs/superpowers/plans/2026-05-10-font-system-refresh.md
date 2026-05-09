# Font System Refresh — Unique & Fun Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan inline. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic Outfit + Inter pairing with a distinctive trio that gives BrainStreak a hand-crafted, playful feel — Bricolage Grotesque (display headlines, character without losing legibility), Bagel Fat One (chunky-fun hero numbers and CTAs), and Plus Jakarta Sans (friendly rounded body).

**Architecture:** Three new Google-fonts packages installed via `@expo-google-fonts/*`. `useFonts()` in `app/_layout.tsx` loads all three. `constants/typography.ts` owns the named presets so screens never hardcode font strings — a single registry. Existing `fontFamily` references in screens are swept to the new names via targeted Edit calls. Dev server restarted on a fresh port for guaranteed cache bust.

**Tech Stack:** Expo SDK 54, expo-font, expo-router, @expo-google-fonts/{bricolage-grotesque, bagel-fat-one, plus-jakarta-sans}, TypeScript.

---

## File Map

**Files modified:**
- `package.json` — add three new font packages
- `app/_layout.tsx` — load new fonts via `useFonts`
- `constants/typography.ts` — new font presets per role (display / heading / body)
- `app/(tabs)/index.tsx` — sweep `fontFamily: 'Outfit_X'` / `'Inter_X'` → new families
- `app/(tabs)/play.tsx` — sweep
- `app/(tabs)/profile.tsx` — sweep
- `app/onboarding/welcome.tsx` — sweep
- `app/onboarding/username.tsx` — sweep
- `app/onboarding/sign-in-prompt.tsx` — sweep
- `app/auth/sign-in.tsx` — sweep
- `app/settings/reminder.tsx` — sweep
- `app/game/session.tsx` — sweep
- `components/AnswerButton.tsx`, `components/Button.tsx`, `components/CategoryTile.tsx`, `components/Card.tsx`, `components/QuestionCard.tsx`, `components/StreakBadge.tsx`, `components/SectionHeader.tsx`, `components/SettingsRow.tsx`, `components/TimerRing.tsx`, `components/XPBar.tsx`, `components/BubbleField.tsx`, `components/OfflineBanner.tsx` — sweep

**Files created:** none.

**Files deleted:** none. (Old Outfit + Inter packages stay installed in case any third-party dependency pulls them in; removing them is YAGNI right now.)

---

### Task 1: Install the three new Google Fonts packages

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install via npm**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && \
npm install --legacy-peer-deps \
  @expo-google-fonts/bricolage-grotesque \
  @expo-google-fonts/bagel-fat-one \
  @expo-google-fonts/plus-jakarta-sans
```

Expected: three packages added under `dependencies`, no errors. Peer warnings acceptable (we've been on `--legacy-peer-deps` throughout).

- [ ] **Step 2: Verify packages exist on disk**

Run:
```bash
ls /Users/basusingh/Desktop/Mob_App/node_modules/@expo-google-fonts/bricolage-grotesque/package.json \
   /Users/basusingh/Desktop/Mob_App/node_modules/@expo-google-fonts/bagel-fat-one/package.json \
   /Users/basusingh/Desktop/Mob_App/node_modules/@expo-google-fonts/plus-jakarta-sans/package.json
```

Expected: all three paths exist.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "Add Bricolage Grotesque, Bagel Fat One, Plus Jakarta Sans font packages"
```

---

### Task 2: Wire `useFonts` to load all three families

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Replace the font imports and the `useFonts()` call**

Open `app/_layout.tsx`. Find the existing import block:

```tsx
import { useFonts, Outfit_400Regular, Outfit_700Bold, Outfit_900Black } from '@expo-google-fonts/outfit';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
```

Replace with:

```tsx
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
```

Then find the existing `useFonts({ ... })` call:

```tsx
const [fontsLoaded] = useFonts({
  Outfit_400Regular,
  Outfit_700Bold,
  Outfit_900Black,
  Inter_400Regular,
  Inter_600SemiBold,
});
```

Replace with:

```tsx
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
```

- [ ] **Step 2: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors. (References to `'Outfit_X'` / `'Inter_X'` strings in screens still type-check because they're plain string literals — the actual font won't render until Task 4 swaps them, but the build won't break.)

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "Load Bricolage Grotesque, Bagel Fat One, Plus Jakarta Sans at app start"
```

---

### Task 3: Refresh `constants/typography.ts` with new presets

**Files:**
- Modify: `constants/typography.ts`

- [ ] **Step 1: Replace the file**

Replace the entire contents of `constants/typography.ts` with:

```ts
import { TextStyle } from 'react-native';
import { Colors, FontSize } from './theme';

// Named presets keyed by ROLE, not by font family. Screens reference
// Typography.hero / Typography.h1 / Typography.body etc., so any future
// font change ripples from here without touching screens.
//
// Trio:
//  - Bagel Fat One — chunky, friendly display weight for hero numbers,
//    streak counts, and the BrainStreak wordmark. One vibe per use.
//  - Bricolage Grotesque — variable grotesque with character; primary
//    headline + emphasis face. Bold by default, ExtraBold for impact.
//  - Plus Jakarta Sans — humanist, rounded body face. Reads well at
//    small sizes and pairs cleanly under Bricolage.

export const Fonts = {
  // Display — only for hero numerals, streak counters, BrainStreak logotype
  display: 'BagelFatOne_400Regular',

  // Heading — section titles, card titles, modal titles
  headingExtraBold: 'BricolageGrotesque_800ExtraBold',
  headingBold: 'BricolageGrotesque_700Bold',
  headingRegular: 'BricolageGrotesque_400Regular',

  // Body — paragraphs, labels, hints, button text where bold isn't called for
  body: 'PlusJakartaSans_400Regular',
  bodyMedium: 'PlusJakartaSans_500Medium',
  bodySemiBold: 'PlusJakartaSans_600SemiBold',
  bodyBold: 'PlusJakartaSans_700Bold',
} as const;

export const Typography: Record<string, TextStyle> = {
  hero: {
    fontFamily: Fonts.display,
    fontSize: FontSize.hero,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  h1: {
    fontFamily: Fonts.headingExtraBold,
    fontSize: FontSize.xxxl,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSize.xxl,
    color: Colors.textPrimary,
  },
  h3: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
  },
  body: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  bodyEmphasis: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  bodyBold: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  caption: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  number: {
    fontFamily: Fonts.display,
    color: Colors.textPrimary,
  },
};
```

- [ ] **Step 2: Verify type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add constants/typography.ts
git commit -m "Update Typography presets to Bricolage / Bagel / Jakarta trio"
```

---

### Task 4: Sweep all `fontFamily` strings across the codebase

This is a mechanical search-and-replace. Each old family maps to one new family per role:

| Old `fontFamily` value          | New `fontFamily` value                  | Why                                |
|---------------------------------|-----------------------------------------|------------------------------------|
| `'Outfit_900Black'`             | `'BagelFatOne_400Regular'`              | hero / streak numbers / logotype   |
| `'Outfit_700Bold'`              | `'BricolageGrotesque_700Bold'`          | headlines, card titles, CTAs       |
| `'Outfit_400Regular'`           | `'BricolageGrotesque_400Regular'`       | (rare) regular display weight      |
| `'Inter_600SemiBold'`           | `'PlusJakartaSans_600SemiBold'`         | emphasized body / labels           |
| `'Inter_400Regular'`            | `'PlusJakartaSans_400Regular'`          | body / hints                       |

**Files:**
- Modify (all in one task): every `.tsx` file under `app/` and `components/` that has a `fontFamily:` literal.

- [ ] **Step 1: List the files that contain old families**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && \
grep -rln "Outfit_\|Inter_400Regular\|Inter_600SemiBold" app components 2>&1 | sort
```

Expected: this prints every file we need to touch.

- [ ] **Step 2: Sweep — Outfit_900Black → BagelFatOne_400Regular**

For each file from Step 1 that contains `Outfit_900Black`, run a sed in-place replace:

```bash
cd /Users/basusingh/Desktop/Mob_App && \
grep -rl "Outfit_900Black" app components | \
  xargs sed -i '' "s/Outfit_900Black/BagelFatOne_400Regular/g"
```

Expected: command returns silently. Verify:

```bash
grep -rn "Outfit_900Black" app components
```
Expected: 0 hits.

- [ ] **Step 3: Sweep — Outfit_700Bold → BricolageGrotesque_700Bold**

```bash
cd /Users/basusingh/Desktop/Mob_App && \
grep -rl "Outfit_700Bold" app components | \
  xargs sed -i '' "s/Outfit_700Bold/BricolageGrotesque_700Bold/g"
```

Verify:
```bash
grep -rn "Outfit_700Bold" app components
```
Expected: 0 hits.

- [ ] **Step 4: Sweep — Outfit_400Regular → BricolageGrotesque_400Regular**

```bash
cd /Users/basusingh/Desktop/Mob_App && \
grep -rl "Outfit_400Regular" app components | \
  xargs sed -i '' "s/Outfit_400Regular/BricolageGrotesque_400Regular/g"
```

Verify:
```bash
grep -rn "Outfit_400Regular" app components
```
Expected: 0 hits.

- [ ] **Step 5: Sweep — Inter_600SemiBold → PlusJakartaSans_600SemiBold**

```bash
cd /Users/basusingh/Desktop/Mob_App && \
grep -rl "Inter_600SemiBold" app components | \
  xargs sed -i '' "s/Inter_600SemiBold/PlusJakartaSans_600SemiBold/g"
```

Verify:
```bash
grep -rn "Inter_600SemiBold" app components
```
Expected: 0 hits.

- [ ] **Step 6: Sweep — Inter_400Regular → PlusJakartaSans_400Regular**

```bash
cd /Users/basusingh/Desktop/Mob_App && \
grep -rl "Inter_400Regular" app components | \
  xargs sed -i '' "s/Inter_400Regular/PlusJakartaSans_400Regular/g"
```

Verify:
```bash
grep -rn "Inter_400Regular" app components
```
Expected: 0 hits.

- [ ] **Step 7: Final guard — no Outfit / Inter font strings remain in source**

```bash
cd /Users/basusingh/Desktop/Mob_App && \
grep -rn "Outfit_\|Inter_400Regular\|Inter_600SemiBold" app components
```

Expected: 0 hits. If any appear, either the file has a stray match (rare — `Outfit` could legitimately appear in a comment) or the sed missed something. Address any straggler with a one-shot Edit before moving on.

- [ ] **Step 8: Verify type-check + tests**

```bash
cd /Users/basusingh/Desktop/Mob_App && \
npx tsc --noEmit && npm test
```

Expected: 0 type errors; **73 / 73 tests pass** (the font change touches no logic, so test count is unchanged).

- [ ] **Step 9: Commit**

```bash
git add app components
git commit -m "Sweep fontFamily references to Bricolage / Bagel / Jakarta trio"
```

---

### Task 5: Verify the bundle picks up the new fonts

**Files:** none modified (verification only).

- [ ] **Step 1: Build the Android bundle**

```bash
cd /Users/basusingh/Desktop/Mob_App && \
npx expo export --platform android --output-dir .expo/font-check 2>&1 | tail -10
```

Expected: bundle exports without errors, size is comparable to the previous build (~4.9 MB hbc + a couple hundred KB of new font assets).

- [ ] **Step 2: Verify the new font files are bundled**

```bash
find /Users/basusingh/Desktop/Mob_App/.expo/font-check -name "*.ttf" 2>&1 | sort
```

Expected: at minimum, you should see the three new families' .ttf files (Bricolage, Bagel, Jakarta) plus the legacy Outfit / Inter (still installed but no longer referenced).

- [ ] **Step 3: Cleanup**

```bash
rm -rf /Users/basusingh/Desktop/Mob_App/.expo/font-check
```

---

### Task 6: Restart the dev session on a fresh port (cache-bust)

**Files:** none modified.

- [ ] **Step 1: Kill any running expo dev server**

```bash
pkill -9 -f "expo start" 2>&1; sleep 2
```

- [ ] **Step 2: Start a fresh server on port 8085**

(Different port from any prior session forces every browser cache to miss.)

```bash
cd /Users/basusingh/Desktop/Mob_App && \
npx expo start --web --port 8085 --clear
```

Run this in the background. Wait ~90 s for Metro to compile both `index.ts` (the web client bundle) and `node_modules/expo-router/node/render.js` (the SSR bundle).

- [ ] **Step 3: Sanity-check the SSR HTML uses the new font names**

After ~90 s:
```bash
curl -s http://localhost:8085 | grep -oE "BricolageGrotesque|BagelFatOne|PlusJakartaSans" | sort -u
```

Expected: prints all three font names. (They appear in the inline `react-native-stylesheet` block as `font-family: BricolageGrotesque_700Bold, ...`.)

- [ ] **Step 4: Tell the user to open a NEW incognito window at `http://localhost:8085`**

The visible change is unmistakable: hero numbers (streak count, XP totals, the countdown 3-2-1) are now chunky bagel-style; headings and CTA labels switch from Outfit to Bricolage Grotesque (more character, slight serif-ish flair on the strokes); body copy is Plus Jakarta Sans (rounder, friendlier than Inter). The whole UI should feel hand-crafted, not template-generic.

---

## Self-Review Notes

- **Spec coverage:** "change the font in the UI, make it unique and fun" → Tasks 1-4 install + sweep. "use the plugin skills" → using superpowers:writing-plans (this plan) + superpowers:executing-plans for execution per the handoff convention. "install and restart the session" → Task 1 installs, Task 6 restarts on port 8085. "intuitive" → typography presets (Task 3) are now keyed by role (hero / h1 / body) so future changes don't ripple into screens, and the trio is chosen to read well at every scale.
- **Placeholders:** none. Every step has a concrete shell command or code edit.
- **Type consistency:** `Typography.hero/h1/h2/h3/body/bodyEmphasis/bodyBold/caption/number` and `Fonts.display/headingExtraBold/headingBold/headingRegular/body/bodyMedium/bodySemiBold/bodyBold` are the public API; only Typography is consumed by screens (Fonts is reserved for direct fontFamily literals in places that already write fontFamily inline). All replacement font strings (`BagelFatOne_400Regular`, `BricolageGrotesque_700Bold`, `BricolageGrotesque_400Regular`, `PlusJakartaSans_600SemiBold`, `PlusJakartaSans_400Regular`) are exactly what `@expo-google-fonts/*` exports for the three packages.

---

## Plan Summary

6 tasks. Single goal: swap the generic Outfit + Inter pairing for a distinctive Bricolage Grotesque + Bagel Fat One + Plus Jakarta Sans trio. After execution, the app's typography reads as intentionally designed — not stock — without changing any layout or behavior.

After Task 6 the dev server is running on port 8085 and the user can open a fresh incognito window to see the new typography render.
