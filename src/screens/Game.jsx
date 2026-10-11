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
import { currentLevel, loadCurrentId, nextLevel, saveCurrentId, useProgress, worldStates } from '../lib/progress';
import { useSize } from '../lib/useSize';

const doneIn = (w, completed) => w.levels.filter((l) => completed.has(l.id)).length;

// `testLevel` plays one level outside of progress (the editor's Play test).
export default function Game({ testLevel, onBack }) {
  const { completed, complete, reset } = useProgress();
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

  function play(id) {
    setLetters([]);
    setRound((r) => r + 1);
    setPlayingId(id);
  }

  // Switches the stage to another level synchronously, so the director can
  // take hold of the new stage's parts straight away.
  const swapTo = (id) => () => flushSync(() => play(id));

  function startOver() {
    reset();
    setSelecting(false);
    play(levels[0]?.id ?? null);
  }

  // A correct match: level complete, or world complete on a world's last level.
  function onPass() {
    const from = { world, level };
    if (testLevel) {
      director.current.levelComplete({
        from,
        to: from,
        progress: { from: 0, to: 0 },
        swap: () =>
          flushSync(() => {
            setLetters([]);
            setRound((r) => r + 1);
          }),
        release() {},
      });
      return;
    }

    const wasDone = completed.has(level.id);
    const after = new Set(completed).add(level.id);
    complete(level.id);
    if (!wasDone) setHeldId(level.id);
    const release = () => setHeldId(null);
    const total = world.levels.length;
    const progress = { from: doneIn(world, completed) / total, to: doneIn(world, after) / total };
    const next = nextLevel(after, level.id);

    if (world.levels.at(-1).id === level.id) {
      director.current.worldComplete({
        from,
        progress,
        release,
        onContinue: () =>
          director.current.nextWorld({
            to: next && { world: getWorld(next.world), level: next },
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
      const family = w.typeface.family;
      let sub = `${family} · Locked`;
      if (isComplete) sub = `${family} · Complete`;
      else if (selectable) sub = `${family} · Level ${w.levels.indexOf(entryLevel(w)) + 1} of ${total}`;
      return {
        world: w,
        face: isComplete ? 'badge' : selectable ? 'number' : 'locked',
        label: `World ${w.world} · ${w.name}`,
        sub,
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
