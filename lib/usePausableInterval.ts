import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export interface PausableIntervalConfig {
  durationMs: number;
  tickMs: number;
  onTick: (remainingMs: number) => void;
  onComplete: () => void;
  enabled: boolean;
}

export interface PausableInterval {
  reset: () => void;
}

export function usePausableInterval(config: PausableIntervalConfig): PausableInterval {
  const { durationMs, tickMs, enabled } = config;
  const onTickRef = useRef(config.onTick);
  const onCompleteRef = useRef(config.onComplete);
  onTickRef.current = config.onTick;
  onCompleteRef.current = config.onComplete;

  const endAtRef = useRef<number | null>(null);
  const pausedRemainingRef = useRef<number>(durationMs);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);

  const [resetNonce, setResetNonce] = useState(0);

  const startInterval = useCallback((remainingMs: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    completedRef.current = false;
    endAtRef.current = Date.now() + remainingMs;
    intervalRef.current = setInterval(() => {
      const end = endAtRef.current;
      if (end == null) return;
      const remaining = end - Date.now();
      if (remaining <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        endAtRef.current = null;
        if (!completedRef.current) {
          completedRef.current = true;
          onCompleteRef.current();
        }
        return;
      }
      onTickRef.current(remaining);
    }, tickMs);
  }, [tickMs]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      endAtRef.current = null;
      pausedRemainingRef.current = durationMs;
      completedRef.current = false;
      return;
    }
    startInterval(durationMs);
    pausedRemainingRef.current = durationMs;

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        if (!completedRef.current && pausedRemainingRef.current > 0) {
          startInterval(pausedRemainingRef.current);
        }
      } else {
        if (endAtRef.current != null) {
          pausedRemainingRef.current = Math.max(0, endAtRef.current - Date.now());
        }
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        endAtRef.current = null;
      }
    });

    return () => {
      sub.remove();
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      endAtRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, durationMs, resetNonce, startInterval]);

  const reset = useCallback(() => {
    pausedRemainingRef.current = durationMs;
    completedRef.current = false;
    setResetNonce((n) => n + 1);
  }, [durationMs]);

  return { reset };
}
