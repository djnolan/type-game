// All motion values live here. The finished game will get a designed,
// spring-based motion language; for now these are functional placeholders.
//
// Each entry is a config for animate() in lib/animate.js:
//   { type: 'spring', stiffness, damping }  (interruptible, carries velocity)
//   { type: 'tween', duration, easing }     (duration in ms)
export const motion = {
  // Letter settles onto its grid point after a drop.
  letterSnap: { type: 'spring', stiffness: 900, damping: 60 },
  // Letter flies back to its tray slot after being removed.
  letterReturn: { type: 'spring', stiffness: 420, damping: 38 },
  // Canvas snaps onto the target during a check.
  canvasSnap: { type: 'spring', stiffness: 520, damping: 42 },
  // Canvas returns to its place after a failed or abandoned check.
  canvasReturn: { type: 'spring', stiffness: 320, damping: 32 },
  // Tray momentum after a swipe. Velocity multiplier per 1/60 s.
  trayFriction: 0.95,
  // How long a failed check stays on the target before the canvas returns (ms).
  failHold: 700,
  // UI fading out when Done is tapped (ms).
  fade: 180,
};

// Gesture tuning (not motion, but kept beside it).
export const gestures = {
  // Pixels of movement before a tray touch counts as a scroll or a pick-up.
  slop: 8,
  // A pick-up needs the pull to be this much more vertical than horizontal.
  pickUpRatio: 1.2,
  // Canvas snaps to the target when its center lands within this fraction of the diameter.
  canvasSnapRadius: 0.2,
  // How far past the circle letters may be placed, as a fraction of the diameter.
  placementOverhang: 0.3,
};
