import { audio } from '@/lib/audio';
import { useSettingsStore } from '@/store/useSettingsStore';

describe('audio module', () => {
  beforeEach(() => {
    useSettingsStore.setState({ soundOn: true });
  });

  test('exposes the documented keys', () => {
    expect(typeof audio.tap).toBe('function');
    expect(typeof audio.select).toBe('function');
    expect(typeof audio.tick).toBe('function');
    expect(typeof audio.correct).toBe('function');
    expect(typeof audio.wrong).toBe('function');
    expect(typeof audio.levelup).toBe('function');
    expect(typeof audio.crash).toBe('function');
    expect(typeof audio.bgStart).toBe('function');
    expect(typeof audio.bgStop).toBe('function');
  });

  test('calls are no-ops when soundOn is false', () => {
    useSettingsStore.setState({ soundOn: false });
    expect(() => audio.tap()).not.toThrow();
    expect(() => audio.correct()).not.toThrow();
    expect(() => audio.levelup()).not.toThrow();
  });
});
