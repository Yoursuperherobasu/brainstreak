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
  updated_at: '2026-05-08T12:00:00Z',
};

describe('mergeProfiles', () => {
  test('no cloud row → returns local unchanged', () => {
    const result = mergeProfiles({ local: baseLocal, localStreak: baseStreak, cloud: null });
    expect(result.profile).toEqual(baseLocal);
    expect(result.streak).toEqual(baseStreak);
  });

  test('numeric fields take the max across local and cloud', () => {
    const cloud: CloudProfile = { ...baseCloud, total_xp: 200, level: 4, games_played: 10, current_streak: 8, longest_streak: 8 };
    const result = mergeProfiles({ local: baseLocal, localStreak: baseStreak, cloud });
    expect(result.profile.totalXP).toBe(200);
    expect(result.profile.level).toBe(4);
    expect(result.profile.gamesPlayed).toBe(10);
    expect(result.streak.current).toBe(8);
    expect(result.streak.longest).toBe(8);
  });

  test('local wins on numerics when local is greater', () => {
    const cloud: CloudProfile = { ...baseCloud, total_xp: 0, level: 0, games_played: 0, current_streak: 0, longest_streak: 0 };
    const result = mergeProfiles({ local: baseLocal, localStreak: baseStreak, cloud });
    expect(result.profile.totalXP).toBe(100);
    expect(result.profile.level).toBe(2);
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

  test('lastPlayDate is taken from local (source of truth for today-played)', () => {
    const result = mergeProfiles({ local: baseLocal, localStreak: baseStreak, cloud: baseCloud });
    expect(result.streak.lastPlayDate).toBe('2026-05-09');
  });

  test('null lastPlayDate from local persists when cloud has data', () => {
    const localStreak: StreakData = { current: 0, longest: 0, lastPlayDate: null };
    const result = mergeProfiles({ local: baseLocal, localStreak, cloud: baseCloud });
    expect(result.streak.lastPlayDate).toBe(null);
  });
});
