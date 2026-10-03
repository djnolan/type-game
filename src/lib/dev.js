// Dev tools (level editor, #/play routes) are present under
// `npm run dev`, or in a build made with VITE_ENABLE_EDITOR=true. Otherwise
// they are left out of the bundle.
export const EDITOR_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_EDITOR === 'true';
