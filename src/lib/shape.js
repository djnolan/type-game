const KEY = 'type-game/board-shape';

// Temporary test: draw the target and canvas as squares instead of circles.
// Set from the level editor; applies to the dev routes only.
export function getShape() {
  try {
    return localStorage.getItem(KEY) === 'square' ? 'square' : 'circle';
  } catch {
    return 'circle';
  }
}

export function setShape(shape) {
  try {
    localStorage.setItem(KEY, shape);
  } catch {
    // ignore
  }
}
