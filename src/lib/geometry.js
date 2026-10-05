import { tray as trayConfig } from '../layout';

// Puzzle space: the circle sits in a D×D box. The grid divides that box into
// `grid` cells per side. A letter's grid point (x, y) is its anchor: the left
// edge of its outline, on the baseline. Glyph outlines are in font units,
// y-down, with the origin at the left of the advance on the baseline.
//
// Because the anchor is on the baseline, every character sits the same way:
// capitals, x-height letters and figures rest on it, ascenders rise above it
// and descenders (g, p, y, oldstyle figures) hang below it.

// Pixels per font unit for a level's letter scale (cap height / diameter).
export function puzzleScale(glyphs, scale, D) {
  return (scale * D) / glyphs.capHeight;
}

// Glyph origin in px for a letter on a circle whose bounding box starts at (x0, y0).
export function letterOrigin(glyph, gx, gy, box, grid, s) {
  const cell = box.D / grid;
  return { ox: box.x0 + gx * cell - glyph.bbox[0] * s, oy: box.y0 + gy * cell };
}

// Nearest grid point for a glyph whose origin is at (ox, oy).
export function snapToGrid(glyph, ox, oy, box, grid, s) {
  const cell = box.D / grid;
  return {
    x: Math.round((ox + glyph.bbox[0] * s - box.x0) / cell),
    y: Math.round((oy - box.y0) / cell),
  };
}

// True if any part of the glyph's bounding box falls inside the circle, or
// inside its bounding square when the board shape is 'square' (temporary test).
export function glyphTouchesCircle(glyph, ox, oy, s, circle, shape = 'circle') {
  const [x1, y1, x2, y2] = glyph.bbox;
  const nx = Math.max(ox + x1 * s, Math.min(circle.cx, ox + x2 * s));
  const ny = Math.max(oy + y1 * s, Math.min(circle.cy, oy + y2 * s));
  if (shape === 'square') return Math.abs(nx - circle.cx) < circle.r && Math.abs(ny - circle.cy) < circle.r;
  return Math.hypot(nx - circle.cx, ny - circle.cy) < circle.r;
}

// True if any of the glyph's actual outline shows inside the board shape, not
// just its bounding box, so a letter is never placed where it can't be seen
// or picked up. Samples a grid of points `step` px apart.
const paths = new Map();
let hitCtx;
export function glyphShowsInShape(glyph, ox, oy, s, circle, shape = 'circle', step = 2) {
  if (typeof Path2D === 'undefined') return true;
  hitCtx ??= document.createElement('canvas').getContext('2d');
  if (!paths.has(glyph.d)) paths.set(glyph.d, new Path2D(glyph.d));
  const path = paths.get(glyph.d);
  const [x1, y1, x2, y2] = glyph.bbox;
  const left = Math.max(ox + x1 * s, circle.cx - circle.r);
  const right = Math.min(ox + x2 * s, circle.cx + circle.r);
  const top = Math.max(oy + y1 * s, circle.cy - circle.r);
  const bottom = Math.min(oy + y2 * s, circle.cy + circle.r);
  for (let y = top; y <= bottom; y += step) {
    for (let x = left; x <= right; x += step) {
      if (insideShape(x, y, circle, shape) && hitCtx.isPointInPath(path, (x - ox) / s, (y - oy) / s)) return true;
    }
  }
  return false;
}

// True if point (x, y) is inside the board shape.
export function insideShape(x, y, circle, shape = 'circle', inset = 0) {
  const r = circle.r - inset;
  if (shape === 'square') return Math.abs(x - circle.cx) < r && Math.abs(y - circle.cy) < r;
  return Math.hypot(x - circle.cx, y - circle.cy) < r;
}

// Same check in abstract puzzle space, for validating level data.
export function letterVisible(glyphs, letter, scale, grid, shape = 'circle') {
  const D = 1000;
  const glyph = glyphs.glyphs[letter.char];
  const s = puzzleScale(glyphs, scale, D);
  const { ox, oy } = letterOrigin(glyph, letter.x, letter.y, { x0: 0, y0: 0, D }, grid, s);
  return glyphTouchesCircle(glyph, ox, oy, s, { cx: D / 2, cy: D / 2, r: D / 2 }, shape);
}

// A check passes only when every letter sits exactly on its solution grid point.
export function matchesSolution(letters, solution) {
  if (letters.length !== solution.length) return false;
  return solution.every((sol) => letters.some((l) => l.char === sol.char && l.x === sol.x && l.y === sol.y));
}

// How far the world's characters reach above the baseline, in cap heights,
// so the tray can fit the tallest ascender.
export function glyphExtent(glyphs) {
  let above = 1;
  for (const [char, g] of Object.entries(glyphs.glyphs)) {
    if (char !== '*') above = Math.max(above, -g.bbox[1] / glyphs.capHeight);
  }
  return { above };
}

// Screen layout for the gameplay stage, in CSS px. Tray values are in src/layout.js.
export function computeLayout(W, H, shape = 'circle', extent = { above: 1.15 }) {
  const t = trayConfig;
  const trackH = t.trackHeight;
  const trackBottom = H - t.bottomMargin;
  const trackTop = trackBottom - trackH;
  const trayCap = Math.min(t.capHeight, W * t.capHeightMaxWidthFraction);
  const trayBaseline = trackTop - t.baselineAboveTrack;
  const trayLetterTop = trayBaseline - extent.above * trayCap;
  const trayZoneTop = trayLetterTop - t.pickUpMargin;

  const gap = 22;
  const minTop = 6;
  const minBottom = 30;
  const D = Math.max(96, Math.min(W * 0.62, 440, (trayLetterTop - minTop - gap - minBottom) / 2));
  const spare = Math.max(0, trayLetterTop - minTop - minBottom - gap - 2 * D);
  const top = minTop + spare * 0.3;

  const cx = W / 2;
  const target = { cx, cy: top + D / 2, r: D / 2 };
  const canvas = { cx, cy: top + D + gap + D / 2, r: D / 2 };
  // A square board fills its top-right corner, so Done drops to beside the
  // canvas's vertical middle when the board shape is 'square' (temporary test).
  const done =
    shape === 'square'
      ? { cx: Math.min(W - 20, cx + D / 2 + 30), cy: canvas.cy, r: 15 }
      : { cx: Math.min(W - 24, cx + D / 2 + 34), cy: canvas.cy - D / 2 - 4, r: 15 };

  return {
    W,
    H,
    D,
    target,
    canvas,
    canvasBox: { x0: canvas.cx - D / 2, y0: canvas.cy - D / 2, D },
    targetBox: { x0: target.cx - D / 2, y0: target.cy - D / 2, D },
    done,
    tray: { trackTop, trackBottom, trackH, cap: trayCap, baseline: trayBaseline, letterTop: trayLetterTop, zoneTop: trayZoneTop },
    // Letters dropped below this line go back to the tray. Above it, they are full puzzle size.
    dropBottom: Math.min(canvas.cy + D / 2 + D * 0.3, trayZoneTop - 4),
  };
}

// Moves letters to the matching points on another grid density, so a
// composition keeps its layout when it's previewed or moved to another world.
export function regrid(letters, fromGrid, toGrid) {
  if (fromGrid === toGrid) return letters;
  const k = toGrid / fromGrid;
  return letters.map((l) => ({ ...l, x: Math.round(l.x * k), y: Math.round(l.y * k) }));
}
