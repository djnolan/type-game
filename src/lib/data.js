import worldList from '../data/worlds.json';

const glyphModules = import.meta.glob('../data/glyphs/*.json', { eager: true, import: 'default' });
const levelModules = import.meta.glob('../data/levels/*.json', { eager: true, import: 'default' });

export const typefaces = Object.fromEntries(Object.values(glyphModules).map((t) => [t.id, t]));

export const worlds = worldList.map((w) => ({
  ...w,
  glyphs: typefaces[w.typeface],
  levels: Object.keys(levelModules)
    .sort()
    .map((p) => levelModules[p])
    .filter((l) => l.world === w.world),
}));

// All levels in play order.
export const levels = worlds.flatMap((w) => w.levels);

export function getWorld(n) {
  return worlds.find((w) => w.world === n);
}

export function getLevel(id) {
  return levels.find((l) => l.id === id);
}

// Levels are { id, world, scale, letters: [{ char, x, y }] }.
// scale: cap height as a fraction of the circle diameter.
// x, y: grid position of the letter's anchor (left edge of its outline, on the baseline).
export function validateLevel(level) {
  const errors = [];
  if (!level || typeof level !== 'object') return ['Level must be an object'];
  if (typeof level.id !== 'string' || !level.id) errors.push('id must be a non-empty string');
  if (!getWorld(level.world)) errors.push(`world must be 1–${worlds.length}`);
  if (!(level.scale > 0)) errors.push('scale must be a positive number');
  if (!Array.isArray(level.letters)) return [...errors, 'letters must be an array'];
  const seen = new Set();
  for (const l of level.letters) {
    if (!/^[A-Z]$/.test(l.char)) errors.push(`invalid letter "${l.char}"`);
    if (seen.has(l.char)) errors.push(`letter ${l.char} is used twice`);
    seen.add(l.char);
    if (!Number.isInteger(l.x) || !Number.isInteger(l.y)) errors.push(`${l.char} needs integer x and y`);
  }
  return errors;
}

if (import.meta.env.DEV) {
  for (const l of levels) {
    const errors = validateLevel(l);
    if (errors.length) console.warn(`Level ${l.id}:`, errors);
  }
}
