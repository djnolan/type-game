import worldList from '../data/worlds.json';
import { CHARSETS, charsetOf } from './charsets';

const glyphModules = import.meta.glob('../data/glyphs/*.json', { eager: true, import: 'default' });
const levelModules = import.meta.glob('../data/levels/*.json', { eager: true, import: 'default' });

// Glyph data is generated per world by `npm run glyphs` (scripts/build-glyphs.mjs).
const typefaces = Object.fromEntries(Object.values(glyphModules).map((t) => [t.id, t]));

export const worlds = worldList.map((w) => {
  const glyphs = typefaces[`world-${w.world}`];
  if (!glyphs) throw new Error(`No glyph data for world ${w.world}. Run npm run glyphs.`);
  return {
    ...w,
    glyphs,
    levels: Object.keys(levelModules)
      .sort()
      .map((p) => levelModules[p])
      .filter((l) => l.world === w.world),
  };
});

// All levels in play order.
export const levels = worlds.flatMap((w) => w.levels);

export function getWorld(n) {
  return worlds.find((w) => w.world === n);
}

export function getLevel(id) {
  return levels.find((l) => l.id === id);
}

// Levels are { id, world, scale, charset, letters: [{ char, x, y }] }.
// scale: cap height as a fraction of the circle diameter.
// charset: the tray's characters, 'upper' (default), 'lower', 'numerals' or 'mixed'.
// x, y: grid position of the letter's anchor (left edge of its outline, on the baseline).
export function validateLevel(level) {
  const errors = [];
  if (!level || typeof level !== 'object') return ['Level must be an object'];
  if (typeof level.id !== 'string' || !level.id) errors.push('id must be a non-empty string');
  if (!getWorld(level.world)) errors.push(`world must be 1–${worlds.length}`);
  if (!(level.scale > 0)) errors.push('scale must be a positive number');
  const charset = CHARSETS[charsetOf(level)];
  if (!charset) return [...errors, `charset must be one of ${Object.keys(CHARSETS).join(', ')}`];
  if (!Array.isArray(level.letters)) return [...errors, 'letters must be an array'];
  const seen = new Set();
  for (const l of level.letters) {
    if (!charset.chars.includes(l.char)) errors.push(`"${l.char}" is not in the ${charset.label} set`);
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
