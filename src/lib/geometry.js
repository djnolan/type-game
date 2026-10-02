// Puzzle space: the circle sits in a D×D box. The grid divides that box into
// `grid` cells per side. A letter's grid point (x, y) is its anchor: the left
// edge of its outline, on the baseline. Glyph outlines are in font units,
// y-down, with the origin at the left of the advance on the baseline.

export const ALPHABET = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];

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

// True if any part of the glyph's bounding box falls inside the circle.
export function glyphTouchesCircle(glyph, ox, oy, s, circle) {
  const [x1, y1, x2, y2] = glyph.bbox;
  const nx = Math.max(ox + x1 * s, Math.min(circle.cx, ox + x2 * s));
  const ny = Math.max(oy + y1 * s, Math.min(circle.cy, oy + y2 * s));
  return Math.hypot(nx - circle.cx, ny - circle.cy) < circle.r;
}

// Same check in abstract puzzle space, for validating level data.
export function letterVisible(glyphs, letter, scale, grid) {
  const D = 1000;
  const glyph = glyphs.glyphs[letter.char];
  const s = puzzleScale(glyphs, scale, D);
  const { ox, oy } = letterOrigin(glyph, letter.x, letter.y, { x0: 0, y0: 0, D }, grid, s);
  return glyphTouchesCircle(glyph, ox, oy, s, { cx: D / 2, cy: D / 2, r: D / 2 });
}

// A check passes only when every letter sits exactly on its solution grid point.
export function matchesSolution(letters, solution) {
  if (letters.length !== solution.length) return false;
  return solution.every((sol) => letters.some((l) => l.char === sol.char && l.x === sol.x && l.y === sol.y));
}

// Screen layout for the gameplay stage, in CSS px.
export function computeLayout(W, H) {
  const trackH = 32;
  const trackBottom = H - 14;
  const trackTop = trackBottom - trackH;
  const trayCap = Math.min(88, W * 0.22);
  const trayBaseline = trackTop + trayCap * 0.52;
  const trayLetterTop = trayBaseline - trayCap;
  const trayZoneTop = trayLetterTop - 14;

  const gap = 22;
  const minTop = 6;
  const minBottom = 30;
  const D = Math.max(96, Math.min(W * 0.62, 440, (trayLetterTop - minTop - gap - minBottom) / 2));
  const spare = Math.max(0, trayLetterTop - minTop - minBottom - gap - 2 * D);
  const top = minTop + spare * 0.3;

  const cx = W / 2;
  const target = { cx, cy: top + D / 2, r: D / 2 };
  const canvas = { cx, cy: top + D + gap + D / 2, r: D / 2 };
  const done = { cx: Math.min(W - 24, cx + D / 2 + 34), cy: canvas.cy - D / 2 - 4, r: 15 };

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
