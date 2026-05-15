// BrainStreak — Color System, Theme & Design Tokens

export const Colors = {
  primary:       '#7A3FF2', // magenta-violet ink
  primaryLight:  '#B596FF',
  primaryDark:   '#4A1FB0',

  accent:        '#FF7A2D', // tangerine
  accentLight:   '#FFB585',

  gold:          '#F2B233', // honey
  goldLight:     '#FFD98A',

  danger:        '#E84B3C', // tomato
  dangerLight:   '#FBD2CD',

  success:       '#5BBF3B', // lime-grass
  successLight:  '#CDEBC2',

  bg:            '#FAF4E8', // warm cream paper
  bgCard:        '#FFFDF7',
  bgElevated:    '#F2E9D6',
  bgOverlay:     '#E8DCC2',

  textPrimary:   '#1B1726', // warm near-black
  textSecondary: '#5A4F6B',
  textMuted:     '#9389A3',

  border:        '#E5D7C0',
  borderBright:  '#D4BFA0',

  catMath:      '#7A3FF2', // violet
  catEnglish:   '#FF7A2D', // tangerine
  catGK:        '#F2B233', // honey
  catScience:   '#1FB8A8', // jade
  catHistory:   '#C2410C', // burnt sienna
  catTech:      '#3B82F6', // electric blue (the one sanctioned blue)
  catSports:    '#5BBF3B', // lime
  catPop:       '#EC4899', // hot pink
  catMixed:     '#7A3FF2', // violet
  catGeography: '#1FB8A8', // jade (same as science — keep it)
};

export const Gradients = {
  primary: ['#7A3FF2', '#4A1FB0'] as const,        // violet to deep violet
  accent:  ['#FF7A2D', '#FFB585'] as const,         // tangerine to peach
  gold:    ['#F2B233', '#FFD98A'] as const,         // honey to soft gold
  hero:    ['#FAF4E8', '#F2E9D6'] as const,         // cream paper
  card:    ['#FFFDF7', '#F2E9D6'] as const,
  danger:  ['#E84B3C', '#FBD2CD'] as const,
  success: ['#5BBF3B', '#CDEBC2'] as const,
  fire:    ['#FF7A2D', '#F2B233'] as const,         // tangerine to honey
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
  { id: 'brain',     label: 'BrainRush',  color: Colors.primary,       apiId: -1 },
  { id: 'mixed',     label: 'Mixed',      color: Colors.catMixed,      apiId: 0 },
  { id: 'science',   label: 'Science',    color: Colors.catScience,    apiId: 17 },
  { id: 'history',   label: 'History',    color: Colors.catHistory,    apiId: 23 },
  { id: 'tech',      label: 'Tech',       color: Colors.catTech,       apiId: 18 },
  { id: 'pop',       label: 'Pop',        color: Colors.catPop,        apiId: 11 },
  { id: 'geography', label: 'Geography',  color: Colors.catGeography,  apiId: 22 },
] as const;

export const MOTIVATIONAL_QUOTES = [
  // Brain-rot / brain-fog energy — short, punchy, gen-Z friendly.
  { text: "Beat brain rot. One round a day keeps the algorithm at bay.", author: "BrainStreak" },
  { text: "60 seconds of thinking > 60 minutes of scrolling.", author: "BrainStreak" },
  { text: "Your brain called. It wants its dopamine back.", author: "BrainStreak" },
  { text: "Skill issue? Fix it. One question at a time.", author: "BrainStreak" },
  { text: "Brain fog hates this one simple trick.", author: "BrainStreak" },
  { text: "Touch grass. Then touch this app. Balance.", author: "BrainStreak" },
  { text: "Daily reps build a brain that doesn't quit.", author: "BrainStreak" },
  { text: "Logged in to think, not to scroll. Let's go.", author: "BrainStreak" },
  { text: "Small rounds compound. Streaks beat slumps.", author: "BrainStreak" },
  { text: "Five quick questions. Brain on, fog off.", author: "BrainStreak" },
  { text: "Stay sharp. The world is loud, your mind doesn't have to be.", author: "BrainStreak" },
  { text: "No XP, no growth. Earn yours today.", author: "BrainStreak" },
];
