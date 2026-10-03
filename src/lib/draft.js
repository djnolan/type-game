const KEY = 'type-game/editor-draft';

export const emptyDraft = () => ({ id: 'w1-new', world: 1, scale: 0.6, charset: 'upper', letters: [] });

export function loadDraft() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || null;
  } catch {
    return null;
  }
}

export function saveDraft(level) {
  try {
    localStorage.setItem(KEY, JSON.stringify(level));
  } catch {
    // ignore
  }
}
