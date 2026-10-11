// Level marks. Each level rewards its first three checks: solving on check 1
// earns *, on check 2 †, on check 3 ‡. Solving after that passes the level
// with no mark (0). Marks are stored as those numbers: 1, 2, 3 or 0.
//
// Marks are UI, so they're set in DM Sans (500), not the world typeface. The
// Fontsource files lack ‡ (and keep † apart), so styles.css adds both from a
// small supplement (scripts/build-marks-font.py).

export const REWARDED_CHECKS = 3;

const CHARS = ['', '*', '†', '‡'];

// The mark a pass on this check earns.
export const markFor = (check) => (check >= 1 && check <= REWARDED_CHECKS ? check : 0);

// * = 3, † = 2, ‡ = 1, no mark = 0.
export const markScore = (mark) => (mark ? REWARDED_CHECKS + 1 - mark : 0);
export const runScore = (marks) => marks.reduce((sum, m) => sum + markScore(m), 0);
export const isPerfect = (marks) => marks.length > 0 && marks.every((m) => m === 1);

// Outline boxes of DM Sans 500 (opsz 14) in font units, 1000 to the em:
// [x1, y1, x2, y2] with y up.
const BOXES = { 1: [64, 360, 427, 734], 2: [43, -260, 510, 782], 3: [43, -260, 511, 782] };

// Where to set a mark so its outline is centred on (cx, cy), with its longer
// side `size` px. Returns the character, the text's origin and its font size.
export function markLayout(mark, cx, cy, size) {
  const [x1, y1, x2, y2] = BOXES[mark];
  const fontSize = (size * 1000) / Math.max(x2 - x1, y2 - y1);
  const k = fontSize / 1000;
  return { char: CHARS[mark], x: cx - ((x1 + x2) / 2) * k, y: cy + ((y1 + y2) / 2) * k, fontSize };
}

// SVG markup for a mark, filled with `fill` (a CSS color).
export function markSvg(mark, cx, cy, size, fill) {
  if (!mark) return '';
  const { char, x, y, fontSize } = markLayout(mark, cx, cy, size);
  return `<text x="${x}" y="${y}" style="font:500 ${fontSize}px var(--ui-font);fill:${fill}">${char}</text>`;
}
