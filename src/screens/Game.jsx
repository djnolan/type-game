import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import Header from '../components/Header';
import Stage from '../components/Stage';
import WorldSelect from '../components/WorldSelect';
import { charsFor } from '../lib/charsets';
import { getLevel, getWorld, levels, worlds } from '../lib/data';
import { EDITOR_ENABLED } from '../lib/dev';
import { Director } from '../lib/director';
import { computeLayout, glyphExtent } from '../lib/geometry';
import { getShape } from '../lib/shape';
import { markFor } from '../lib/marks';
import { currentLevel, loadCurrentId, nextLevel, saveCurrentId, useProgress, useRuns, worldStates } from '../lib/progress';
import { useSize } from '../lib/useSize';

const doneIn = (w, completed) => w.levels.filter((l) => completed.has(l.id)).length;

// `testLevel` plays one level outside of progress (the editor's Play test).
export default function Game({ testLevel, onBack }) {
  const { completed, complete, reset } = useProgress();
  const runs = useRuns();
  const [sizeRef, size] = useSize();
  // The level on screen. A level picked in world select is remembered across reloads.
  const [playingId, setPlayingIdState] = useState(() => {
    const saved = loadCurrentId();
    return (saved && getLevel(saved) ? saved : currentLevel(completed)?.id) ?? null;
  });
  const [round, setRound] = useState(0);
  const [letters, setLetters] = useState([]);
  const [selecting, setSelecting] = useState(false);
  // A level just passed is saved right away, but the header shows it as
  // completed only once the transition has filled its progress dot.
  const [heldId, setHeldId] = useState(null);
  // Checks on the editor's Play test level, which isn't part of any run.
  const [testChecks, setTestChecks] = useState(0);

  const shape = EDITOR_ENABLED ? getShape() : 'circle';
  const hostRef = useRef(null);
  const headerRef = useRef(null);
  const layerRef = useRef(null);
  const director = useRef(null);
  const env = useRef(null);
  env.current = {
    shape,
    layout: (world) => computeLayout(size.width, size.height, shape, glyphExtent(world.glyphs)),
  };

  useEffect(() => {
    const d = new Director(layerRef.current, () => ({ ...env.current, header: headerRef.current, host: hostRef.current }));
    director.current = d;
    return () => d.cancel();
  }, []);

  const setPlayingId = (id) => {
    saveCurrentId(id);
    setPlayingIdState(id);
  };

  const level = testLevel ?? (playingId ? getLevel(playingId) : null);
  const world = level && getWorld(level.world);
  const activeWorld = level?.world ?? levels.at(-1)?.world;
  const shown = heldId ? new Set([...completed].filter((id) => id !== heldId)) : completed;
  const checks = testLevel ? testChecks : level ? runs.checksFor(level) : 0;

  function onCheck() {
    if (testLevel) setTestChecks((n) => n + 1);
    else runs.check(level);
  }

  function play(id) {
    // Starting a world's first level begins a new run of that world, unless
    // it's the level already on screen (back from the menu, say).
    const next = id && getLevel(id);
    if (next && id !== playingId && getWorld(next.world).levels[0].id === id) runs.startRun(next.world);
    setLetters([]);
    setRound((r) => r + 1);
    setPlayingId(id);
  }

  // Switches the stage to another level synchronously, so the director can
  // take hold of the new stage's parts straight away.
  const swapTo = (id) => () => flushSync(() => play(id));

  function startOver() {
    reset();
    runs.reset();
    setSelecting(false);
    play(levels[0]?.id ?? null);
  }

  // A correct match: level complete, or world complete on a world's last level.
  function onPass() {
    if (testLevel) {
      const from = { world, level, mark: markFor(testChecks) };
      director.current.levelComplete({
        from,
        to: from,
        progress: { from: 0, to: 0 },
        swap: () =>
          flushSync(() => {
            setLetters([]);
            setTestChecks(0);
            setRound((r) => r + 1);
          }),
        release() {},
      });
      return;
    }

    const from = { world, level, mark: runs.pass(level, world) };
    const wasDone = completed.has(level.id);
    const after = new Set(completed).add(level.id);
    complete(level.id);
    if (!wasDone) setHeldId(level.id);
    const release = () => setHeldId(null);
    const total = world.levels.length;
    const progress = { from: doneIn(world, completed) / total, to: doneIn(world, after) / total };
    // Within a world, play goes on to its next level, which keeps a replay
    // going through levels already completed. After the last, it moves on.
    const isLast = world.levels.at(-1).id === level.id;
    const next = isLast ? nextLevel(after, level.id) : world.levels[world.levels.indexOf(level) + 1];

    if (isLast) {
      director.current.worldComplete({
        from,
        badge: runs.bestOf(world.world),
        progress,
        release,
        onContinue: () =>
          director.current.nextWorld({
            to: next && { world: getWorld(next.world), level: next, slots: runs.slotsOf(getWorld(next.world)) },
            swap: swapTo(next?.id ?? null),
          }),
      });
    } else if (next) {
      director.current.levelComplete({
        from,
        to: { world: getWorld(next.world), level: next },
        progress,
        swap: swapTo(next.id),
        release,
      });
    } else {
      release();
      play(null);
    }
  }

  // The level a world opens on from the menu: the one on screen if it's in
  // that world, else its first level not completed, else its first level.
  function entryLevel(w) {
    if (level?.world === w.world) return level;
    return w.levels.find((l) => !completed.has(l.id)) ?? w.levels[0];
  }

  function openMenu() {
    if (!level) return;
    const current = currentLevel(completed)?.world;
    const menuWorlds = worlds.map((w) => {
      const total = w.levels.length;
      const isComplete = total > 0 && doneIn(w, completed) === total;
      const selectable = total > 0 && (isComplete || w.world === current || w.world === level.world);
      const action = isComplete ? 'Replay' : doneIn(w, completed) > 0 ? 'Continue' : 'Begin';
      return {
        world: w,
        // A completed world shows its best run, even while it's being replayed.
        state: isComplete ? 'complete' : selectable ? 'open' : 'locked',
        slots: isComplete ? runs.bestOf(w.world) : runs.slotsOf(w),
        label: w.name,
        action,
        selectable,
      };
    });
    director.current.toMenu({
      from: { world, level, letters },
      worlds: menuWorlds,
      index: worlds.indexOf(world),
      onSelect: (i) => {
        const to = entryLevel(worlds[i]);
        director.current.selectWorld({ index: i, to: { world: worlds[i], level: to }, swap: swapTo(to.id) });
      },
    });
  }

  return (
    <div className="screen">
      <Header
        headerRef={headerRef}
        onBack={testLevel ? onBack : openMenu}
        worlds={worldStates(shown, activeWorld)}
        onWorlds={testLevel ? undefined : () => setSelecting(true)}
      />
      {level ? (
        <div
          className="stage-host"
          ref={(el) => {
            hostRef.current = el;
            sizeRef(el);
          }}
        >
          {size && (
            <Stage
              key={`${level.id}/${round}`}
              width={size.width}
              height={size.height}
              glyphs={world.glyphs}
              grid={world.grid}
              scale={level.scale}
              chars={charsFor(level)}
              letters={letters}
              onLettersChange={setLetters}
              target={level.letters}
              solution={level.letters}
              shape={shape}
              checks={checks}
              onCheck={onCheck}
              onPass={onPass}
            />
          )}
        </div>
      ) : (
        <div className="message">
          <p>That’s every level for now.</p>
          <button className="pill" onClick={startOver}>
            Start over
          </button>
        </div>
      )}
      {/* Screen transitions and the world menu (lib/director.js). */}
      <div
        ref={layerRef}
        className="motion-layer"
        tabIndex={-1}
        onPointerDown={(e) => director.current?.pointerDown(e)}
        onPointerMove={(e) => director.current?.pointerMove(e)}
        onPointerUp={(e) => director.current?.pointerUp(e)}
        onPointerCancel={(e) => director.current?.pointerUp(e)}
        onKeyDown={(e) => director.current?.keyDown(e)}
      />
      {selecting && (
        <WorldSelect
          completed={completed}
          currentId={playingId}
          onPick={(id) => {
            setSelecting(false);
            play(id);
          }}
          onStartOver={startOver}
          onClose={() => setSelecting(false)}
        />
      )}
    </div>
  );
}
