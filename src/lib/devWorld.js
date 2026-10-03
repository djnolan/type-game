import { useState } from 'react';

const KEY = 'type-game/dev-world';

// Dev-only: which world the gameplay screen previews the current level in
// (null = the level's own world). Kept for the browser tab, not saved for good.
export function useDevWorld() {
  const [world, setWorld] = useState(() => {
    try {
      return Number(sessionStorage.getItem(KEY)) || null;
    } catch {
      return null;
    }
  });
  const set = (n) => {
    try {
      if (n) sessionStorage.setItem(KEY, String(n));
      else sessionStorage.removeItem(KEY);
    } catch {
      // ignore
    }
    setWorld(n);
  };
  return [world, set];
}
