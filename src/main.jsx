import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import './styles.css';
import App from './App';
import { applyTheme } from './lib/theme';

applyTheme();
// Load the level marks' supplement font up front, so † and ‡ never show in a fallback.
document.fonts?.load('500 16px "DM Sans"', '\u2020\u2021').catch(() => {});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
