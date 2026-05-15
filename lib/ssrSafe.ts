// SSR-safe helpers for non-deterministic values used in render.
//
// expo-router's static export pre-renders every route to HTML on a Node server.
// If the rendered HTML differs from the client's first render, React 18+ logs
// a hydration warning AND, until the hydration completes, the DOM tree it
// inherited from the server may not have the client-side event listeners
// attached. Net effect: a button you can SEE may not be CLICKABLE for the first
// few hundred ms — and a stubborn enough mismatch can leave it dead forever.
//
// Pattern: return a deterministic value during render; flip to the real
// random/date value in a useEffect (which only runs client-side).

export function ssrSafeRandomIndex(
  length: number,
  { server = typeof window === 'undefined' } = {},
): number {
  if (server || length <= 0) return 0;
  return Math.floor(Math.random() * length);
}

export function ssrSafeTimeOfDay(
  { server = typeof window === 'undefined', now = new Date() } = {},
): 'Morning' | 'Afternoon' | 'Evening' {
  if (server) return 'Morning';
  const h = now.getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}
