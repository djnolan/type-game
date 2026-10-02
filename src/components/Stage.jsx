import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { animate } from '../lib/animate';
import {
  ALPHABET,
  computeLayout,
  glyphTouchesCircle,
  letterOrigin,
  matchesSolution,
  puzzleScale,
  snapToGrid,
} from '../lib/geometry';
import { gestures, motion } from '../motion';

const TRAY_PAD = 20;
const TRAY_GAP = 10;
const TICK_STEP = 30;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;

function Glyph({ glyph, ox, oy, s, ...rest }) {
  return <path d={glyph.d} transform={`translate(${ox} ${oy}) scale(${s})`} {...rest} />;
}

// The gameplay surface: target circle, canvas circle, Done button and letter
// tray, drawn in one SVG in CSS px so dragging between them is one coordinate space.
//
// Phases: build → check (canvas draggable) → judging (snapped onto target)
//         → pass | fail (fail returns to build).
export default function Stage({
  width,
  height,
  glyphs,
  grid,
  scale,
  letters,
  onLettersChange,
  target,
  solution,
  checkable = true,
  onPass,
  onContinue,
}) {
  const uid = useId().replace(/:/g, '');
  const svgRef = useRef(null);
  const L = useMemo(() => computeLayout(width, height), [width, height]);
  const sP = puzzleScale(glyphs, scale, L.D);
  const sT = L.tray.cap / glyphs.capHeight;

  const [phase, setPhase] = useState('build');
  const [ghost, setGhostState] = useState(null); // { char, ox, oy, s }
  const [scrollX, setScrollX] = useState(0);
  const [offset, setOffsetState] = useState({ x: 0, y: 0 });

  // Refs mirror state that pointer handlers read, so they never see a stale render.
  const ghostRef = useRef(null);
  const offsetRef = useRef(offset);
  const setGhost = (g) => {
    ghostRef.current = g;
    setGhostState(g);
  };
  const setOffset = (o) => {
    offsetRef.current = o;
    setOffsetState(o);
  };

  const gesture = useRef(null);
  const ghostAnim = useRef(null); // { handle, finish }
  const scrollAnim = useRef(0);
  const canvasAnim = useRef(null);
  const timers = useRef([]);
  const lettersRef = useRef(letters);
  lettersRef.current = letters;

  // Tray slots, laid out by advance width at tray size.
  const slots = useMemo(() => {
    let x = TRAY_PAD;
    return ALPHABET.map((char) => {
      const w = glyphs.glyphs[char].advance * sT;
      const slot = { char, x0: x, w };
      x += w + TRAY_GAP;
      return slot;
    });
  }, [glyphs, sT]);
  const trayWidth = slots.at(-1).x0 + slots.at(-1).w + TRAY_PAD;
  const maxScroll = Math.max(0, trayWidth - width);
  const scroll = clamp(scrollX, 0, maxScroll);

  useEffect(
    () => () => {
      ghostAnim.current?.handle.stop();
      canvasAnim.current?.stop();
      cancelAnimationFrame(scrollAnim.current);
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  const placedChars = new Set(letters.map((l) => l.char));
  const inPlay = (char) => placedChars.has(char) || ghost?.char === char;

  function local(e) {
    const r = svgRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  // Finish any in-flight letter animation immediately so a new gesture starts from settled state.
  function settleGhost() {
    if (!ghostAnim.current) return;
    const { handle, finish } = ghostAnim.current;
    handle.stop();
    finish();
  }

  function flyGhost(to, config, commit) {
    const finish = () => {
      ghostAnim.current = null;
      commit();
      setGhost(null);
    };
    const g = ghostRef.current;
    const from = { ox: g.ox, oy: g.oy, s: g.s };
    const handle = animate(from, to, config, (v) => setGhost({ ...ghostRef.current, ...v }), finish);
    ghostAnim.current = { handle, finish };
  }

  // ---- Letters --------------------------------------------------------------

  function pickUpFromTray(char, p) {
    const slot = slots.find((s) => s.char === char);
    const ox = slot.x0 - scroll;
    const oy = L.tray.baseline;
    gesture.current = { ...gesture.current, type: 'letter', char, gu: (p.x - ox) / sT, gv: (p.y - oy) / sT };
    setGhost({ char, ox, oy, s: sT });
  }

  function pickUpFromCanvas(char, p) {
    const letter = letters.find((l) => l.char === char);
    const glyph = glyphs.glyphs[char];
    const { ox, oy } = letterOrigin(glyph, letter.x, letter.y, L.canvasBox, grid, sP);
    gesture.current = { ...gesture.current, type: 'letter', char, gu: (p.x - ox) / sP, gv: (p.y - oy) / sP };
    onLettersChange(letters.filter((l) => l.char !== char));
    setGhost({ char, ox, oy, s: sP });
  }

  function moveLetter(p) {
    const g = gesture.current;
    // Letters grow from tray size to puzzle size as they rise toward the canvas.
    const t = clamp((L.tray.zoneTop - p.y) / (L.tray.zoneTop - L.dropBottom), 0, 1);
    const s = lerp(sT, sP, t * t * (3 - 2 * t));
    setGhost({ char: g.char, ox: p.x - g.gu * s, oy: p.y - g.gv * s, s });
  }

  function dropLetter(p) {
    const { char } = gesture.current;
    const glyph = glyphs.glyphs[char];
    const over = L.D * gestures.placementOverhang;
    const { x0, y0, D } = L.canvasBox;
    const inZone = p.x > x0 - over && p.x < x0 + D + over && p.y > y0 - over && p.y < L.dropBottom;

    if (inZone) {
      const ox = p.x - gesture.current.gu * sP;
      const oy = p.y - gesture.current.gv * sP;
      const pos = snapToGrid(glyph, ox, oy, L.canvasBox, grid, sP);
      const to = letterOrigin(glyph, pos.x, pos.y, L.canvasBox, grid, sP);
      if (glyphTouchesCircle(glyph, to.ox, to.oy, sP, L.canvas)) {
        flyGhost({ ...to, s: sP }, motion.letterSnap, () =>
          onLettersChange([...lettersRef.current.filter((l) => l.char !== char), { char, ...pos }]),
        );
        return;
      }
    }
    // Off the canvas: back to its tray slot.
    const slot = slots.find((s) => s.char === char);
    flyGhost({ ox: slot.x0 - scroll, oy: L.tray.baseline, s: sT }, motion.letterReturn, () => {});
  }

  function trayCharAt(p) {
    if (p.y < L.tray.letterTop - 6) return null;
    const x = p.x + scroll;
    const slot = slots.find((s) => x >= s.x0 - TRAY_GAP / 2 && x < s.x0 + s.w + TRAY_GAP / 2);
    return slot && !inPlay(slot.char) ? slot.char : null;
  }

  // ---- Tray scrolling ---------------------------------------------------------

  function glide(velocity) {
    cancelAnimationFrame(scrollAnim.current);
    let v = velocity; // px per ms
    let last = performance.now();
    const step = (now) => {
      const dt = now - last;
      last = now;
      v *= motion.trayFriction ** (dt / 16.67);
      let stop = Math.abs(v) < 0.02;
      setScrollX((x) => {
        const next = clamp(x + v * dt, 0, maxScroll);
        if (next === 0 || next === maxScroll) stop = true;
        return next;
      });
      if (!stop) scrollAnim.current = requestAnimationFrame(step);
    };
    scrollAnim.current = requestAnimationFrame(step);
  }

  // ---- Check ----------------------------------------------------------------

  function moveCanvas(to, config, done) {
    canvasAnim.current?.stop();
    canvasAnim.current = animate(offsetRef.current, to, config, setOffset, () => {
      canvasAnim.current = null;
      done?.();
    });
  }

  function startCheck() {
    if (!letters.length) return;
    setPhase('check');
  }

  function releaseCanvas() {
    const dy = L.target.cy - L.canvas.cy;
    const { x, y } = offsetRef.current;
    const dist = Math.hypot(x, y - dy);
    if (dist > L.D * gestures.canvasSnapRadius) {
      moveCanvas({ x: 0, y: 0 }, motion.canvasReturn, () => setPhase('build'));
      return;
    }
    setPhase('judging');
    moveCanvas({ x: 0, y: dy }, motion.canvasSnap, () => {
      if (matchesSolution(lettersRef.current, solution)) {
        setPhase('pass');
        onPass?.();
      } else {
        setPhase('fail');
        timers.current.push(
          setTimeout(() => moveCanvas({ x: 0, y: 0 }, motion.canvasReturn, () => setPhase('build')), motion.failHold),
        );
      }
    });
  }

  // ---- Pointer routing ------------------------------------------------------

  function onPointerDown(e) {
    if (gesture.current) return;
    const p = local(e);

    if (phase === 'pass') {
      onContinue?.();
      return;
    }
    if (phase === 'check') {
      const c = { x: L.canvas.cx + offset.x, y: L.canvas.cy + offset.y };
      if (Math.hypot(p.x - c.x, p.y - c.y) > L.canvas.r) return;
      canvasAnim.current?.stop();
      gesture.current = { id: e.pointerId, type: 'canvas', start: p, startOffset: offset };
    } else if (phase === 'build') {
      if (checkable && e.target.closest?.('[data-action="done"]')) {
        startCheck();
        return;
      }
      settleGhost();
      cancelAnimationFrame(scrollAnim.current);
      gesture.current = { id: e.pointerId, start: p };
      const placed = e.target.dataset?.char;
      if (placed) {
        pickUpFromCanvas(placed, p);
      } else if (p.y >= L.tray.zoneTop) {
        Object.assign(gesture.current, {
          type: 'tray',
          char: trayCharAt(p),
          startScroll: scroll,
          samples: [{ x: p.x, t: e.timeStamp }],
        });
      } else {
        gesture.current = null;
        return;
      }
    } else {
      return;
    }
    svgRef.current.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    const g = gesture.current;
    if (!g || e.pointerId !== g.id) return;
    const p = local(e);
    const dx = p.x - g.start.x;
    const dy = p.y - g.start.y;

    if (g.type === 'tray') {
      if (Math.hypot(dx, dy) < gestures.slop) return;
      // Pulling up picks a letter; anything more sideways scrolls.
      if (g.char && -dy > Math.abs(dx) * gestures.pickUpRatio) {
        pickUpFromTray(g.char, g.start);
        moveLetter(p);
        return;
      }
      g.type = 'scroll';
    }
    if (g.type === 'scroll') {
      setScrollX(clamp(g.startScroll - dx, 0, maxScroll));
      g.samples.push({ x: p.x, t: e.timeStamp });
      if (g.samples.length > 5) g.samples.shift();
    } else if (g.type === 'letter') {
      moveLetter(p);
    } else if (g.type === 'canvas') {
      setOffset({ x: g.startOffset.x + dx, y: g.startOffset.y + dy });
    }
  }

  function onPointerUp(e) {
    const g = gesture.current;
    if (!g || e.pointerId !== g.id) return;
    gesture.current = null;
    const p = local(e);

    if (g.type === 'scroll') {
      // Fling velocity from the last ~80 ms of movement only, so a pause before release stops dead.
      const b = { x: p.x, t: e.timeStamp };
      const a = g.samples.find((s) => b.t - s.t < 80) ?? b;
      const dt = b.t - a.t;
      if (dt > 0 && e.type === 'pointerup') glide(-(b.x - a.x) / dt);
    } else if (g.type === 'letter') {
      gesture.current = g;
      dropLetter(p);
      gesture.current = null;
    } else if (g.type === 'canvas') {
      releaseCanvas();
    }
  }

  function onWheel(e) {
    const p = local(e);
    if (phase !== 'build' || p.y < L.tray.zoneTop) return;
    cancelAnimationFrame(scrollAnim.current);
    setScrollX((x) => clamp(x + (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY), 0, maxScroll));
  }

  // ---- Render ---------------------------------------------------------------

  const building = phase === 'build';
  const checking = !building;
  const letterClass = checking ? 'fill-accent' : 'fill-fg';
  const cell = L.D / grid;

  const dots = [];
  for (let i = 0; i <= grid; i++) {
    for (let j = 0; j <= grid; j++) {
      const x = L.canvasBox.x0 + i * cell;
      const y = L.canvasBox.y0 + j * cell;
      if (Math.hypot(x - L.canvas.cx, y - L.canvas.cy) < L.canvas.r - 3) {
        dots.push(<circle key={`${i}-${j}`} cx={x} cy={y} r={1.2} className="fill-grid" />);
      }
    }
  }

  const renderLetters = (list, box, className, interactive) =>
    list.map((l) => {
      const glyph = glyphs.glyphs[l.char];
      const { ox, oy } = letterOrigin(glyph, l.x, l.y, box, grid, sP);
      return (
        <Glyph
          key={l.char}
          glyph={glyph}
          ox={ox}
          oy={oy}
          s={sP}
          className={className}
          data-char={interactive ? l.char : undefined}
          style={interactive ? { cursor: 'grab' } : undefined}
        />
      );
    });

  const ticks = [];
  for (let x = TRAY_PAD + TICK_STEP; x < trayWidth - TRAY_PAD; x += TICK_STEP) {
    const sx = x - scroll;
    if (sx < -2 || sx > width + 2) continue;
    ticks.push(
      <line
        key={x}
        x1={sx}
        x2={sx}
        y1={L.tray.trackTop + 5}
        y2={L.tray.trackBottom - 5}
        stroke="var(--grid)"
        strokeWidth={1}
      />,
    );
  }

  let caption = null;
  if (phase === 'pass') caption = 'Solved. Tap to continue.';
  else if (phase === 'fail') caption = 'Not quite.';
  else if (phase === 'check') caption = 'Drag the canvas onto the target.';

  return (
    <svg
      ref={svgRef}
      className="stage"
      width={width}
      height={height}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      style={{ '--fade-ms': `${motion.fade}ms` }}
    >
      <defs>
        <clipPath id={`target-${uid}`}>
          <circle cx={L.target.cx} cy={L.target.cy} r={L.target.r} />
        </clipPath>
        <clipPath id={`canvas-${uid}`}>
          <circle cx={L.canvas.cx} cy={L.canvas.cy} r={L.canvas.r} />
        </clipPath>
      </defs>

      {/* Target: the negative. Letters are knocked out of a solid circle, so the
          player's accent letters fill those spaces exactly when the canvas lands on it. */}
      <circle cx={L.target.cx} cy={L.target.cy} r={L.target.r} className="fill-fg" />
      <g clipPath={`url(#target-${uid})`}>{renderLetters(target, L.targetBox, 'fill-bg', false)}</g>
      <circle cx={L.target.cx} cy={L.target.cy} r={L.target.r} className="fill-none stroke-outline" />

      {caption && (
        <text x={L.canvas.cx} y={L.canvas.cy} textAnchor="middle" className="stage-caption">
          {caption}
        </text>
      )}

      {/* Canvas */}
      <g transform={`translate(${offset.x} ${offset.y})`}>
        <circle
          cx={L.canvas.cx}
          cy={L.canvas.cy}
          r={L.canvas.r}
          className={building ? 'fill-bg' : 'fill-none'}
          style={{ pointerEvents: 'all', cursor: phase === 'check' ? 'grab' : undefined }}
        />
        <g className={`fades ${checking ? 'hidden' : ''}`}>{dots}</g>
        <g clipPath={`url(#canvas-${uid})`}>{renderLetters(letters, L.canvasBox, letterClass, building)}</g>
        <circle cx={L.canvas.cx} cy={L.canvas.cy} r={L.canvas.r} className="fill-none stroke-outline" />
      </g>

      {/* Done */}
      {checkable && (
        <g
          data-action="done"
          className={`fades ${checking ? 'hidden' : ''}`}
          style={{ cursor: 'pointer', opacity: letters.length || checking ? undefined : 0.35 }}
          role="button"
          aria-label="Done"
        >
          <circle cx={L.done.cx} cy={L.done.cy} r={L.done.r} className="fill-bg stroke-outline" />
          <circle cx={L.done.cx} cy={L.done.cy} r={4} className="fill-accent" />
        </g>
      )}

      {/* Tray */}
      <g className={`fades ${checking ? 'hidden' : ''}`}>
        {slots.map((slot) => {
          const ox = slot.x0 - scroll;
          if (inPlay(slot.char) || ox > width || ox + slot.w < 0) return null;
          return <Glyph key={slot.char} glyph={glyphs.glyphs[slot.char]} ox={ox} oy={L.tray.baseline} s={sT} className="fill-fg" />;
        })}
        {/* Fill the strip under the track so letters stay cropped at the bottom. */}
        <rect x={0} y={L.tray.trackTop + L.tray.trackH / 2} width={width} height={height} className="fill-bg" />
        <rect
          x={TRAY_PAD - scroll}
          y={L.tray.trackTop}
          width={trayWidth - 2 * TRAY_PAD}
          height={L.tray.trackH}
          rx={10}
          className="fill-bg stroke-outline"
        />
        {ticks}
      </g>

      {/* The letter being dragged, unclipped and on top of everything. */}
      {ghost && (
        <Glyph glyph={glyphs.glyphs[ghost.char]} ox={ghost.ox} oy={ghost.oy} s={ghost.s} className="fill-fg" style={{ pointerEvents: 'none' }} />
      )}
    </svg>
  );
}
