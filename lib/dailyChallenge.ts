// Re-export GameId from the single source of truth — constants/games.ts
// owns the union. This file keeps the daily-rotation logic.
export type { GameId } from '@/constants/games';
import type { GameId } from '@/constants/games';
import { GAMES as ALL_GAMES } from '@/constants/games';

const GAMES: GameId[] = ALL_GAMES.map((g) => g.id);

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
