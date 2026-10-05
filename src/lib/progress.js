import { useCallback, useState } from 'react';
import { levels, worlds } from './data';

const KEY = 'type-game/progress/v1';
// The level on screen, so a jump from world select survives a reload.
const CURRENT_KEY = 'type-game/progress/current';

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    return new Set(Array.isArray(raw?.completed) ? raw.completed : []);
  } catch {
    return new Set();
  }
}

function save(completed) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ completed: [...completed] }));
  } catch {
    // Storage may be unavailable (private mode); progress just won't persist.
  }
}

export function useProgress() {
  const [completed, setCompleted] = useState(load);

  const complete = useCallback((id) => {
    setCompleted((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev).add(id);
      save(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const next = new Set();
    save(next);
    setCompleted(next);
  }, []);

  return { completed, complete, reset };
}

// Levels unlock in order, so the current level is the first one not completed.
export function currentLevel(completed) {
  return levels.find((l) => !completed.has(l.id)) ?? null;
}

// After a level: the next one not completed after it, else the first one not
// completed anywhere (needed once world select can skip ahead).
export function nextLevel(completed, afterId) {
  const i = levels.findIndex((l) => l.id === afterId);
  return levels.slice(i + 1).find((l) => !completed.has(l.id)) ?? currentLevel(completed);
}

export function loadCurrentId() {
  try {
    return localStorage.getItem(CURRENT_KEY);
  } catch {
    return null;
  }
}

export function saveCurrentId(id) {
  try {
    if (id) localStorage.setItem(CURRENT_KEY, id);
    else localStorage.removeItem(CURRENT_KEY);
  } catch {
    // ignore
  }
}

// Per-world state for the progress indicator.
export function worldStates(completed, activeWorld) {
  return worlds.map((w) => {
    const total = w.levels.length;
    const done = w.levels.filter((l) => completed.has(l.id)).length;
    let state = 'future';
    if (total > 0 && done === total) state = 'complete';
    else if (w.world === activeWorld) state = 'current';
    return { world: w.world, state, fraction: total ? done / total : 0, glyphs: w.glyphs };
  });
}
