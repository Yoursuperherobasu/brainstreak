// BrainStreak — Color System, Theme & Design Tokens

export const Colors = {
  primary: '#2F6FED',
  primaryLight: '#6EA1FF',
  primaryDark: '#1E4FA8',

  accent: '#169B8F',
  accentLight: '#7EDBD1',

  gold: '#D99921',
  goldLight: '#F2C86B',

  danger: '#D64B4B',
  dangerLight: '#F6D3D3',

  success: '#2B9B62',
  successLight: '#C8EAD8',

  bg: '#F6F7F9',
  bgCard: '#FFFFFF',
  bgElevated: '#ECEFF3',
  bgOverlay: '#DDE3EA',

  textPrimary: '#172033',
  textSecondary: '#536174',
  textMuted: '#8A95A5',

  border: '#E1E6EE',
  borderBright: '#C8D1DE',

  catMath:    '#2F6FED',
  catEnglish: '#169B8F',
  catGK:      '#D99921',
  catScience: '#169B8F',
  catHistory: '#D99921',
  catTech:    '#6B5DD3',
  catSports:  '#2B9B62',
  catPop:     '#C75C9E',
  catMixed:   '#6B5DD3',
};

export const Gradients = {
  primary: ['#2F6FED', '#1E4FA8'] as const,
  accent: ['#169B8F', '#7EDBD1'] as const,
  gold: ['#D99921', '#F2C86B'] as const,
  hero: ['#FFFFFF', '#F6F7F9'] as const,
  card: ['#FFFFFF', '#FBF5EA'] as const,
  danger: ['#D64B4B', '#F07878'] as const,
  success: ['#2B9B62', '#64C58E'] as const,
  fire: ['#EF6A3A', '#D99921'] as const,
};

export const Shadow = {
  sm: {
    shadowColor: '#172033',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#172033',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: '#172033',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
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
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
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
  { id: 'brain',   label: 'BrainRush', color: Colors.primary,   apiId: -1 },
  { id: 'mixed',   label: 'Mixed',     color: Colors.catMixed,   apiId: 0 },
  { id: 'science', label: 'Science',   color: Colors.catScience, apiId: 17 },
  { id: 'history', label: 'History',   color: Colors.catHistory, apiId: 23 },
  { id: 'tech',    label: 'Tech',      color: Colors.catTech,    apiId: 18 },
  { id: 'pop',     label: 'Pop',       color: Colors.catPop,     apiId: 11 },
] as const;

export const MOTIVATIONAL_QUOTES = [
  { text: "Five quick questions. Keep the habit moving.", author: "BrainStreak" },
  { text: "Small rounds add up when you come back daily.", author: "BrainStreak" },
  { text: "A clean streak starts with one round.", author: "BrainStreak" },
  { text: "Quick recall gets better with repetition.", author: "BrainStreak" },
];
