import { Platform } from 'react-native';
import { useSettingsStore } from '@/store/useSettingsStore';

// Cross-platform audio.
//
// - Web: synthesize tones via the Web Audio API. No mp3 assets needed —
//   the bundle stays tiny and every sound is procedurally generated.
// - Native: fall back to expo-audio with bundled mp3s (silent until the
//   assets are added under `assets/sounds/`).
//
// Both paths honour the global `soundOn` setting from useSettingsStore.

// ─── Sound keys ─────────────────────────────────────────────────────────────
export type SoundKey =
  | 'tap'        // generic UI tap
  | 'select'     // selecting a category / option
  | 'tick'       // countdown timer tick
  | 'correct'    // correct answer
  | 'wrong'      // wrong answer
  | 'levelup'    // level-up fanfare
  | 'crash'      // racer/reaction tap miss
  | 'bg';        // low-volume background loop

// ─── Web (Web Audio API) ────────────────────────────────────────────────────
let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let bgGain: GainNode | null = null;
let bgOsc: OscillatorNode | null = null;
let bgRunning = false;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  try {
    const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor() as AudioContext;
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.18;
    masterGain.connect(ctx.destination);
    return ctx;
  } catch {
    return null;
  }
}

// Some browsers (Chrome/Safari) require a user gesture before audio plays.
// We attach a one-shot listener that resumes the context on first click/tap.
if (typeof window !== 'undefined' && Platform.OS === 'web') {
  const resume = () => {
    const c = getCtx();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
  };
  const once = { once: true } as AddEventListenerOptions;
  window.addEventListener('pointerdown', resume, once);
  window.addEventListener('keydown', resume, once);
  window.addEventListener('touchstart', resume, once);
}

// Schedule a quick fade-in/out tone. `notes` is a list of frequency/duration
// pairs played back-to-back. `wave` is the oscillator shape.
function tone(
  notes: Array<{ freq: number; durMs: number; gain?: number }>,
  wave: OscillatorType = 'triangle',
) {
  const c = getCtx();
  if (!c || !masterGain) return;
  let t = c.currentTime;
  for (const n of notes) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(n.freq, t);
    const peak = n.gain ?? 1;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + n.durMs / 1000);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(t);
    osc.stop(t + n.durMs / 1000 + 0.02);
    t += n.durMs / 1000;
  }
}

function startBg() {
  const c = getCtx();
  if (!c || !masterGain || bgRunning) return;
  bgRunning = true;
  bgGain = c.createGain();
  bgGain.gain.value = 0.06; // quiet ambient pad
  bgOsc = c.createOscillator();
  bgOsc.type = 'sine';
  bgOsc.frequency.value = 110;
  // Mild LFO for movement
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  lfo.frequency.value = 0.18;
  lfoGain.gain.value = 4;
  lfo.connect(lfoGain);
  lfoGain.connect(bgOsc.frequency);
  bgOsc.connect(bgGain);
  bgGain.connect(masterGain);
  bgOsc.start();
  lfo.start();
}

function stopBg() {
  if (!bgRunning) return;
  bgRunning = false;
  try { bgOsc?.stop(); } catch {}
  try { bgGain?.disconnect(); } catch {}
  bgOsc = null;
  bgGain = null;
}

// ─── Native (expo-audio with optional mp3s) ────────────────────────────────
type NativePlayer = { seekTo: (s: number) => void; play: () => void; pause?: () => void };
const SOURCES: Partial<Record<SoundKey, number>> = {
  tap:     require('@/assets/sounds/tap.mp3'),
  select:  require('@/assets/sounds/select.mp3'),
  tick:    require('@/assets/sounds/tick.mp3'),
  correct: require('@/assets/sounds/correct.mp3'),
  wrong:   require('@/assets/sounds/wrong.mp3'),
  levelup: require('@/assets/sounds/levelup.mp3'),
  crash:   require('@/assets/sounds/crash.mp3'),
  // bg deliberately omitted — web uses procedural drone; native gets silence
  // on bg loop until a curated mp3 is sourced.
};
const nativePlayers: Partial<Record<SoundKey, NativePlayer | null>> = {};

function nativePlayer(key: SoundKey): NativePlayer | null {
  if (key in nativePlayers) return nativePlayers[key] ?? null;
  const src = SOURCES[key];
  if (src == null) {
    nativePlayers[key] = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createAudioPlayer } = require('expo-audio');
    const p = createAudioPlayer(src);
    nativePlayers[key] = p;
    return p;
  } catch {
    nativePlayers[key] = null;
    return null;
  }
}

function enabled() {
  try { return useSettingsStore.getState().soundOn; } catch { return true; }
}

// ─── Public API ─────────────────────────────────────────────────────────────
function play(key: SoundKey) {
  if (!enabled()) return;
  if (Platform.OS === 'web') {
    switch (key) {
      case 'tap':     return tone([{ freq: 440, durMs: 60, gain: 0.5 }], 'square');
      case 'select':  return tone([{ freq: 620, durMs: 80, gain: 0.55 }, { freq: 820, durMs: 110, gain: 0.45 }], 'triangle');
      case 'tick':    return tone([{ freq: 1100, durMs: 35, gain: 0.4 }], 'square');
      case 'correct': return tone(
        [{ freq: 660, durMs: 90, gain: 0.6 }, { freq: 880, durMs: 110, gain: 0.6 }, { freq: 1320, durMs: 220, gain: 0.55 }],
        'triangle',
      );
      case 'wrong':   return tone(
        [{ freq: 320, durMs: 110, gain: 0.5 }, { freq: 200, durMs: 220, gain: 0.5 }],
        'sawtooth',
      );
      case 'levelup': return tone(
        [
          { freq: 523, durMs: 90, gain: 0.6 },   // C5
          { freq: 659, durMs: 90, gain: 0.6 },   // E5
          { freq: 784, durMs: 120, gain: 0.6 },  // G5
          { freq: 1046, durMs: 260, gain: 0.7 }, // C6
        ],
        'triangle',
      );
      case 'crash':   return tone(
        [{ freq: 180, durMs: 120, gain: 0.6 }, { freq: 90, durMs: 220, gain: 0.6 }],
        'sawtooth',
      );
      case 'bg':      return startBg();
    }
  }
  if (key === 'bg') return; // bg loop on native arrives with the mp3
  const p = nativePlayer(key);
  if (!p) return;
  try {
    p.seekTo(0);
    p.play();
  } catch {}
}

function stop(key: SoundKey) {
  if (key === 'bg') {
    if (Platform.OS === 'web') stopBg();
    else nativePlayers.bg?.pause?.();
  }
}

export const audio = {
  tap:     () => play('tap'),
  select:  () => play('select'),
  tick:    () => play('tick'),
  correct: () => play('correct'),
  wrong:   () => play('wrong'),
  levelup: () => play('levelup'),
  crash:   () => play('crash'),
  bgStart: () => play('bg'),
  bgStop:  () => stop('bg'),
};

// Back-compat aliases used by existing callers.
export const fanfare = () => audio.levelup();
