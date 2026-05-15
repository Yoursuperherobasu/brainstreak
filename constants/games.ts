import { Colors } from '@/constants/theme';

export type GameId =
  | 'brain-rush'
  | 'word-sprint'
  | 'number-sense'
  | 'memory-match'
  | 'reaction-tap'
  | 'road-rush';

export interface GameMeta {
  id: GameId;
  title: string;
  sub: string;
  color: string;
  path: string;
}

// Single source of truth for game metadata. Play tab, DailyChallengeCard,
// and Profile's Personal Bests section all read from here.
export const GAMES: ReadonlyArray<GameMeta> = [
  { id: 'brain-rush',   title: 'Brain Rush',   sub: '5 questions · 15s each',  color: Colors.primary,      path: '/play' },
  { id: 'word-sprint',  title: 'Word Sprint',  sub: '60s anagram chase',        color: Colors.accent,       path: '/game/word-sprint' },
  { id: 'number-sense', title: 'Number Sense', sub: '30s math drill',           color: Colors.primaryLight, path: '/game/number-sense' },
  { id: 'memory-match', title: 'Memory Match', sub: 'Simon-style sequence',     color: Colors.gold,         path: '/game/memory-match' },
  { id: 'reaction-tap', title: 'Reaction Tap', sub: 'Tap before it vanishes',   color: Colors.success,      path: '/game/reaction-tap' },
  { id: 'road-rush',    title: 'Road Rush',    sub: 'Dodge traffic, no chill',  color: Colors.danger,       path: '/game/road-rush' },
];

export function gameMeta(id: GameId): GameMeta | undefined {
  return GAMES.find((g) => g.id === id);
}

export const MINI_GAMES = GAMES.filter((g) => g.id !== 'brain-rush') as ReadonlyArray<GameMeta>;
