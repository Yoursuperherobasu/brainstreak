import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePersonalBestStore } from '@/store/usePersonalBestStore';

beforeEach(async () => {
  await AsyncStorage.clear();
  usePersonalBestStore.setState({ bests: {}, hydrated: true });
});

describe('usePersonalBestStore', () => {
  test('first score sets the best for that game', () => {
    const r = usePersonalBestStore.getState().recordScore('word-sprint', 100);
    expect(r.wasNewBest).toBe(true);
    expect(r.previousBest).toBe(0);
    expect(usePersonalBestStore.getState().bests['word-sprint']?.bestScore).toBe(100);
  });

  test('higher score replaces the existing best', () => {
    usePersonalBestStore.getState().recordScore('word-sprint', 100);
    const r = usePersonalBestStore.getState().recordScore('word-sprint', 250);
    expect(r.wasNewBest).toBe(true);
    expect(r.previousBest).toBe(100);
    expect(usePersonalBestStore.getState().bests['word-sprint']?.bestScore).toBe(250);
  });

  test('lower score is a no-op (best stays)', () => {
    usePersonalBestStore.getState().recordScore('word-sprint', 250);
    const r = usePersonalBestStore.getState().recordScore('word-sprint', 100);
    expect(r.wasNewBest).toBe(false);
    expect(r.previousBest).toBe(250);
    expect(usePersonalBestStore.getState().bests['word-sprint']?.bestScore).toBe(250);
  });

  test('equal score is a no-op (tie is not a new best)', () => {
    usePersonalBestStore.getState().recordScore('word-sprint', 100);
    const r = usePersonalBestStore.getState().recordScore('word-sprint', 100);
    expect(r.wasNewBest).toBe(false);
  });

  test('per-game tracking is independent', () => {
    usePersonalBestStore.getState().recordScore('word-sprint', 100);
    usePersonalBestStore.getState().recordScore('number-sense', 50);
    const b = usePersonalBestStore.getState().bests;
    expect(b['word-sprint']?.bestScore).toBe(100);
    expect(b['number-sense']?.bestScore).toBe(50);
  });
});
