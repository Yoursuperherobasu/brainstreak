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
    letterSpacing: 0,
  },
  h1: {
    fontFamily: Fonts.headingExtraBold,
    fontSize: FontSize.xxxl,
    color: Colors.textPrimary,
    letterSpacing: 0,
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
