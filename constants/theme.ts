// BrainStreak — Color System, Theme & Design Tokens

export const Colors = {
  // Brand Palette
  primary: '#7C3AED',       // Electric Violet
  primaryLight: '#A78BFA',  // Soft Lavender
  primaryDark: '#5B21B6',   // Deep Violet
  
  accent: '#06B6D4',        // Cyan
  accentLight: '#67E8F9',   // Light Cyan
  
  gold: '#F59E0B',          // Achievement Gold
  goldLight: '#FCD34D',     // Bright Gold
  
  danger: '#EF4444',        // Red
  dangerLight: '#FCA5A5',   // Light Red
  
  success: '#10B981',       // Green
  successLight: '#6EE7B7',  // Light Green

  // Neutrals (Dark Theme)
  bg: '#0A0A1A',            // Deep Navy Black
  bgCard: '#12122A',        // Card Background
  bgElevated: '#1A1A35',    // Elevated Surface
  bgOverlay: '#22224A',     // Overlay / Modal

  // Text
  textPrimary: '#F0F0FF',   // Near White
  textSecondary: '#A0A0C0', // Muted Purple-Grey
  textMuted: '#6060A0',     // Dimmed

  // Borders
  border: '#2A2A4A',        // Subtle border
  borderBright: '#4A4A7A',  // Visible border

  // Category Colors
  catScience: '#06B6D4',
  catHistory: '#F59E0B',
  catTech: '#7C3AED',
  catSports: '#10B981',
  catPop: '#EC4899',
  catMixed: '#6366F1',
};

export const Gradients = {
  primary: ['#7C3AED', '#5B21B6'] as const,
  accent: ['#06B6D4', '#0891B2'] as const,
  gold: ['#F59E0B', '#D97706'] as const,
  hero: ['#0A0A1A', '#1A0A3A'] as const,
  card: ['#12122A', '#1A1A35'] as const,
  danger: ['#EF4444', '#B91C1C'] as const,
  success: ['#10B981', '#059669'] as const,
  fire: ['#F97316', '#EF4444'] as const,
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
  lg: 16,
  xl: 24,
  full: 9999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  hero: 42,
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
