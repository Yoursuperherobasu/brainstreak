import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { useSettingsStore } from '@/store/useSettingsStore';

// Settings-aware audio. Reads `soundOn` from useSettingsStore on each call.
// Centralizing here means screens never import expo-audio directly.
//
// If a sound file is missing or fails to load, the loader logs a warning
// and the corresponding play() becomes a no-op. This lets us ship the
// wiring before the actual mp3s land in Phase 6.

type SoundKey = 'tick' | 'correct' | 'wrong' | 'fanfare';

const players: Partial<Record<SoundKey, AudioPlayer | null>> = {};

function getPlayer(key: SoundKey): AudioPlayer | null {
  if (key in players) return players[key] ?? null;
  let source: number | null = null;
  try {
    if (key === 'tick') source = require('@/assets/sounds/tick.mp3');
    else if (key === 'correct') source = require('@/assets/sounds/correct.mp3');
    else if (key === 'wrong') source = require('@/assets/sounds/wrong.mp3');
    else if (key === 'fanfare') source = require('@/assets/sounds/fanfare.mp3');
  } catch {
    source = null;
  }
  if (source == null) {
    players[key] = null;
    return null;
  }
  try {
    const p = createAudioPlayer(source);
    players[key] = p;
    return p;
  } catch (e) {
    console.warn(`[audio] failed to create player for ${key}:`, e);
    players[key] = null;
    return null;
  }
}

function play(key: SoundKey) {
  if (!useSettingsStore.getState().soundOn) return;
  const p = getPlayer(key);
  if (!p) return;
  try {
    p.seekTo(0);
    p.play();
  } catch {
    // swallow — audio failures should never crash the game
  }
}

export const audio = {
  tick: () => play('tick'),
  correct: () => play('correct'),
  wrong: () => play('wrong'),
  fanfare: () => play('fanfare'),
};
