const R = 6.5;
const STEP = 16;

// Path for a dot filled clockwise from 12 o'clock by `fraction` (0–1). Also
// used by the level-complete transition to animate the fill.
export function piePath(cx, cy, r, fraction) {
  if (fraction <= 0) return '';
  if (fraction >= 1) return `M${cx} ${cy - r}A${r} ${r} 0 1 1 ${cx} ${cy + r}A${r} ${r} 0 1 1 ${cx} ${cy - r}Z`;
  const a = fraction * 2 * Math.PI;
  const x = cx + r * Math.sin(a);
  const y = cy - r * Math.cos(a);
  const large = fraction > 0.5 ? 1 : 0;
  return `M${cx} ${cy}V${cy - r}A${r} ${r} 0 ${large} 1 ${x} ${y}Z`;
}

// The world's badge: its typeface's own asterisk, knocked out of a filled dot.
function Badge({ cx, cy, glyphs }) {
  const g = glyphs.glyphs['*'];
  const [x1, y1, x2, y2] = g.bbox;
  const s = (R * 1.35) / Math.max(x2 - x1, y2 - y1);
  const ox = cx - ((x1 + x2) / 2) * s;
  const oy = cy - ((y1 + y2) / 2) * s;
  return (
    <>
      <circle cx={cx} cy={cy} r={R} className="fill-fg" />
      <path d={g.d} transform={`translate(${ox} ${oy}) scale(${s})`} className="fill-bg" />
    </>
  );
}

// One dot per world: completed worlds show their asterisk badge, the current
// world fills like a pie as levels are completed, future worlds are empty.
export default function ProgressIndicator({ worlds }) {
  const width = STEP * (worlds.length - 1) + 2 * R + 2;
  const label = worlds.map((w) => `World ${w.world}: ${w.state}`).join(', ');
  return (
    <svg width={width} height={2 * R + 2} role="img" aria-label={label}>
      {worlds.map((w, i) => {
        const cx = R + 1 + i * STEP;
        const cy = R + 1;
        if (w.state === 'complete') return <Badge key={w.world} cx={cx} cy={cy} glyphs={w.glyphs} />;
        return (
          <g key={w.world}>
            {w.state === 'current' && (
              <path d={piePath(cx, cy, R, w.fraction)} className="fill-fg" data-progress-pie="" data-cx={cx} data-cy={cy} data-r={R} />
            )}
            <circle cx={cx} cy={cy} r={R} className="fill-none stroke-outline" style={{ strokeWidth: 1.2 }} />
          </g>
        );
      })}
    </svg>
  );
}
