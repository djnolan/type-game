import { lazy, Suspense, useEffect, useState } from 'react';
import Game from './screens/Game';
import { getLevel } from './lib/data';
import { EDITOR_ENABLED } from './lib/dev';
import { loadDraft } from './lib/draft';

const Editor = EDITOR_ENABLED ? lazy(() => import('./screens/Editor')) : null;

function useHash() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const onChange = () => setHash(location.hash);
    addEventListener('hashchange', onChange);
    return () => removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

export default function App() {
  const hash = useHash();

  if (EDITOR_ENABLED) {
    if (hash === '#/editor') {
      return (
        <Suspense fallback={null}>
          <Editor />
        </Suspense>
      );
    }
    // #/play/draft plays the editor's draft; #/play/<level id> plays any level.
    const play = hash.match(/^#\/play\/(.+)$/);
    if (play) {
      const level = play[1] === 'draft' ? loadDraft() : getLevel(decodeURIComponent(play[1]));
      if (level) return <Game key={hash} testLevel={level} onBack={() => (location.hash = '#/editor')} />;
    }
  }

  // Back has nowhere to go until the title and level-select screens exist.
  return <Game onBack={() => {}} />;
}
