import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export type NetworkStatus = 'online' | 'offline' | 'unknown';

export function statusOf(state: NetInfoState | null): NetworkStatus {
  if (!state) return 'unknown';
  if (state.isConnected === false) return 'offline';
  if (state.isInternetReachable === false) return 'offline';
  return 'online';
}

export function subscribe(listener: (status: NetworkStatus) => void): () => void {
  return NetInfo.addEventListener((state) => {
    listener(statusOf(state));
  });
}

export async function fetchOnce(): Promise<NetworkStatus> {
  const state = await NetInfo.fetch();
  return statusOf(state);
}
