// BrainStreak — Color System, Theme & Design Tokens (light, playful)
//
// Design direction: Wordle / NYT Mini / Heads Up.
// White-cream background, single bold violet accent, generous whitespace,
// soft shadows instead of borders. Big editorial type. No dark gradients.

export const Colors = {
  // Brand Palette — warm coral primary, sand accents
  primary: '#E85D40',       // Warm coral (was electric violet)
  primaryLight: '#F4836B',  // Soft coral
  primaryDark: '#C44A30',   // Deep coral

  accent: '#3B7A8D',        // Muted teal — pairs with coral
  accentLight: '#85C1CE',   // Pale teal

  gold: '#D4A017',          // Honey gold (warmer than amber)
  goldLight: '#F4D673',     // Soft honey

  danger: '#C84441',        // Brick red
  dangerLight: '#F5C9C7',   // Soft brick

  success: '#5C9E5E',       // Sage green
  successLight: '#B5D9B5',  // Soft sage

  // Neutrals — warm off-white / brownish paper
  bg: '#F4ECE0',            // Warm sand background
  bgCard: '#FBF5EA',        // Cream paper card
  bgElevated: '#EBE0CE',    // Recessed surface (tab bar)
  bgOverlay: '#DBCDB6',     // Tracks/bars background

  // Text — warm brown ink, not black
  textPrimary: '#3D2914',   // Rich espresso brown
  textSecondary: '#6B523A', // Coffee brown
  textMuted: '#9C8770',     // Muted tan

  // Borders
  border: '#E0D2BC',        // Hairline divider
  borderBright: '#C9B89A',  // Visible divider

  // Category Colors — distinct hues that all sit on warm cream
  catMath:    '#E85D40',  // coral
  catEnglish: '#3B7A8D',  // teal
  catGK:      '#D4A017',  // honey
  catScience: '#3B7A8D',
  catHistory: '#D4A017',
  catTech:    '#7E5DB0',  // muted plum
  catSports:  '#5C9E5E',
  catPop:     '#D86CB7',  // dusty rose
  catMixed:   '#7E5DB0',
};

// Gradients tuned for the warm sand palette.
export const Gradients = {
  primary: ['#E85D40', '#F4836B'] as const,
  accent: ['#3B7A8D', '#85C1CE'] as const,
  gold: ['#D4A017', '#F4D673'] as const,
  hero: ['#FBF5EA', '#F4ECE0'] as const,
  card: ['#FFFFFF', '#FBF5EA'] as const,
  danger: ['#C84441', '#E08482'] as const,
  success: ['#5C9E5E', '#9DC89D'] as const,
  fire: ['#E85D40', '#F4A74A'] as const,
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
  // BrainRush — the new default. Math + English + GK, no network needed.
  { id: 'brain',   label: 'BrainRush', emoji: '🧠', color: Colors.primary,   apiId: -1 },
  { id: 'mixed',   label: 'Mixed',     emoji: '🌀', color: Colors.catMixed,   apiId: 0 },
  { id: 'science', label: 'Science',   emoji: '🔬', color: Colors.catScience, apiId: 17 },
  { id: 'history', label: 'History',   emoji: '🏛️', color: Colors.catHistory, apiId: 23 },
  { id: 'tech',    label: 'Tech',      emoji: '💻', color: Colors.catTech,    apiId: 18 },
  { id: 'pop',     label: 'Pop',       emoji: '🎬', color: Colors.catPop,     apiId: 11 },
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
