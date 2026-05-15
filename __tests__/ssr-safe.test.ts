import { ssrSafeRandomIndex, ssrSafeTimeOfDay } from '@/lib/ssrSafe';

describe('ssrSafe', () => {
  it('returns 0 on the server snapshot (deterministic for hydration)', () => {
    expect(ssrSafeRandomIndex(10, { server: true })).toBe(0);
    expect(ssrSafeTimeOfDay({ server: true })).toBe('Morning');
  });
  it('returns a real random index after mount', () => {
    const v = ssrSafeRandomIndex(10);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(10);
  });
});
