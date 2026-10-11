// Easing curves, t in 0..1. The back curves overshoot past 1 and settle.
export const linear = (t) => t;
export const easeInCubic = (t) => t ** 3;
export const easeOutCubic = (t) => 1 - (1 - t) ** 3;
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
export const easeOutBack =
  (k = 1.6) =>
  (t) =>
    1 + (k + 1) * (t - 1) ** 3 + k * (t - 1) ** 2;
export const easeInOutBack =
  (overshoot = 1.25) =>
  (t) => {
    const c = overshoot * 1.525;
    return t < 0.5 ? ((2 * t) ** 2 * ((c + 1) * 2 * t - c)) / 2 : ((2 * t - 2) ** 2 * ((c + 1) * (t * 2 - 2) + c) + 2) / 2;
  };
