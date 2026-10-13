// Level marks. The mark is the DM Sans asterisk, which loses a line for each
// miss: solving on check 1 keeps all 3 of its lines, check 2 keeps 2, check 3
// keeps 1, and after that the level passes with no mark. A mark is stored as
// its number of lines (3, 2, 1 or 0), which is also its score.

export const REWARDED_CHECKS = 3;

// The mark a pass on this check earns.
export const markFor = (check) => (check >= 1 && check <= REWARDED_CHECKS ? REWARDED_CHECKS + 1 - check : 0);

export const markScore = (mark) => mark;
export const runScore = (marks) => marks.reduce((sum, m) => sum + markScore(m), 0);
export const isPerfect = (marks) => marks.length > 0 && marks.every((m) => m === REWARDED_CHECKS);

// The asterisk outline from DM Sans 500, in font units (1000 to the em), with
// y down and centred on its own bounds (the font sets it raised, near the cap
// height). Its 6 arms make 3 lines through the centre.
const ASTERISK =
  'M39.5 187L-35.5 187L-21.5 38L-141.5 126L-181.5 56L-45.5 -2L-180.5 -58L-142.5 -125L-20.5 -38L-36.5 -187L40.5 -187' +
  'L23.5 -38L144.5 -125L181.5 -59L45.5 -1L181.5 57L143.5 125L23.5 38L39.5 187Z';
// Its longer side (it's 363 × 374).
const EXTENT = 374;

// The direction of each line in degrees (y down), in the order they're
// removed: one diagonal, then the other. The vertical is always the last left.
const LINES = [-30, 30, 90];
// Each arm sits in a 60° wedge, so a line is two opposite 30°-half-angle wedges.
const HALF = 30;
const REACH = 400;
// Wedges meet in a point, which would pinch a remaining line where it passes
// the centre. So each kept line's clip also has a bridge across the centre, as
// wide as its arms where they meet the hub, and the line stays whole.
const BRIDGE = { half: 22, reach: 45 };

function wedge(deg) {
  const pt = (a) => `${(Math.cos((a * Math.PI) / 180) * REACH).toFixed(1)} ${(Math.sin((a * Math.PI) / 180) * REACH).toFixed(1)}`;
  return `M0 0L${pt(deg - HALF)}L${pt(deg + HALF)}Z`;
}

function bridge(deg) {
  const a = (deg * Math.PI) / 180;
  const [ux, uy, vx, vy] = [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a)];
  const pt = (s, t) => `${(ux * s * BRIDGE.reach + vx * t * BRIDGE.half).toFixed(1)} ${(uy * s * BRIDGE.reach + vy * t * BRIDGE.half).toFixed(1)}`;
  return `M${pt(-1, -1)}L${pt(1, -1)}L${pt(1, 1)}L${pt(-1, 1)}Z`;
}

let uid = 0;

// SVG markup for a mark centred on (cx, cy), with its longer side `size` px,
// filled with `fill` (a CSS color). The lines a mark has lost are hidden with
// wedge-shaped clips over their arms, not redrawn. `ghost` > 0 draws the full
// asterisk underneath at that opacity, so its whole shape stays visible.
// `scale` scales it about its centre (for popping in).
export function markSvg(mark, cx, cy, size, fill, { ghost = 0, scale = 1, attrs = '' } = {}) {
  if (!mark) return '';
  const k = size / EXTENT;
  const kept = LINES.slice(LINES.length - mark);
  let clip = '';
  let defs = '';
  if (kept.length < LINES.length) {
    const id = `mark${++uid}`;
    const shape = kept.flatMap((a) => [wedge(a), wedge(a + 180), bridge(a)]).join('');
    defs = `<defs><clipPath id="${id}"><path d="${shape}"/></clipPath></defs>`;
    clip = ` clip-path="url(#${id})"`;
  }
  return (
    `<g ${attrs} transform="translate(${cx} ${cy}) scale(${scale})"><g transform="scale(${k})" style="fill:${fill}">${defs}` +
    (ghost > 0 && clip ? `<path d="${ASTERISK}" opacity="${ghost}"/>` : '') +
    `<path d="${ASTERISK}"${clip}/></g></g>`
  );
}
