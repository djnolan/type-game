import { EDITOR_ENABLED } from './dev';

const KEY = 'type-game/trial-weight';

// Temporary test: show every world at 600 (the shipped glyphs) or 700
// (src/data/glyphs-700). Set from the level editor; applies to dev builds only,
// and takes effect on reload because the glyph data is loaded once.
export const WEIGHTS = [600, 700];

export function getWeight() {
  if (!EDITOR_ENABLED) return WEIGHTS[0];
  try {
    return Number(localStorage.getItem(KEY)) === 700 ? 700 : 600;
  } catch {
    return 600;
  }
}

export function setWeight(weight) {
  try {
    localStorage.setItem(KEY, String(weight));
  } catch {
    // ignore
  }
}
