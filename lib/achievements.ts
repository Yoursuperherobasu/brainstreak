import type { LocalProfile, StreakData, RecentGame } from '@/lib/storage';

export interface EvalState {
  profile: LocalProfile;
  streak: StreakData;
  recent: RecentGame[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  predicate: (s: EvalState) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-round',   title: 'First Round',       description: 'Finish your first game.',                    predicate: (s) => s.profile.gamesPlayed >= 1 },
  { id: 'level-3',       title: 'Getting Somewhere', description: 'Reach level 3.',                             predicate: (s) => s.profile.level >= 3 },
  { id: 'level-5',       title: 'Knowledge Worker',  description: 'Reach level 5.',                             predicate: (s) => s.profile.level >= 5 },
  { id: 'level-10',      title: 'Quiz Machine',      description: 'Reach level 10.',                            predicate: (s) => s.profile.level >= 10 },
  { id: 'streak-3',      title: 'On Fire',           description: 'Hold a 3-day streak.',                       predicate: (s) => s.streak.current >= 3 },
  { id: 'week-streak',   title: 'Week On Lock',      description: 'Hold a 7-day streak.',                       predicate: (s) => s.streak.current >= 7 },
  { id: 'month-streak',  title: 'Unstoppable',       description: 'Hold a 30-day streak.',                      predicate: (s) => s.streak.current >= 30 },
  { id: 'xp-100',        title: 'Charged',           description: 'Earn 100 XP.',                               predicate: (s) => s.profile.totalXP >= 100 },
  { id: 'xp-500',        title: 'Big Brain',         description: 'Earn 500 XP.',                               predicate: (s) => s.profile.totalXP >= 500 },
  { id: 'xp-1k',         title: 'Cool 1,000',        description: 'Earn 1,000 XP.',                             predicate: (s) => s.profile.totalXP >= 1000 },
  { id: 'centurion',     title: 'Centurion',         description: 'Play 100 rounds.',                           predicate: (s) => s.profile.gamesPlayed >= 100 },
  { id: 'perfect-round', title: 'Flawless',          description: 'Get every answer right in a round.',         predicate: (s) => s.recent.some((g) => g.total > 0 && g.correct === g.total) },
];

export function evaluate(state: EvalState): string[] {
  return ACHIEVEMENTS.filter((a) => a.predicate(state)).map((a) => a.id);
}
