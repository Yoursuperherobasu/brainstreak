// BrainStreak — Color System, Theme & Design Tokens (light, playful)
//
// Design direction: Wordle / NYT Mini / Heads Up.
// White-cream background, single bold violet accent, generous whitespace,
// soft shadows instead of borders. Big editorial type. No dark gradients.

export const Colors = {
  // Brand Palette
  primary: '#7C3AED',       // Electric Violet
  primaryLight: '#A78BFA',  // Soft Lavender
  primaryDark: '#5B21B6',   // Deep Violet

  accent: '#06B6D4',        // Cyan
  accentLight: '#A5F3FC',   // Pale Cyan

  gold: '#F59E0B',          // Achievement Gold
  goldLight: '#FDE68A',     // Soft Gold

  danger: '#EF4444',        // Red
  dangerLight: '#FECACA',   // Soft Red

  success: '#10B981',       // Green
  successLight: '#A7F3D0',  // Soft Green

  // Neutrals (LIGHT THEME)
  bg: '#FAFAF7',            // Warm cream — main background
  bgCard: '#FFFFFF',        // White card surface
  bgElevated: '#F1F1ED',    // Slightly recessed surface (e.g. tab bar)
  bgOverlay: '#E9E9E4',     // Tracks/bars background

  // Text
  textPrimary: '#1A1A2E',   // Near-black ink
  textSecondary: '#4B4B5E', // Muted ink for sub-copy
  textMuted: '#8E8E9C',     // Hints / placeholders

  // Borders
  border: '#E5E5DF',        // Hairline divider
  borderBright: '#D4D4CC',  // Visible divider

  // Category Colors
  catScience: '#06B6D4',
  catHistory: '#F59E0B',
  catTech: '#7C3AED',
  catSports: '#10B981',
  catPop: '#EC4899',
  catMixed: '#6366F1',
};

// Gradients are now subtle on-light, not the dark navy showpieces.
export const Gradients = {
  primary: ['#7C3AED', '#A78BFA'] as const,
  accent: ['#06B6D4', '#67E8F9'] as const,
  gold: ['#F59E0B', '#FCD34D'] as const,
  hero: ['#FFFFFF', '#FAFAF7'] as const,
  card: ['#FFFFFF', '#F8F8F4'] as const,
  danger: ['#EF4444', '#F87171'] as const,
  success: ['#10B981', '#34D399'] as const,
  fire: ['#F97316', '#FB923C'] as const,
};

// Soft drop-shadow recipe for cards. RN style fragments — spread into style.
export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 6,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 26,
  full: 9999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  xxxl: 34,
  hero: 48,
};

export const CATEGORIES = [
  { id: 'mixed',   label: 'Mixed',   emoji: '🌀', color: Colors.catMixed,   apiId: 0 },
  { id: 'science', label: 'Science', emoji: '🔬', color: Colors.catScience, apiId: 17 },
  { id: 'history', label: 'History', emoji: '🏛️', color: Colors.catHistory, apiId: 23 },
  { id: 'tech',    label: 'Tech',    emoji: '💻', color: Colors.catTech,    apiId: 18 },
  { id: 'sports',  label: 'Sports',  emoji: '⚽', color: Colors.catSports,  apiId: 21 },
  { id: 'pop',     label: 'Pop',     emoji: '🎬', color: Colors.catPop,     apiId: 11 },
] as const;

export const MOTIVATIONAL_QUOTES = [
  { text: "The brain is a muscle. Flex it daily.", author: "BrainStreak" },
  { text: "Every question answered makes you sharper.", author: "BrainStreak" },
  { text: "Streaks aren't built in a day. But they break in one.", author: "BrainStreak" },
  { text: "Knowledge is the only treasure that grows when shared.", author: "Proverb" },
  { text: "Small daily improvements lead to stunning results.", author: "BrainStreak" },
  { text: "The more you know, the more you grow.", author: "BrainStreak" },
  { text: "Curiosity is the engine of achievement.", author: "BrainStreak" },
  { text: "Winners are people with definite purpose.", author: "BrainStreak" },
];
