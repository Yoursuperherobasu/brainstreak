import { act } from 'react-test-renderer';
import { AppState } from 'react-native';
import { usePausableInterval } from '@/lib/usePausableInterval';
import React from 'react';
import TestRenderer from 'react-test-renderer';

// Minimal renderHook for the react-native jest environment (no jsdom required)
function renderHookLive<T>(useHook: () => T): { result: { current: T }; rerender: () => void } {
  const resultRef = { current: null as unknown as T };
  let renderer: TestRenderer.ReactTestRenderer;
  function Wrapper() {
    resultRef.current = useHook();
    return null;
  }
  act(() => {
    renderer = TestRenderer.create(React.createElement(Wrapper));
  });
  return {
    result: resultRef as { current: T },
    rerender: () => act(() => { renderer.update(React.createElement(Wrapper)); }),
  };
}

let appStateListener: ((s: string) => void) | null = null;

beforeAll(() => {
  jest.spyOn(AppState, 'addEventListener').mockImplementation((event: string, cb: any) => {
    if (event === 'change') appStateListener = cb;
    return { remove: () => { appStateListener = null; } };
  });
});
afterAll(() => {
  jest.restoreAllMocks();
});

describe('usePausableInterval', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    appStateListener = null;
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('calls onTick at the expected cadence and onComplete at duration', () => {
    const onTick = jest.fn();
    const onComplete = jest.fn();
    renderHookLive(() =>
      usePausableInterval({ durationMs: 1000, tickMs: 200, onTick, onComplete, enabled: true })
    );
    act(() => { jest.advanceTimersByTime(200); });
    expect(onTick).toHaveBeenCalledTimes(1);
    act(() => { jest.advanceTimersByTime(800); });
    expect(onTick).toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  test('pauses when AppState goes to background', () => {
    const onTick = jest.fn();
    renderHookLive(() =>
      usePausableInterval({ durationMs: 1000, tickMs: 100, onTick, onComplete: () => {}, enabled: true })
    );
    act(() => { jest.advanceTimersByTime(300); });
    const ticksBeforeBackground = onTick.mock.calls.length;
    act(() => { appStateListener?.('background'); });
    act(() => { jest.advanceTimersByTime(500); });
    expect(onTick).toHaveBeenCalledTimes(ticksBeforeBackground);
  });

  test('resumes from the remaining time after background→active', () => {
    const onTick = jest.fn();
    const onComplete = jest.fn();
    renderHookLive(() =>
      usePausableInterval({ durationMs: 1000, tickMs: 100, onTick, onComplete, enabled: true })
    );
    act(() => { jest.advanceTimersByTime(400); });
    act(() => { appStateListener?.('background'); });
    act(() => { jest.advanceTimersByTime(10_000); });
    act(() => { appStateListener?.('active'); });
    act(() => { jest.advanceTimersByTime(600); });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  test('does nothing when enabled is false', () => {
    const onTick = jest.fn();
    renderHookLive(() =>
      usePausableInterval({ durationMs: 1000, tickMs: 100, onTick, onComplete: () => {}, enabled: false })
    );
    act(() => { jest.advanceTimersByTime(2000); });
    expect(onTick).not.toHaveBeenCalled();
  });

  test('reset() restarts from full duration', () => {
    const onComplete = jest.fn();
    const { result } = renderHookLive(() =>
      usePausableInterval({ durationMs: 1000, tickMs: 100, onTick: () => {}, onComplete, enabled: true })
    );
    act(() => { jest.advanceTimersByTime(700); });
    act(() => { result.current.reset(); });
    act(() => { jest.advanceTimersByTime(900); });
    expect(onComplete).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(200); });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  test('handles rapid background/foreground oscillation', () => {
    const onTick = jest.fn();
    const onComplete = jest.fn();
    renderHookLive(() =>
      usePausableInterval({ durationMs: 1000, tickMs: 100, onTick, onComplete, enabled: true })
    );
    act(() => { jest.advanceTimersByTime(200); });
    act(() => { appStateListener?.('background'); });
    act(() => { appStateListener?.('active'); });
    act(() => { appStateListener?.('background'); });
    act(() => { appStateListener?.('active'); });
    act(() => { jest.advanceTimersByTime(800); });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
