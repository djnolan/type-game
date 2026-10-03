import { useState } from 'react';
import Header from '../components/Header';
import Stage from '../components/Stage';
import WorldSwitcher from '../components/WorldSwitcher';
import { getLevel, getWorld, levels } from '../lib/data';
import { EDITOR_ENABLED } from '../lib/dev';
import { useDevWorld } from '../lib/devWorld';
import { regrid } from '../lib/geometry';
import { currentLevel, useProgress, worldStates } from '../lib/progress';
import { useSize } from '../lib/useSize';

// `testLevel` plays one level outside of progress (the editor's Play test).
export default function Game({ testLevel, onBack }) {
  const { completed, complete, reset } = useProgress();
  const [hostRef, size] = useSize();
  // The level on screen stays put after a pass until the player taps to continue.
  const [playingId, setPlayingId] = useState(() => currentLevel(completed)?.id ?? null);
  const [round, setRound] = useState(0);
  const [letters, setLetters] = useState([]);
  const [previewWorld, setPreviewWorld] = useDevWorld();

  const level = testLevel ?? (playingId ? getLevel(playingId) : null);
  const activeWorld = level?.world ?? levels.at(-1)?.world;
  // Dev preview: play the level in another world's typeface, regridded to its density.
  const world = level && getWorld(EDITOR_ENABLED ? (previewWorld ?? level.world) : level.world);
  const puzzle = level && regrid(level.letters, getWorld(level.world).grid, world.grid);

  function preview(n) {
    setLetters([]);
    setPreviewWorld(level && n === level.world ? null : n);
  }

  function next() {
    setLetters([]);
    setRound((r) => r + 1);
    if (!testLevel) setPlayingId(currentLevel(completed)?.id ?? null);
  }

  function startOver() {
    reset();
    setLetters([]);
    setPlayingId(levels[0]?.id ?? null);
  }

  return (
    <div className="screen">
      {EDITOR_ENABLED && (
        <WorldSwitcher
          value={world?.world ?? previewWorld ?? activeWorld}
          onChange={preview}
          note={level && world.world !== level.world ? `previewing ${level.id}` : null}
        />
      )}
      <Header onBack={onBack} worlds={worldStates(completed, activeWorld)} />
      {level ? (
        <div className="stage-host" ref={hostRef}>
          {size && (
            <Stage
              key={`${level.id}/${world.world}/${round}`}
              width={size.width}
              height={size.height}
              glyphs={world.glyphs}
              grid={world.grid}
              scale={level.scale}
              letters={letters}
              onLettersChange={setLetters}
              target={puzzle}
              solution={puzzle}
              onPass={() => !testLevel && complete(level.id)}
              onContinue={next}
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
    </div>
  );
}
