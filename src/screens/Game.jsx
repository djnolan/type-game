import { useState } from 'react';
import Header from '../components/Header';
import Stage from '../components/Stage';
import { getLevel, getWorld, levels } from '../lib/data';
import { EDITOR_ENABLED } from '../lib/dev';
import { getShape } from '../lib/shape';
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

  const level = testLevel ?? (playingId ? getLevel(playingId) : null);
  const world = level && getWorld(level.world);
  const activeWorld = level?.world ?? levels.at(-1)?.world;

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
      <Header onBack={onBack} worlds={worldStates(completed, activeWorld)} />
      {level ? (
        <div className="stage-host" ref={hostRef}>
          {size && (
            <Stage
              key={`${level.id}/${round}`}
              width={size.width}
              height={size.height}
              glyphs={world.glyphs}
              grid={world.grid}
              scale={level.scale}
              letters={letters}
              onLettersChange={setLetters}
              target={level.letters}
              solution={level.letters}
              shape={EDITOR_ENABLED ? getShape() : 'circle'}
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
