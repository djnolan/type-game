import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset paths, so the build works from any subpath (e.g. GitHub Pages
  // at /type-game/). Routing is hash-based, so no server rewrites are needed.
  base: './',
  server: { host: true },
});
