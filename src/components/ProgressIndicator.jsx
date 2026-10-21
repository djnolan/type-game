// One dot per world. Size marks the world being played: it gets a large dot,
// and the others are small. Played worlds are ink, worlds still to play are
// faint. The current world's dot carries an accent ring, just inside its edge,
// that fills like a donut chart as its levels are completed.
const R = 6.5; // the current world's dot
const r = 2.75; // every other world's dot
const GAP = 7.5; // between neighbouring dots' edges
const RING_WIDTH = 2.6;
const RING_R = R - RING_WIDTH / 2;

// stroke-dasharray for a ring filled clockwise from 12 o'clock by `fraction`
// (0–1). Also used by the level-complete transition to animate the fill.
export function ringDash(radius, fraction) {
  const c = 2 * Math.PI * radius;
  return `${Math.max(0, Math.min(1, fraction)) * c} ${c}`;
}

export default function ProgressIndicator({ worlds }) {
  const radii = worlds.map((w) => (w.state === 'current' ? R : r));
  const centres = [];
  let x = 1;
  radii.forEach((rad, i) => {
    if (i) x += GAP;
    centres.push(x + rad);
    x += 2 * rad;
  });
  const width = x + 1;
  const cy = R + 1;
  const label = worlds.map((w) => `World ${w.world}: ${w.state}`).join(', ');
  return (
    <svg width={width} height={2 * R + 2} role="img" aria-label={label}>
      {worlds.map((w, i) => {
        const cx = centres[i];
        if (w.state !== 'current') {
          return <circle key={w.world} cx={cx} cy={cy} r={radii[i]} className={w.state === 'complete' ? 'fill-fg' : 'fill-faint'} />;
        }
        return (
          <g key={w.world}>
            <circle cx={cx} cy={cy} r={R} className="fill-fg" />
            <circle
              cx={cx}
              cy={cy}
              r={RING_R}
              transform={`rotate(-90 ${cx} ${cy})`}
              className="fill-none"
              style={{ stroke: 'var(--accent)', strokeWidth: RING_WIDTH }}
              strokeDasharray={ringDash(RING_R, w.fraction)}
              data-progress-ring=""
              data-r={RING_R}
            />
          </g>
        );
      })}
    </svg>
  );
}
