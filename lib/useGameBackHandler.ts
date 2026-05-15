// Android hardware-back guard for mini-game screens. Without this the
// system pops the route immediately and the player loses an in-progress
// run with no warning. With this, the OS back press behaves like the
// in-game "Exit" button: shows a confirm, lets the player cancel.
//
// No-op on web/iOS. Mounting cost is one event listener.

import { useEffect } from 'react';
import { Alert, BackHandler, Platform } from 'react-native';

interface Options {
  enabled?: boolean;
  onExit: () => void;
  message?: string;
}

export function useGameBackHandler({ enabled = true, onExit, message }: Options) {
  useEffect(() => {
    if (!enabled) return;
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert(
        'Quit game?',
        message ?? 'Your progress in this round will be lost.',
        [
          { text: 'Keep playing', style: 'cancel' },
          { text: 'Quit', style: 'destructive', onPress: onExit },
        ]
      );
      return true; // we handled it; don't let the system pop
    });
    return () => sub.remove();
  }, [enabled, onExit, message]);
}
