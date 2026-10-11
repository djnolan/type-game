const R = 6.5;
const STEP = 16;
// The current world's progress ring: a thick arc just inside the outline.
const RING_WIDTH = 2.6;
const RING_R = R + 0.6 - RING_WIDTH / 2;

// stroke-dasharray for a ring filled clockwise from 12 o'clock by `fraction`
// (0–1). Also used by the level-complete transition to animate the fill.
export function ringDash(r, fraction) {
  const c = 2 * Math.PI * r;
  return `${Math.max(0, Math.min(1, fraction)) * c} ${c}`;
}

// One dot per world: completed worlds are filled, the current world has a
// small centre dot with a ring that fills like a donut chart as its levels are
// completed, and future worlds are empty.
export default function ProgressIndicator({ worlds }) {
  const width = STEP * (worlds.length - 1) + 2 * R + 2;
  const label = worlds.map((w) => `World ${w.world}: ${w.state}`).join(', ');
  return (
    <svg width={width} height={2 * R + 2} role="img" aria-label={label}>
      {worlds.map((w, i) => {
        const cx = R + 1 + i * STEP;
        const cy = R + 1;
        if (w.state === 'complete') return <circle key={w.world} cx={cx} cy={cy} r={R + 0.6} className="fill-fg" />;
        return (
          <g key={w.world}>
            <circle cx={cx} cy={cy} r={R} className="fill-none stroke-outline" style={{ strokeWidth: 1.2 }} />
            {w.state === 'current' && (
              <>
                <circle
                  cx={cx}
                  cy={cy}
                  r={RING_R}
                  transform={`rotate(-90 ${cx} ${cy})`}
                  className="fill-none"
                  style={{ stroke: 'var(--fg)', strokeWidth: RING_WIDTH }}
                  strokeDasharray={ringDash(RING_R, w.fraction)}
                  data-progress-ring=""
                  data-r={RING_R}
                />
                <circle cx={cx} cy={cy} r={1.8} className="fill-fg" />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
