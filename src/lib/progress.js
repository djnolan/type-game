import { useCallback, useRef, useState } from 'react';
import { levels, worlds } from './data';
import { markFor } from './marks';

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

// World runs. A run is one playthrough of a world's levels, from level 1. It
// records the mark each level earned (lib/marks.js), and counts each level's
// checks until it's passed, so leaving a level or reloading doesn't reset them.
// The best marks per world are kept for its badge: a finished run's, raised
// level by level whenever a replay does better.
//
// Stored as { best: { [world]: [mark per level] },
//             runs: { [world]: { marks: { [levelId]: mark }, checks: { [levelId]: n } } } }.
// v2: marks count the asterisk's lines (3 best); v1 stored 1 as best.
const RUNS_KEY = 'type-game/runs/v2';
const NO_RUNS = { best: {}, runs: {} };

function loadRuns() {
  try {
    const raw = JSON.parse(localStorage.getItem(RUNS_KEY));
    return { best: raw?.best ?? {}, runs: raw?.runs ?? {} };
  } catch {
    return NO_RUNS;
  }
}

function saveRuns(state) {
  try {
    localStorage.setItem(RUNS_KEY, JSON.stringify(state));
  } catch {
    // Storage may be unavailable; runs just won't persist.
  }
}

const EMPTY_RUN = { marks: {}, checks: {} };

export function useRuns() {
  const [state, setState] = useState(loadRuns);
  // Read and written synchronously, so a check and the pass that follows it
  // in the same moment see each other.
  const ref = useRef(state);
  const commit = (next) => {
    ref.current = next;
    saveRuns(next);
    setState(next);
  };
  const runOf = (world) => ref.current.runs[world] ?? EMPTY_RUN;
  const withRun = (world, run) => {
    const runs = { ...ref.current.runs };
    if (run) runs[world] = run;
    else delete runs[world];
    return { ...ref.current, runs };
  };

  const checksFor = (level) => runOf(level.world).checks[level.id] ?? 0;

  // Counts a check on a level.
  function check(level) {
    const run = runOf(level.world);
    commit(withRun(level.world, { ...run, checks: { ...run.checks, [level.id]: checksFor(level) + 1 } }));
  }

  // Records a passed level's mark in its world's run and returns the mark. A
  // world with a best run gets a better mark for the level in it right away,
  // so a replay can only improve the badge. On the world's last level, a run
  // that covers every level is finished: it becomes the best of a world that
  // has none, and a new run starts.
  function pass(level, world) {
    const mark = markFor(checksFor(level));
    const run = runOf(level.world);
    const marks = { ...run.marks, [level.id]: mark };
    const { [level.id]: _, ...checks } = run.checks;
    const isLast = world.levels.at(-1).id === level.id;
    const next = withRun(level.world, isLast ? null : { marks, checks });
    const kept = next.best[level.world];
    if (kept) {
      const i = world.levels.findIndex((l) => l.id === level.id);
      if (mark > (kept[i] ?? 0)) next.best = { ...next.best, [level.world]: kept.map((m, j) => (j === i ? mark : m)) };
    } else if (isLast && world.levels.every((l) => l.id in marks)) {
      next.best = { ...next.best, [level.world]: world.levels.map((l) => marks[l.id]) };
    }
    commit(next);
    return mark;
  }

  // Starts a world's run over, from level 1.
  function startRun(world) {
    if (ref.current.runs[world]) commit(withRun(world, null));
  }

  function reset() {
    commit(NO_RUNS);
  }

  // The marks of a world's best finished run, or [] if it has none.
  const bestOf = (world) => ref.current.best[world] ?? [];

  // The current run of a world (from data), one entry per level: the mark it
  // earned, or null if it hasn't been passed in this run.
  const slotsOf = (world) => {
    const { marks } = runOf(world.world);
    return world.levels.map((l) => (l.id in marks ? marks[l.id] : null));
  };

  return { bestOf, slotsOf, checksFor, check, pass, startRun, reset };
}
