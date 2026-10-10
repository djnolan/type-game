import { linear } from './easing';

export const CANCELLED = Symbol('cancelled');

// Promise-based tweens for scripted sequences (screen transitions), where
// steps run one after another or side by side with Promise.all. cancel()
// rejects every running tween with CANCELLED, so a sequence stops wherever it is.
export function createSequencer() {
  let token = 0;

  // Calls fn(easedProgress, rawProgress) every frame for `duration` ms.
  function tween(duration, fn, ease = linear) {
    const mine = token;
    return new Promise((resolve, reject) => {
      const t0 = performance.now();
      const frame = (now) => {
        if (mine !== token) return reject(CANCELLED);
        const t = duration > 0 ? Math.min((now - t0) / duration, 1) : 1;
        fn(ease(t), t);
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      };
      frame(t0);
    });
  }

  const wait = (ms) => tween(ms, () => {});
  const after = (ms, fn) => wait(ms).then(fn);

  function cancel() {
    token++;
  }

  // Runs an async sequence, swallowing cancellation.
  function run(fn) {
    return fn().catch((e) => {
      if (e !== CANCELLED) throw e;
    });
  }

  return { tween, wait, after, cancel, run };
}
