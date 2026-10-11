import { worlds } from '../lib/data';

// Dev-only: one button per world, labeled with its number, plus a line naming
// the selected world's typeface and grid.
export default function WorldSwitcher({ value, onChange, note }) {
  const current = worlds.find((w) => w.world === value);
  return (
    <div className="world-switcher">
      <div className="world-switcher-buttons" role="radiogroup" aria-label="World">
        {worlds.map((w) => (
          <button
            key={w.world}
            role="radio"
            aria-checked={w.world === value}
            title={`World ${w.world} · ${w.name} · ${w.glyphs.name}`}
            onClick={() => onChange(w.world)}
          >
            {w.world}
          </button>
        ))}
      </div>
      {current && (
        <div className="world-switcher-label">
          {current.name} · {current.glyphs.name} · grid {current.grid}
          {note && <> · {note}</>}
        </div>
      )}
    </div>
  );
}
