import { insideShape, letterOrigin, puzzleScale } from './geometry';
import { markSvg } from './marks';
import { transitions as T } from '../motion';
import badgeArt from '../data/badges.json';

// SVG markup for the circles the transition layer flips and moves around
// (lib/director.js). Each face is drawn D px across, to match the gameplay
// stage, so a stand-in circle lines up exactly with the one it replaces.
// The markup is built from generated glyph path data and numbers only.

let uid = 0;

function board(D, shape, attrs) {
  const r = D / 2;
  if (shape === 'square') return `<rect x="0" y="0" width="${D}" height="${D}" ${attrs}/>`;
  return `<circle cx="${r}" cy="${r}" r="${r}" ${attrs}/>`;
}

function letterPaths(world, level, D, attrs = '') {
  const s = puzzleScale(world.glyphs, level.scale, D);
  const box = { x0: 0, y0: 0, D };
  return level.letters
    .map((l) => {
      const glyph = world.glyphs.glyphs[l.char];
      const { ox, oy } = letterOrigin(glyph, l.x, l.y, box, world.grid, s);
      return `<path d="${glyph.d}" transform="translate(${ox} ${oy}) scale(${s})" ${attrs}/>`;
    })
    .join('');
}

function svg(D, body) {
  return `<svg width="${D}" height="${D}" viewBox="0 0 ${D} ${D}" overflow="visible" aria-hidden="true">${body}</svg>`;
}

// The target, as on the stage: letters knocked out of a solid circle.
export function targetFace({ world, level, D, shape }) {
  const id = `f${++uid}`;
  return svg(
    D,
    `<defs><clipPath id="${id}">${board(D, shape)}</clipPath></defs>` +
      board(D, shape, 'class="fill-fg"') +
      `<g clip-path="url(#${id})" class="fill-bg">${letterPaths(world, level, D)}</g>` +
      board(D, shape, 'class="fill-none stroke-outline"'),
  );
}

// A correct match: the player's accent letters fill the target's knockouts,
// with a shimmer band (off to the left until animated) clipped to the letters.
// Solved with a mark, it also holds an accent fill (radius 0 until animated)
// and the mark on top, over a faint full asterisk, scaled to 0 until it pops in.
export function solvedFace({ world, level, mark, D, shape }) {
  const id = `f${++uid}`;
  const letters = letterPaths(world, level, D);
  const r = D / 2;
  const marked = mark
    ? `<g clip-path="url(#${id})" class="fill-accent"><circle data-fill cx="${r}" cy="${r}" r="0"/></g>` +
      `<g data-mark transform="translate(${r} ${r}) scale(0)">${markSvg(mark, 0, 0, D * T.markPop.size, 'var(--bg)', { ghost: T.markPop.ghostOpacity })}</g>`
    : '';
  return svg(
    D,
    `<defs><clipPath id="${id}">${board(D, shape)}</clipPath><clipPath id="${id}l">${letters}</clipPath>` +
      `<linearGradient id="${id}g"><stop offset="0" stop-color="var(--shine)" stop-opacity="0"/>` +
      `<stop offset=".5" stop-color="var(--shine)" stop-opacity="${T.shimmer.opacity}"/><stop offset="1" stop-color="var(--shine)" stop-opacity="0"/></linearGradient></defs>` +
      board(D, shape, 'class="fill-fg"') +
      `<g clip-path="url(#${id})" class="fill-accent">${letters}</g>` +
      `<g clip-path="url(#${id})"><g clip-path="url(#${id}l)"><rect data-shimmer x="${-D}" y="${-0.3 * D}" width="${0.32 * D}" height="${1.6 * D}" fill="url(#${id}g)" transform="skewX(-20)"/></g></g>` +
      marked +
      board(D, shape, 'class="fill-none stroke-outline"'),
  );
}

// The canvas: dot grid, plus the player's letters if there are any.
export function canvasFace({ world, level, letters = [], D, shape }) {
  const id = `f${++uid}`;
  const cell = D / world.grid;
  const c = { cx: D / 2, cy: D / 2, r: D / 2 };
  let dots = '';
  for (let i = 0; i <= world.grid; i++) {
    for (let j = 0; j <= world.grid; j++) {
      const x = i * cell;
      const y = j * cell;
      if (insideShape(x, y, c, shape, 3)) dots += `<circle cx="${x}" cy="${y}" r="1.2"/>`;
    }
  }
  return svg(
    D,
    `<defs><clipPath id="${id}">${board(D, shape)}</clipPath></defs>` +
      board(D, shape, 'class="fill-bg"') +
      `<g class="fill-grid-dot">${dots}</g>` +
      `<g clip-path="url(#${id})" class="fill-fg">${letterPaths(world, { ...level, letters }, D)}</g>` +
      board(D, shape, 'class="fill-none stroke-outline"'),
  );
}

// A world's circle on the menu, the world complete screen and the swap to
// the next world, from Dan's badge art. Each world has its own ampersand, cut
// from the world's typeface and cropped by the circle (outline in
// data/badges.json, in a space where the circle is centred on 0 0 with radius 1).
//
// `state` is one of:
// - 'locked': dashed outline, faint ampersand and a lock.
// - 'open': paper circle with an accent outline and a faint ampersand. The
//   accent arc grows clockwise from the top by one level's share for each
//   level passed in `slots`. The menu sets its Play button over the middle.
// - 'complete': ink circle with a paper ampersand, and the asterisks from
//   `slots`: a level with a mark gets an accent dot with the mark's asterisk,
//   at the end of its level's share; a level with no mark leaves its spot empty.
//
// `slots` has one entry per level, in order: the mark the level earned
// (lib/marks.js), or null if it hasn't been passed. `ribbon` hangs the ribbon
// behind the circle (for a perfect run; the world complete screen drops its
// ribbon in separately).

const RING = { outer: 1, inner: 0.947 };
const DOT = { at: 0.81, r: 0.1286, mark: 0.1237 };
export const RIBBON = { half: 0.1778, top: 0.769, bottom: 1.48, notch: 0.0444 };
const FAINT = { amp: 0.15, outline: 0.5 };
// Lucide's lock, in its 24-unit grid, drawn this wide in circle radii. Its
// body is filled with paper so the ampersand doesn't show through.
const LOCK = { body: 'M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z', shackle: 'M7 11V7a5 5 0 0 1 10 0v4', size: 0.415 };

// How far round from the top the arc reaches: a share per level passed.
export function arcFraction(slots) {
  return slots.length ? slots.filter((m) => m != null).length / slots.length : 0;
}

const fmt = (v) => +v.toFixed(4);

function artPath(part, attrs) {
  return `<path d="${part.d}" transform="matrix(${part.scale} 0 0 ${part.scale} ${part.x} ${part.y})" ${attrs}/>`;
}

// `outer` lets the ring reach just past the circle, to cover its outline.
function arc(fraction, outer = RING.outer) {
  const rc = fmt((outer + RING.inner) / 2);
  const w = fmt(outer - RING.inner);
  if (fraction >= 1) return `<circle r="${rc}" fill="none" stroke-width="${w}" style="stroke:var(--accent)"/>`;
  const a = fraction * Math.PI * 2;
  const end = `${fmt(Math.sin(a) * rc)} ${fmt(-Math.cos(a) * rc)}`;
  return `<path d="M0 ${-rc}A${rc} ${rc} 0 ${fraction > 0.5 ? 1 : 0} 1 ${end}" fill="none" stroke-width="${w}" style="stroke:var(--accent)"/>`;
}

function dots(slots) {
  return slots
    .map((m, i) => {
      if (!m) return '';
      const a = ((i + 1) / slots.length) * Math.PI * 2;
      const x = fmt(Math.sin(a) * DOT.at);
      const y = fmt(-Math.cos(a) * DOT.at);
      return (
        `<circle cx="${x}" cy="${y}" r="${DOT.r}" class="fill-accent"/>` +
        markSvg(m, x, y, DOT.mark, 'var(--bg)')
      );
    })
    .join('');
}

export function ribbonPath() {
  const { half: h, top, bottom: b, notch } = RIBBON;
  return `M${-h} ${top}H${h}V${b}L${fmt(h / 2)} ${fmt(b - notch)}L0 ${b}L${fmt(-h / 2)} ${fmt(b - notch)}L${-h} ${b}Z`;
}

export function worldFace({ n, D, state, slots = [], ribbon = false }) {
  const id = `f${++uid}`;
  const r = D / 2;
  const art = badgeArt[n];
  const complete = state === 'complete';
  const amp = art ? artPath(art.amp, complete ? 'class="fill-bg"' : `class="fill-fg" opacity="${FAINT.amp}"`) : '';
  let outline = board(D, 'circle', 'class="fill-none stroke-outline"');
  if (state === 'locked')
    outline = `<circle cx="${r}" cy="${r}" r="${r}" fill="none" stroke-linecap="round" stroke-dasharray="${fmt(D * 0.0178)} ${fmt(D * 0.0356)}" opacity="${FAINT.outline}" style="stroke:var(--fg);stroke-width:var(--outline-width)"/>`;
  else if (state === 'open')
    outline = `<circle cx="${r}" cy="${r}" r="${r}" fill="none" style="stroke:var(--accent);stroke-width:var(--outline-width)"/>`;
  const fraction = state === 'open' ? arcFraction(slots) : 0;
  // Its outer edge reaches 1px past the circle, over the outline.
  const ring = fraction > 0 ? arc(fraction, RING.outer + 1 / r) : '';
  const k = LOCK.size / 24;
  const lock =
    state === 'locked'
      ? `<g transform="scale(${fmt(k)}) translate(-12 -12)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="stroke:var(--fg)">` +
        `<path d="${LOCK.shackle}" fill="none"/><path d="${LOCK.body}" class="fill-bg"/></g>`
      : '';
  const unit = (body) => `<g transform="translate(${r} ${r}) scale(${r})">${body}</g>`;
  return svg(
    D,
    `<defs><clipPath id="${id}"><circle r="1"/></clipPath></defs>` +
      (ribbon ? unit(`<path d="${ribbonPath()}" class="fill-accent"/>`) : '') +
      board(D, 'circle', `class="${complete ? 'fill-fg' : 'fill-bg'}"`) +
      unit(`<g clip-path="url(#${id})">${amp}</g>`) +
      outline +
      unit(ring + lock + (complete ? dots(slots) : '')),
  );
}
