const easings = {
  linear: (t) => t,
  easeOut: (t) => 1 - (1 - t) ** 3,
  easeInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
};

// Animates a flat object of numbers from `from` to `to`.
// Returns a handle; stop() halts it and returns the current value, so a new
// animation can pick up from wherever this one was interrupted.
export function animate(from, to, config, onUpdate, onDone) {
  const keys = Object.keys(to);
  const cur = { ...from };
  const vel = Object.fromEntries(keys.map((k) => [k, config.velocity?.[k] ?? 0]));
  const start = performance.now();
  let last = start;
  let raf = 0;
  let stopped = false;

  function frame(now) {
    if (stopped) return;
    let done;
    if (config.type === 'spring') {
      const { stiffness = 500, damping = 40, mass = 1, precision = 0.01 } = config;
      let remaining = Math.min(0.05, (now - last) / 1000);
      const step = 1 / 240;
      while (remaining > 0) {
        const dt = Math.min(step, remaining);
        for (const k of keys) {
          const force = -stiffness * (cur[k] - to[k]) - damping * vel[k];
          vel[k] += (force / mass) * dt;
          cur[k] += vel[k] * dt;
        }
        remaining -= dt;
      }
      done = keys.every((k) => Math.abs(cur[k] - to[k]) < precision && Math.abs(vel[k]) < precision * 10);
    } else {
      const { duration = 200, easing = 'easeOut' } = config;
      const p = Math.min(1, (now - start) / duration);
      const e = easings[easing](p);
      for (const k of keys) cur[k] = from[k] + (to[k] - from[k]) * e;
      done = p >= 1;
    }
    last = now;
    if (done) Object.assign(cur, to);
    onUpdate({ ...cur });
    if (done) onDone?.();
    else raf = requestAnimationFrame(frame);
  }

  raf = requestAnimationFrame(frame);
  return {
    stop() {
      stopped = true;
      cancelAnimationFrame(raf);
      return { ...cur };
    },
  };
}
