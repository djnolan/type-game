import { useState } from 'react';
import Header from '../components/Header';
import Stage from '../components/Stage';
import WorldSelect from '../components/WorldSelect';
import { charsFor } from '../lib/charsets';
import { getLevel, getWorld, levels } from '../lib/data';
import { EDITOR_ENABLED } from '../lib/dev';
import { getShape } from '../lib/shape';
import { currentLevel, loadCurrentId, nextLevel, saveCurrentId, useProgress, worldStates } from '../lib/progress';
import { useSize } from '../lib/useSize';

// `testLevel` plays one level outside of progress (the editor's Play test).
export default function Game({ testLevel, onBack }) {
  const { completed, complete, reset } = useProgress();
  const [hostRef, size] = useSize();
  // The level on screen stays put after a pass until the player taps to continue.
  // A level picked in world select is remembered across reloads.
  const [playingId, setPlayingIdState] = useState(() => {
    const saved = loadCurrentId();
    return (saved && getLevel(saved) ? saved : currentLevel(completed)?.id) ?? null;
  });
  const [round, setRound] = useState(0);
  const [letters, setLetters] = useState([]);
  const [selecting, setSelecting] = useState(false);

  const setPlayingId = (id) => {
    saveCurrentId(id);
    setPlayingIdState(id);
  };

  const level = testLevel ?? (playingId ? getLevel(playingId) : null);
  const world = level && getWorld(level.world);
  const activeWorld = level?.world ?? levels.at(-1)?.world;

  function play(id) {
    setLetters([]);
    setRound((r) => r + 1);
    setPlayingId(id);
  }

  function next() {
    if (testLevel) {
      setLetters([]);
      setRound((r) => r + 1);
    } else {
      play(nextLevel(completed, playingId)?.id ?? null);
    }
  }

  function startOver() {
    reset();
    setSelecting(false);
    play(levels[0]?.id ?? null);
  }

  return (
    <div className="screen">
      <Header
        onBack={onBack}
        worlds={worldStates(completed, activeWorld)}
        onWorlds={testLevel ? undefined : () => setSelecting(true)}
      />
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
              chars={charsFor(level)}
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
