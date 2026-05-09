import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { useSettingsStore } from '@/store/useSettingsStore';

// Settings-aware audio. Reads `soundOn` from useSettingsStore on each call.
// Centralizing here means screens never import expo-audio directly.
//
// Sound files are added in Phase 6. Until then, SOURCES is empty and
// every play() is a no-op. To wire a sound: add the file to
// assets/sounds/<key>.mp3 and add `<key>: require('@/assets/sounds/<key>.mp3')`
// to SOURCES. Metro resolves require() at bundle time, so the entry must
// be commented out (not just point at a missing file).

type SoundKey = 'tick' | 'correct' | 'wrong' | 'fanfare';

// Phase 6: uncomment each line as the corresponding mp3 file lands in assets/sounds/.
const SOURCES: Partial<Record<SoundKey, number>> = {
  // tick: require('@/assets/sounds/tick.mp3'),
  // correct: require('@/assets/sounds/correct.mp3'),
  // wrong: require('@/assets/sounds/wrong.mp3'),
  // fanfare: require('@/assets/sounds/fanfare.mp3'),
};

const players: Partial<Record<SoundKey, AudioPlayer | null>> = {};

function getPlayer(key: SoundKey): AudioPlayer | null {
  if (key in players) return players[key] ?? null;
  const source = SOURCES[key];
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
