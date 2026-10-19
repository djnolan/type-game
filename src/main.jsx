import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './ui-font.css';
import './styles.css';
import App from './App';
import { applyTheme } from './lib/theme';

applyTheme();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
