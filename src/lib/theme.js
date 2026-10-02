const KEY = 'type-game/theme';

// 'system' (default) follows prefers-color-scheme; 'light' / 'dark' override it.
export function getTheme() {
  try {
    return localStorage.getItem(KEY) || 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(theme = getTheme()) {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = theme;
}

export function setTheme(theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // ignore
  }
  applyTheme(theme);
}
