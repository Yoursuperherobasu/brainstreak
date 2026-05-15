export type GameId = 'brain-rush' | 'word-sprint' | 'number-sense' | 'memory-match' | 'reaction-tap' | 'road-rush';

const GAMES: GameId[] = ['brain-rush', 'word-sprint', 'number-sense', 'memory-match', 'reaction-tap', 'road-rush'];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function pickDailyGame(dateIso: string): GameId {
  return GAMES[hash(dateIso) % GAMES.length];
}

export const DAILY_BONUS_XP = 25;
