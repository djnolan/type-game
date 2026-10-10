import { insideShape, letterOrigin, puzzleScale } from './geometry';

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
// with an accent border. The shimmer band (hidden off to the left until
// animated) is clipped to the letter shapes.
export function solvedFace({ world, level, D, shape }) {
  const id = `f${++uid}`;
  const letters = letterPaths(world, level, D);
  return svg(
    D,
    `<defs><clipPath id="${id}">${board(D, shape)}</clipPath><clipPath id="${id}l">${letters}</clipPath>` +
      `<linearGradient id="${id}g"><stop offset="0" stop-color="var(--bg)" stop-opacity="0"/>` +
      `<stop offset=".5" stop-color="var(--bg)" stop-opacity=".75"/><stop offset="1" stop-color="var(--bg)" stop-opacity="0"/></linearGradient></defs>` +
      board(D, shape, 'class="fill-fg"') +
      `<g clip-path="url(#${id})" class="fill-accent">${letters}</g>` +
      `<g clip-path="url(#${id})"><g clip-path="url(#${id}l)"><rect data-shimmer x="${-D}" y="${-0.3 * D}" width="${0.32 * D}" height="${1.6 * D}" fill="url(#${id}g)" transform="skewX(-20)"/></g></g>` +
      board(D, shape, 'class="fill-none" style="stroke:var(--accent);stroke-width:var(--outline-width)"'),
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

// A completed world's badge. Placeholder until the custom ampersand art per
// world is ready: a UI-font ampersand knocked out of a solid circle.
export function badgeFace({ D }) {
  const r = D / 2;
  return svg(
    D,
    board(D, 'circle', 'class="fill-fg"') +
      `<text x="${r}" y="${r}" text-anchor="middle" dominant-baseline="central" style="font:500 ${Math.round(D * 0.46)}px var(--ui-font);fill:var(--bg)">&amp;</text>`,
  );
}

// A world's number in an outlined circle (placeholder). Locked worlds are muted
// with a dashed outline.
export function numberFace({ n, D, locked = false }) {
  const r = D / 2;
  const ink = locked ? 'var(--muted)' : 'var(--fg)';
  const dash = locked ? ' stroke-dasharray="3 5"' : '';
  return svg(
    D,
    board(D, 'circle', 'class="fill-bg"') +
      `<text x="${r}" y="${r}" text-anchor="middle" dominant-baseline="central" style="font:500 ${Math.round(D * 0.4)}px var(--ui-font);fill:${ink}">${Number(n)}</text>` +
      `<circle cx="${r}" cy="${r}" r="${r}" fill="none" style="stroke:${ink};stroke-width:var(--outline-width)"${dash}/>`,
  );
}
