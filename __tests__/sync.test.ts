import { mergeProfiles, CloudProfile } from '@/lib/sync';
import { LocalProfile, StreakData, DEFAULT_USERNAME } from '@/lib/storage';

const baseLocal: LocalProfile = {
  username: DEFAULT_USERNAME,
  totalXP: 100,
  level: 2,
  gamesPlayed: 3,
};

const baseStreak: StreakData = { current: 2, longest: 5, lastPlayDate: '2026-05-09' };

const baseCloud: CloudProfile = {
  id: 'u1',
  username: 'CloudUser',
  total_xp: 50,
  level: 1,
  current_streak: 1,
  longest_streak: 3,
  games_played: 2,
  last_play_date: '2026-05-08',
  updated_at: '2026-05-08T12:00:00Z',
};

describe('mergeProfiles', () => {
  test('no cloud row → returns local unchanged', () => {
    const result = mergeProfiles({ local: baseLocal, localStreak: baseStreak, cloud: null });
    expect(result.profile).toEqual(baseLocal);
    expect(result.streak).toEqual(baseStreak);
  });

  test('numeric XP/games/streak fields take the max across local and cloud', () => {
    const cloud: CloudProfile = { ...baseCloud, total_xp: 200, games_played: 10, current_streak: 8, longest_streak: 8 };
    const result = mergeProfiles({ local: baseLocal, localStreak: baseStreak, cloud });
    expect(result.profile.totalXP).toBe(200);
    expect(result.profile.gamesPlayed).toBe(10);
    expect(result.streak.current).toBe(8);
    expect(result.streak.longest).toBe(8);
  });

  test('local wins on numerics when local is greater', () => {
    const cloud: CloudProfile = { ...baseCloud, total_xp: 0, games_played: 0, current_streak: 0, longest_streak: 0 };
    const result = mergeProfiles({ local: baseLocal, localStreak: baseStreak, cloud });
    expect(result.profile.totalXP).toBe(100);
    expect(result.streak.current).toBe(2);
    expect(result.streak.longest).toBe(5);
  });

  test('cloud username wins when local username is the default', () => {
    const result = mergeProfiles({ local: baseLocal, localStreak: baseStreak, cloud: baseCloud });
    expect(result.profile.username).toBe('CloudUser');
  });

  test('local username wins when it has been customized', () => {
    const local = { ...baseLocal, username: 'CustomName' };
    const result = mergeProfiles({ local, localStreak: baseStreak, cloud: baseCloud });
    expect(result.profile.username).toBe('CustomName');
  });

  // A4 fix: level is derived from totalXP after the merge, not max'd independently.
  test('level is derived from merged totalXP, not max(local.level, cloud.level)', () => {
    // Local: 100 XP / level 2; Cloud: 50 XP / level 5 (drift).
    // Old behavior: level = max(2, 5) = 5. New behavior: level = getLevelFromXP(100) = 2.
    const cloud: CloudProfile = { ...baseCloud, total_xp: 50, level: 5 };
    const result = mergeProfiles({ local: baseLocal, localStreak: baseStreak, cloud });
    expect(result.profile.totalXP).toBe(100);
    expect(result.profile.level).toBe(2);
  });

  test('level reflects merged XP when cloud has higher XP', () => {
    const cloud: CloudProfile = { ...baseCloud, total_xp: 800, level: 1 };
    const result = mergeProfiles({ local: baseLocal, localStreak: baseStreak, cloud });
    expect(result.profile.totalXP).toBe(800);
    expect(result.profile.level).toBe(5); // sqrt(800/50) = 4 → +1 = 5
  });

  // A1 fix: lastPlayDate cross-device preservation.
  test('lastPlayDate takes the more recent of local and cloud', () => {
    const localStreak: StreakData = { current: 0, longest: 0, lastPlayDate: null };
    const cloud: CloudProfile = { ...baseCloud, last_play_date: '2026-05-09', current_streak: 5, longest_streak: 5 };
    const result = mergeProfiles({ local: baseLocal, localStreak, cloud });
    expect(result.streak.lastPlayDate).toBe('2026-05-09');
    expect(result.streak.current).toBe(5);
    expect(result.streak.longest).toBe(5);
  });

  test('local lastPlayDate wins when more recent than cloud', () => {
    const localStreak: StreakData = { current: 7, longest: 7, lastPlayDate: '2026-05-10' };
    const cloud: CloudProfile = { ...baseCloud, last_play_date: '2026-05-08' };
    const result = mergeProfiles({ local: baseLocal, localStreak, cloud });
    expect(result.streak.lastPlayDate).toBe('2026-05-10');
  });

  test('cloud lastPlayDate persists when local is null', () => {
    const localStreak: StreakData = { current: 0, longest: 0, lastPlayDate: null };
    const cloud: CloudProfile = { ...baseCloud, last_play_date: '2026-05-08' };
    const result = mergeProfiles({ local: baseLocal, localStreak, cloud });
    expect(result.streak.lastPlayDate).toBe('2026-05-08');
  });

  test('both null lastPlayDate → null', () => {
    const localStreak: StreakData = { current: 0, longest: 0, lastPlayDate: null };
    const cloud: CloudProfile = { ...baseCloud, last_play_date: null };
    const result = mergeProfiles({ local: baseLocal, localStreak, cloud });
    expect(result.streak.lastPlayDate).toBe(null);
  });

  // Regression: device-switch must preserve an active streak (A1 critical).
  test('device-switch with active streak: cloud has streak+date, local fresh → keeps streak intact', () => {
    const freshLocal: LocalProfile = { username: DEFAULT_USERNAME, totalXP: 0, level: 1, gamesPlayed: 0 };
    const freshStreak: StreakData = { current: 0, longest: 0, lastPlayDate: null };
    const cloud: CloudProfile = {
      ...baseCloud,
      total_xp: 250,
      current_streak: 5,
      longest_streak: 5,
      last_play_date: '2026-05-09',
      games_played: 5,
    };
    const result = mergeProfiles({ local: freshLocal, localStreak: freshStreak, cloud });
    expect(result.streak.current).toBe(5);
    expect(result.streak.longest).toBe(5);
    expect(result.streak.lastPlayDate).toBe('2026-05-09');
    expect(result.profile.totalXP).toBe(250);
  });
});
