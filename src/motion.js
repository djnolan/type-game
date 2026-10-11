import { easeInCubic, easeInOutBack, easeInOutCubic, easeOutBack, easeOutCubic } from './lib/easing';

// All motion values live here.
//
// Each `motion` entry is a config for animate() in lib/animate.js:
//   { type: 'spring', stiffness, damping }  (interruptible, carries velocity)
//   { type: 'tween', duration, easing }     (duration in ms; easing is a name or a function)
export const motion = {
  // Letter settles onto its grid point after a drop.
  letterSnap: { type: 'spring', stiffness: 900, damping: 60 },
  // Letter flies back to its tray slot after being removed.
  letterReturn: { type: 'spring', stiffness: 420, damping: 38 },
  // Canvas snaps onto the target during a check.
  canvasSnap: { type: 'spring', stiffness: 520, damping: 42 },
  // Canvas returns to its place after an abandoned check.
  canvasReturn: { type: 'spring', stiffness: 320, damping: 32 },
  // Tray momentum after a swipe. Velocity multiplier per 1/60 s.
  trayFriction: 0.95,
  // Wrong answer: both circles shake "no" together, then the canvas returns
  // with the player's letters kept. Amplitude in px at a 390px-wide screen.
  failPause: 80,
  failShake: { duration: 460, amplitude: 11, cycles: 3 },
  failShakeHold: 120,
  failReturn: { type: 'tween', duration: 420, easing: easeOutBack(1.2) },
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
  // Width in px of the invisible stroke around placed letters that also picks them up.
  letterHitWidth: 16,
};

// Screen transitions (level complete, world complete, next world, world menu),
// played by lib/director.js. Durations and delays in ms. Distances in px at a
// 390px-wide screen; they scale with the screen width.
export const transitions = {
  // Success feedback after a correct match: 'rays' or 'shimmer'.
  feedback: 'rays',

  // Level complete
  shrink: { duration: 200, scale: 0.94, ease: easeOutCubic },
  rays: { duration: 400, count: 12, strokeWidth: 1.5, distance: 34, gap: 8 },
  shimmer: { duration: 560, ease: easeInOutCubic },
  holdAfterFeedback: 120,
  flip: { duration: 700, ease: easeInOutBack(1.25) },
  flipScaleBack: { duration: 320, ease: easeInOutCubic },
  // The header's progress dot fills during the flip.
  progressFill: { fraction: 0.8, ease: easeInOutCubic },
  // A blank canvas rises from below the screen, starting this long after the
  // flip. It eases out with a back curve whose overshoot is capped at
  // `overshoot` px, so it never rides up into the target above it.
  canvasEnter: { delay: 260, duration: 620, overshoot: 6 },
  // The tray rises in once the canvas has landed, then Done fades in.
  trayIn: { delay: 80, duration: 360, rise: 40, ease: easeOutCubic },
  doneIn: { duration: 200, ease: easeOutCubic },

  // World complete
  worldTravel: { duration: 620, ease: easeInOutCubic, chromeFraction: 0.7, traySlide: 40 },
  worldFlip: { duration: 1000, ease: easeInOutBack(1.25), lift: 28, liftEase: easeInOutCubic },
  dip: { duration: 150, depth: 14, ease: easeInCubic },
  dipReturn: { duration: 350, ease: easeOutBack(2) },
  ribbonPop: { duration: 440, ease: easeOutBack(1.8), tucked: 30 },
  headingIn: { duration: 320, rise: 12, ease: easeOutCubic, startFraction: 0.4 },
  continueDelay: 240,

  // Continue to the next world
  continueOut: 150,
  swipeOut: { duration: 440, distance: 420, ease: easeInCubic },
  swipeIn: { duration: 560, overlap: 160, ease: easeOutBack(1.3) },
  numberHold: 280,
  riseFlip: { duration: 850, flipEase: easeInOutBack(1.25), moveEase: easeInOutCubic },
  // The header fades back in partway into the flip (the tray follows the canvas).
  headerIn: { duration: 320, startFraction: 0.45, ease: easeOutCubic },

  // World menu
  menu: {
    // Circle size as a fraction of the game circle, and centre-to-centre spacing.
    scale: 0.82,
    gap: 232,
    // Vertical position of the centred circle, as a fraction of the screen height.
    y: 0.475,
  },
  menuOut: {
    canvasDrop: { duration: 380, ease: easeInCubic },
    chromeOut: 250,
    // Turns the opposite way to the flip that comes back into a world.
    flip: { duration: 800, flipEase: easeInOutBack(1.25), moveEase: easeInOutCubic, direction: -1 },
    neighbours: { startFraction: 0.45, duration: 600, distance: 150, ease: easeOutCubic, labelRise: 10 },
  },
  menuSelect: { duration: 380, distance: 150, ease: easeInCubic },
  menuSnap: { duration: 320, ease: easeOutBack(1.1), flingMs: 180 },
};
