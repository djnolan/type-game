import Asterisk from './Asterisk';
import { worlds } from '../lib/data';

// Placeholder world select, opened from the progress indicator. Jump to any
// world or level, or clear progress and start again from the first level.
// Skipping ahead doesn't mark the levels in between as completed.
export default function WorldSelect({ completed, currentId, onPick, onStartOver, onClose }) {
  return (
    <div className="overlay" role="dialog" aria-label="Worlds">
      <div className="overlay-head">
        <h2>Worlds</h2>
        <button className="icon-button" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 20 20">
            <path d="M4.5 4.5l11 11M15.5 4.5l-11 11" className="fill-none stroke-outline" style={{ strokeWidth: 1.8 }} />
          </svg>
        </button>
      </div>
      <ul className="world-list">
        {worlds.map((w) => {
          const done = w.levels.filter((l) => completed.has(l.id)).length;
          const first = w.levels.find((l) => !completed.has(l.id)) ?? w.levels[0];
          return (
            <li key={w.world}>
              <button className="world-row" disabled={!first} onClick={() => onPick(first.id)}>
                <Asterisk glyphs={w.glyphs} size={28} className="fill-fg" />
                <span className="world-name">
                  World {w.world} · {w.name}
                  <span className="world-meta">
                    {w.typeface.family} ·{' '}
                    {w.levels.length ? `${done}/${w.levels.length} levels` : 'No levels yet'}
                  </span>
                </span>
              </button>
              {w.levels.length > 0 && (
                <div className="level-chips">
                  {w.levels.map((l, i) => (
                    <button
                      key={l.id}
                      className="level-chip"
                      aria-current={l.id === currentId || undefined}
                      data-done={completed.has(l.id) || undefined}
                      title={l.id}
                      onClick={() => onPick(l.id)}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <button className="pill" onClick={onStartOver}>
        Start over from world 1
      </button>
      <p className="overlay-note">Start over clears all saved progress.</p>
    </div>
  );
}
