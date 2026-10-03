import { worlds } from '../lib/data';

function Asterisk({ glyphs, size }) {
  const g = glyphs.glyphs['*'];
  const [x1, y1, x2, y2] = g.bbox;
  const s = (size * 0.8) / Math.max(x2 - x1, y2 - y1);
  const ox = size / 2 - ((x1 + x2) / 2) * s;
  const oy = size / 2 - ((y1 + y2) / 2) * s;
  return (
    <svg width={size} height={size} aria-hidden="true">
      <path d={g.d} transform={`translate(${ox} ${oy}) scale(${s})`} />
    </svg>
  );
}

// Dev-only: one button per world, labeled with its number and its typeface's
// asterisk, plus a line naming the selected world's typeface and grid.
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
            <Asterisk glyphs={w.glyphs} size={14} />
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
