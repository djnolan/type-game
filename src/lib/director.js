import { ringDash } from '../components/ProgressIndicator';
import { transitions as T } from '../motion';
import { easeOutBack, easeOutCubic } from './easing';
import { badgeFace, canvasFace, numberFace, solvedFace, targetFace } from './faces';
import { createSequencer } from './sequence';

// Plays the screen transitions: level complete, world complete, continue to
// the next world, and the world menu (to it, around it and back into a world).
//
// It draws into its own layer over the game screen. Stand-in circles (coins)
// take the place of the stage's target and canvas while they move and flip,
// and the stage underneath is switched to the next level out of sight. The
// layer blocks input while anything is moving.
//
// The stage marks its parts with data-part (target, canvas, done, tray,
// caption). Those wrappers carry no React styles, so the director can hide and
// fade them with inline styles and clear those when it's done.
//
// Distances in `transitions` are for a 390px-wide screen and scale with width.

const BASE_WIDTH = 390;
// Sizes in the motion lab are for a game circle 244px across.
const BASE_D = 244;
const STAGE_PARTS = ['target', 'canvas', 'done', 'tray', 'caption'];

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// easeOutBack(k) peaks at 1 + 4k³ / 27(k + 1)². Returns the back curve whose
// overshoot over a move of `travel` px is `px` px.
function backWithin(travel, px) {
  const peak = (k) => (4 * k ** 3) / (27 * (k + 1) ** 2);
  const target = px / Math.max(1, travel);
  let lo = 0;
  let hi = 4;
  for (let i = 0; i < 30; i++) {
    const k = (lo + hi) / 2;
    if (peak(k) > target) hi = k;
    else lo = k;
  }
  return easeOutBack(lo);
}

class Node {
  constructor(parent, el, w, h, z) {
    this.el = el;
    Object.assign(this, { w, h, x: 0, y: 0, s: 1, dx: 0, o: 1 });
    el.classList.add('ml-node');
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    el.style.zIndex = z;
    parent.appendChild(el);
  }

  apply() {
    const st = this.el.style;
    st.transform = `translate(${this.x - this.w / 2 + this.dx}px, ${this.y - this.h / 2}px) scale(${this.s})`;
    st.opacity = this.o;
    st.visibility = this.o <= 0.001 ? 'hidden' : 'visible';
    st.pointerEvents = this.o < 0.5 ? 'none' : '';
  }

  set(p) {
    Object.assign(this, p);
    this.apply();
    return this;
  }

  remove() {
    this.el.remove();
  }
}

// A circle that turns over around its vertical axis like a spinning coin. The
// back face shows once the turn passes edge-on (90°) and stays for a full 360°.
// Faces showing their reverse side are mirrored back so they read correctly,
// and a shade darkens the circle as it turns edge-on.
class Coin extends Node {
  constructor(parent, D, z, shape = 'circle') {
    const el = document.createElement('div');
    el.className = 'coin';
    el.innerHTML = '<div class="coin-spin"><div class="coin-face"></div><div class="coin-face"></div><div class="coin-shade"></div></div>';
    super(parent, el, D, D, z);
    this.D = D;
    this.spin = el.firstChild;
    [this.front, this.back, this.shade] = this.spin.children;
    if (shape === 'square') this.shade.style.borderRadius = '0';
    this.ry = 0;
  }

  faces(front, back = '') {
    if (front != null) this.front.innerHTML = front;
    this.back.innerHTML = back;
    this.apply();
    return this;
  }

  // After a flip, the face showing becomes the front and the turn resets.
  settle() {
    if (Math.abs(this.ry) > 90) {
      [this.front, this.back] = [this.back, this.front];
      this.back.innerHTML = '';
      this.back.style.transform = '';
    }
    this.ry = 0;
    this.apply();
  }

  apply() {
    super.apply();
    const rad = (this.ry * Math.PI) / 180;
    const showBack = Math.abs(this.ry) > 90;
    this.front.style.display = showBack ? 'none' : '';
    this.back.style.display = showBack ? '' : 'none';
    (showBack ? this.back : this.front).style.transform = Math.cos(rad) < 0 ? 'scaleX(-1)' : '';
    this.spin.style.transform = this.ry ? `rotateY(${this.ry}deg)` : '';
    this.shade.style.opacity = (Math.abs(Math.sin(rad)) * 0.3).toFixed(3);
  }
}

function div(className, text = '') {
  const el = document.createElement('div');
  el.className = className;
  el.textContent = text;
  return el;
}

export class Director {
  // root: the layer element. getEnv() returns the current
  // { header, host, layout(world), shape }: the header element, the stage's
  // host element, and the stage layout (lib/geometry computeLayout) for a world.
  constructor(root, getEnv) {
    this.root = root;
    this.env = getEnv;
    this.seq = createSequencer();
    this.nodes = [];
    this.mode = 'idle';
    this.menu = null;
  }

  // ---- Helpers --------------------------------------------------------------

  geo(world) {
    const { host, layout } = this.env();
    const L = layout(world);
    const W = this.root.clientWidth;
    const H = this.root.clientHeight;
    const top = host.offsetTop;
    return {
      D: L.D,
      W,
      H,
      cx: host.offsetLeft + L.target.cx,
      targetY: top + L.target.cy,
      canvasY: top + L.canvas.cy,
      centerY: H / 2,
      // Screen-width scale for distances, and circle-size scale for the
      // ribbon and the spacing around the badge.
      k: W / BASE_WIDTH,
      q: L.D / BASE_D,
    };
  }

  coin(D, z = 5) {
    const c = new Coin(this.root, D, z, this.env().shape);
    this.nodes.push(c);
    return c;
  }

  node(el, w, h, z = 9) {
    const n = new Node(this.root, el, w, h, z);
    this.nodes.push(n);
    return n;
  }

  drop(...nodes) {
    for (const n of nodes) {
      n.remove();
      this.nodes = this.nodes.filter((m) => m !== n);
    }
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === 'idle') this.root.removeAttribute('data-active');
    else this.root.setAttribute('data-active', '');
  }

  part(name) {
    return this.env().host?.querySelector(`[data-part="${name}"]`);
  }

  style(el, props) {
    if (!el) return;
    el.style.transition = 'none';
    Object.assign(el.style, props);
  }

  hideParts(...names) {
    for (const n of names) this.style(this.part(n), { visibility: 'hidden' });
  }

  // Header, tray and Done opacity; the tray also slides down by `trayY` px.
  chrome({ header, tray, trayY = 0, done }) {
    const { header: h } = this.env();
    if (header != null) this.style(h, { opacity: header, pointerEvents: header < 1 ? 'none' : '' });
    if (tray != null) this.style(this.part('tray'), { opacity: tray, transform: `translateY(${trayY}px)` });
    if (done != null) this.style(this.part('done'), { opacity: done });
  }

  // Hands everything back to the stage and header.
  clearStage() {
    for (const n of STAGE_PARTS) this.part(n)?.removeAttribute('style');
    this.env().header?.removeAttribute('style');
  }

  // Fills the header's progress ring for the current world.
  animateProgress(from, to, duration, ease) {
    const ring = this.env().header?.querySelector('[data-progress-ring]');
    if (!ring || from === to) return Promise.resolve();
    const r = +ring.dataset.r;
    return this.seq.tween(duration, (e) => ring.setAttribute('stroke-dasharray', ringDash(r, lerp(from, to, e))), ease);
  }

  cancel() {
    this.seq.cancel();
    this.menuSnapId = (this.menuSnapId ?? 0) + 1;
    this.drop(...this.nodes);
    this.menu = null;
    this.clearStage();
    this.setMode('idle');
  }

  // ---- Shared steps ------------------------------------------------------------

  // Solved state, scale down, success feedback, hold.
  async celebrate(board, g) {
    const { tween, wait } = this.seq;
    await tween(T.shrink.duration, (e) => board.set({ s: lerp(1, T.shrink.scale, e) }), T.shrink.ease);
    if (T.feedback === 'shimmer') {
      const band = board.front.querySelector('[data-shimmer]');
      await tween(T.shimmer.duration, (e) => band?.setAttribute('x', lerp(-0.6 * g.D, 1.5 * g.D, e)), T.shimmer.ease);
    } else {
      await this.rays(board, g);
    }
    await wait(T.holdAfterFeedback);
  }

  // Short foreground strokes shoot out from just outside the circle. Each head
  // leads and its tail catches up until the stroke is gone.
  async rays(board, g) {
    const { count, strokeWidth, distance, gap, duration } = T.rays;
    const base = (g.D / 2) * T.shrink.scale + gap * g.k;
    const travel = distance * g.k;
    const size = 2 * (base + travel + strokeWidth);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `${-size / 2} ${-size / 2} ${size} ${size}`);
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = Array.from(
      { length: count },
      () => `<line style="stroke:var(--fg)" stroke-width="${strokeWidth}"/>`,
    ).join('');
    const rays = this.node(svg, size, size, 7).set({ x: board.x, y: board.y });
    await this.seq.tween(duration, (_, t) => {
      [...svg.children].forEach((line, i) => {
        const a = (i / count) * Math.PI * 2 - Math.PI / 2 + 0.26;
        const head = base + easeOutCubic(t) * travel;
        const tail = base + easeOutCubic(Math.max(0, t - 0.28) / 0.72) * travel;
        line.setAttribute('x1', Math.cos(a) * tail);
        line.setAttribute('y1', Math.sin(a) * tail);
        line.setAttribute('x2', Math.cos(a) * head);
        line.setAttribute('y2', Math.sin(a) * head);
      });
    });
    this.drop(rays);
  }

  // A blank canvas rises from below the screen to its place, overshooting a
  // little. Once it has landed, the tray rises in after it.
  async canvasEnter(g, face) {
    const { delay, duration, overshoot } = T.canvasEnter;
    const from = g.H + g.D / 2 + 40;
    const ease = backWithin(from - g.canvasY, overshoot * g.k);
    const canvas = this.coin(g.D, 6).faces(face).set({ x: g.cx, y: from });
    await this.seq.wait(delay);
    await this.seq.tween(duration, (e) => canvas.set({ y: lerp(from, g.canvasY, e) }), ease);
    const t = T.trayIn;
    await this.seq.wait(t.delay);
    await this.seq.tween(t.duration, (e) => this.chrome({ tray: e, trayY: (1 - e) * t.rise * g.k }), t.ease);
    return canvas;
  }

  // The header comes back partway into a flip.
  async headerIn(flipDuration) {
    const { startFraction, duration, ease } = T.headerIn;
    await this.seq.wait(flipDuration * startFraction);
    await this.seq.tween(duration, (e) => this.chrome({ header: e }), ease);
  }

  // The new puzzle is in place: the stage takes over again and Done fades in.
  async finishInGame(...nodes) {
    this.drop(...nodes);
    for (const n of ['target', 'canvas', 'tray', 'caption']) this.part(n)?.removeAttribute('style');
    this.env().header?.removeAttribute('style');
    await this.seq.tween(T.doneIn.duration, (e) => this.chrome({ done: e }), T.doneIn.ease);
    this.clearStage();
    this.setMode('idle');
  }

  // ---- 1. Level complete -------------------------------------------------------

  // `from` and `to` are { world, level }. swap() switches the stage to the next
  // level; release() lets the header show the new progress.
  levelComplete({ from, to, progress, swap, release }) {
    return this.seq.run(async () => {
      this.setMode('busy');
      const { tween } = this.seq;
      const g = this.geo(from.world);
      const shape = this.env().shape;
      const board = this.coin(g.D).faces(solvedFace({ ...from, D: g.D, shape })).set({ x: g.cx, y: g.targetY });
      this.hideParts('target', 'canvas', 'caption');

      await this.celebrate(board, g);

      swap();
      this.hideParts('target', 'canvas', 'caption');
      this.chrome({ tray: 0, done: 0 });
      const g2 = this.geo(to.world);
      // Faces are drawn at this coin's size; scale makes up any difference.
      const sEnd = g2.D / g.D;
      board.faces(null, targetFace({ ...to, D: g.D, shape }));
      let canvas;
      await Promise.all([
        tween(T.flip.duration, (e) => board.set({ ry: 180 * e }), T.flip.ease),
        tween(T.flip.duration, (e) => board.set({ y: lerp(g.targetY, g2.targetY, e) }), T.flipScaleBack.ease),
        tween(T.flipScaleBack.duration, (e) => board.set({ s: lerp(T.shrink.scale, sEnd, e) }), T.flipScaleBack.ease),
        this.animateProgress(progress.from, progress.to, T.flip.duration * T.progressFill.fraction, T.progressFill.ease),
        this.canvasEnter(g2, canvasFace({ ...to, D: g2.D, shape })).then((c) => (canvas = c)),
      ]);
      release();
      await this.finishInGame(board, canvas);
    });
  }

  // ---- 3. World complete -------------------------------------------------------

  worldComplete({ from, progress, release, onContinue }) {
    return this.seq.run(async () => {
      this.setMode('busy');
      const { tween, after } = this.seq;
      const g = this.geo(from.world);
      const shape = this.env().shape;
      const board = this.coin(g.D).faces(solvedFace({ ...from, D: g.D, shape })).set({ x: g.cx, y: g.targetY });
      this.hideParts('target', 'canvas', 'caption');

      await this.celebrate(board, g);

      // Travel down to the centre; the game's chrome leaves.
      const tr = T.worldTravel;
      await Promise.all([
        tween(tr.duration, (e) => board.set({ y: lerp(g.targetY, g.centerY, e), s: lerp(T.shrink.scale, 1, e) }), tr.ease),
        tween(
          tr.duration * tr.chromeFraction,
          (e) => this.chrome({ header: 1 - e, tray: 0, done: 0 }),
          tr.ease,
        ),
        this.animateProgress(progress.from, 1, tr.duration * T.progressFill.fraction, T.progressFill.ease),
      ]);
      this.hideParts(...STAGE_PARTS);
      release();

      // Lift with a 360° flip to the badge.
      const badgeY = g.centerY - T.worldFlip.lift * g.k;
      board.faces(null, badgeFace({ world: from.world, D: g.D }));
      await Promise.all([
        tween(T.worldFlip.duration, (e) => board.set({ ry: 360 * e }), T.worldFlip.ease),
        tween(T.worldFlip.duration, (e) => board.set({ y: lerp(g.centerY, badgeY, e) }), T.worldFlip.liftEase),
      ]);
      board.settle();

      // Dip, then the ribbon drops out from behind as the badge springs back.
      const r = g.D / 2;
      const rib = { w: 44 * g.q, h: 100 * g.q };
      const ribIn = badgeY + r - 14 * g.q - rib.h / 2;
      const ribOut = badgeY + r - T.ribbonPop.tucked * g.q + rib.h / 2;
      const ribbon = this.node(this.ribbonEl(from.world.world, rib), rib.w, rib.h, 4).set({ x: g.cx, y: ribIn });
      const headingY = badgeY - r - 64 * g.q;
      const heading = this.node(div('ml-heading', `World ${from.world.world} complete`), g.W, 40).set({ x: g.W / 2, y: headingY, o: 0 });
      const button = document.createElement('button');
      button.className = 'pill ml-continue';
      button.textContent = 'Continue';
      button.addEventListener('click', () => this.mode === 'worldDone' && onContinue());
      const contY = Math.min(ribOut + rib.h / 2 + 96 * g.q, g.H - 26 - 40);
      const cont = this.node(button, 200, 52).set({ x: g.W / 2, y: contY, o: 0 });
      this.world = { board, ribbon, heading, cont, badgeY, g };

      const dip = T.dip.depth * g.k;
      await tween(T.dip.duration, (e) => board.set({ y: badgeY + dip * e }), T.dip.ease);
      const h = T.headingIn;
      const rise = h.rise * g.k;
      await Promise.all([
        tween(T.dipReturn.duration, (e) => board.set({ y: badgeY + dip * (1 - e) }), T.dipReturn.ease),
        tween(T.ribbonPop.duration, (e) => ribbon.set({ y: lerp(ribIn, ribOut, e) }), T.ribbonPop.ease),
        after(T.ribbonPop.duration * h.startFraction, () =>
          tween(h.duration, (e) => heading.set({ y: headingY + rise * (1 - e), o: e }), h.ease),
        ),
        after(T.ribbonPop.duration * h.startFraction + T.continueDelay, () =>
          tween(h.duration, (e) => cont.set({ y: contY + rise * (1 - e), o: e }), h.ease),
        ),
      ]);
      this.setMode('worldDone');
      button.focus({ preventScroll: true });
    });
  }

  ribbonEl(n, { w, h }) {
    const el = document.createElement('div');
    el.innerHTML =
      `<svg width="${w}" height="${h}" viewBox="0 0 44 100" aria-hidden="true">` +
      `<path d="M0 0H44V100L22 84 0 100Z" class="fill-accent"/>` +
      `<text x="22" y="58" text-anchor="middle" dominant-baseline="central" style="font:500 20px var(--ui-font);fill:var(--bg)">${Number(n)}</text></svg>`;
    return el;
  }

  // ---- 4. Continue to the next world --------------------------------------------

  // `to` is { world, level }, or null when there's nothing left to play.
  nextWorld({ to, swap }) {
    return this.seq.run(async () => {
      if (this.mode !== 'worldDone' || !this.world) return;
      this.setMode('busy');
      const { tween, after, wait } = this.seq;
      const { board, ribbon, heading, cont, badgeY, g } = this.world;
      this.world = null;
      const shape = this.env().shape;
      const so = T.swipeOut;
      const distance = so.distance * g.k;
      const g2 = to ? this.geo(to.world) : null;
      const num = to && this.coin(g2.D).faces(numberFace({ n: to.world.world, D: g2.D })).set({ x: g.cx + distance, y: badgeY });

      await Promise.all([
        tween(T.continueOut, (e) => cont.set({ o: 1 - e })),
        tween(
          so.duration,
          (e) => {
            const dx = -distance * e;
            board.set({ dx });
            ribbon.set({ dx });
            heading.set({ dx, o: 1 - e });
          },
          so.ease,
        ),
        num &&
          after(so.duration - T.swipeIn.overlap, () =>
            tween(T.swipeIn.duration, (e) => num.set({ x: lerp(g.cx + distance, g.cx, e) }), T.swipeIn.ease),
          ),
      ]);
      this.drop(board, ribbon, heading, cont);

      swap();
      if (!to) {
        this.clearStage();
        this.setMode('idle');
        return;
      }
      this.hideParts(...STAGE_PARTS);
      this.chrome({ header: 0, tray: 0, done: 0 });
      num.faces(null, targetFace({ ...to, D: g2.D, shape }));
      await wait(T.numberHold);
      for (const n of ['tray', 'done']) this.part(n).style.visibility = '';

      const rf = T.riseFlip;
      let canvas;
      await Promise.all([
        tween(rf.duration, (e) => num.set({ ry: 180 * e }), rf.flipEase),
        tween(rf.duration, (e) => num.set({ y: lerp(badgeY, g2.targetY, e) }), rf.moveEase),
        this.headerIn(rf.duration),
        this.canvasEnter(g2, canvasFace({ ...to, D: g2.D, shape })).then((c) => (canvas = c)),
      ]);
      await this.finishInGame(num, canvas);
    });
  }

  // ---- 5. World menu --------------------------------------------------------------

  // `from` is { world, level, letters } on screen. `worlds` lists every world as
  // { world, face: 'badge' | 'number' | 'locked', label, sub, selectable }.
  // `index` is the world on screen. onSelect(i) is called when a world is tapped.
  toMenu({ from, worlds, index, onSelect }) {
    return this.seq.run(async () => {
      if (this.mode !== 'idle') return;
      this.setMode('busy');
      const { tween, after } = this.seq;
      const g = this.geo(from.world);
      const shape = this.env().shape;
      const mc = T.menu;
      const ms = mc.scale;
      const menuY = g.H * mc.y;
      const menu = (this.menu = { worlds, scroll: index, g, menuY, onSelect, coins: [], spacing: mc.gap * g.k });

      const board = this.coin(g.D)
        .faces(targetFace({ ...from, D: g.D, shape }), this.menuFace(worlds[index], g.D))
        .set({ x: g.cx, y: g.targetY });
      const canvas = this.coin(g.D, 6)
        .faces(canvasFace({ ...from, D: g.D, shape }))
        .set({ x: g.cx, y: g.canvasY });
      this.hideParts('target', 'canvas', 'caption');

      menu.coins = worlds.map((w) => this.coin(g.D).faces(this.menuFace(w, g.D)).set({ y: menuY, s: ms, o: 0 }));
      menu.title = this.node(div('ml-title', 'Worlds'), g.W, 48).set({ x: g.W / 2, y: 24, o: 0 });
      const label = div('ml-label');
      label.append(div('ml-label-name'), div('ml-label-sub'));
      label.setAttribute('aria-live', 'polite');
      menu.label = this.node(label, g.W, 56);
      const labelY = menuY + (g.D / 2) * ms + 46 * g.k;
      const nb = T.menuOut.neighbours;
      const off = worlds.map((_, i) => (i < index ? -1 : 1) * nb.distance * g.k);
      this.layoutMenu(off);
      menu.label.set({ x: g.W / 2, y: labelY, o: 0 });

      const mo = T.menuOut;
      const dropTo = g.H + g.D / 2 + 40;
      await Promise.all([
        tween(mo.canvasDrop.duration, (e) => canvas.set({ y: lerp(g.canvasY, dropTo, e) }), mo.canvasDrop.ease),
        tween(mo.chromeOut, (e) => this.chrome({ header: 1 - e, tray: 1 - e, trayY: T.worldTravel.traySlide * g.k * e, done: 1 - e })),
        tween(mo.flip.duration, (e) => board.set({ ry: 180 * mo.flip.direction * e }), mo.flip.flipEase),
        tween(
          mo.flip.duration,
          (e) => board.set({ y: lerp(g.targetY, menuY, e), s: lerp(1, ms, e) }),
          mo.flip.moveEase,
        ),
        after(mo.flip.duration * nb.startFraction, () =>
          tween(
            nb.duration,
            (e) => {
              this.layoutMenu(off.map((o) => o * (1 - e)));
              menu.coins.forEach((c, i) => i !== index && c.set({ o: e }));
              menu.title.set({ o: e });
              menu.label.set({ y: labelY + nb.labelRise * g.k * (1 - e), o: e });
            },
            nb.ease,
          ),
        ),
      ]);
      this.drop(board, canvas);
      this.hideParts(...STAGE_PARTS);
      menu.coins[index].set({ o: 1 });
      this.setMode('menu');
      this.root.focus({ preventScroll: true });
    });
  }

  menuFace(w, D) {
    if (w.face === 'badge') return badgeFace({ world: w.world, D });
    return numberFace({ n: w.world.world, D, locked: w.face === 'locked' });
  }

  layoutMenu(off = []) {
    const m = this.menu;
    m.coins.forEach((c, i) => c.set({ x: m.g.W / 2 + (i - m.scroll) * m.spacing + (off[i] || 0) }));
    const i = clamp(Math.round(m.scroll), 0, m.worlds.length - 1);
    const [name, sub] = m.label.el.children;
    name.textContent = m.worlds[i].label;
    sub.textContent = m.worlds[i].sub;
  }

  snapMenu(to) {
    const m = this.menu;
    if (!m) return;
    const id = (this.menuSnapId = (this.menuSnapId ?? 0) + 1);
    const from = m.scroll;
    const t0 = performance.now();
    const { duration, ease } = T.menuSnap;
    const frame = (now) => {
      if (id !== this.menuSnapId || this.mode !== 'menu') return;
      const t = Math.min((now - t0) / duration, 1);
      m.scroll = lerp(from, to, ease(t));
      this.layoutMenu();
      if (t < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  // Swipe to scroll; on release, snap to the nearest world, allowing for the
  // swipe's speed. Tap a neighbour to snap to it, or the centred world to enter it.
  pointerDown(e) {
    if (this.mode !== 'menu') return;
    const p = this.local(e);
    this.drag = { id: e.pointerId, p, s0: this.menu.scroll, moved: 0, t: e.timeStamp, v: 0, lastX: p.x };
    this.menuSnapId = (this.menuSnapId ?? 0) + 1;
    this.root.setPointerCapture?.(e.pointerId);
  }

  pointerMove(e) {
    const d = this.drag;
    if (!d || e.pointerId !== d.id || this.mode !== 'menu') return;
    const p = this.local(e);
    const m = this.menu;
    d.v = (p.x - d.lastX) / Math.max(1, e.timeStamp - d.t);
    d.t = e.timeStamp;
    d.lastX = p.x;
    d.moved = Math.max(d.moved, Math.abs(p.x - d.p.x));
    m.scroll = clamp(d.s0 - (p.x - d.p.x) / m.spacing, -0.4, m.worlds.length - 0.6);
    this.layoutMenu();
  }

  pointerUp(e) {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    this.drag = null;
    if (this.mode !== 'menu') return;
    const m = this.menu;
    const last = m.worlds.length - 1;
    const p = this.local(e);
    if (d.moved < 6) {
      const i = clamp(Math.round(m.scroll), 0, last);
      const dx = p.x - m.g.W / 2;
      const r = (m.g.D / 2) * T.menu.scale;
      if (Math.abs(dx) < r && Math.abs(p.y - m.menuY) < r) {
        if (m.worlds[i].selectable) m.onSelect(i);
        else this.snapMenu(i);
        return;
      }
      if (Math.abs(p.y - m.menuY) < r) this.snapMenu(clamp(i + Math.sign(dx), 0, last));
      else this.snapMenu(i);
      return;
    }
    this.snapMenu(clamp(Math.round(m.scroll - (d.v * T.menuSnap.flingMs) / m.spacing), 0, last));
  }

  keyDown(e) {
    if (this.mode !== 'menu') return;
    const m = this.menu;
    const i = clamp(Math.round(m.scroll), 0, m.worlds.length - 1);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      this.snapMenu(clamp(i + (e.key === 'ArrowLeft' ? -1 : 1), 0, m.worlds.length - 1));
    } else if ((e.key === 'Enter' || e.key === ' ') && m.worlds[i].selectable) {
      e.preventDefault();
      m.onSelect(i);
    }
  }

  local(e) {
    const r = this.root.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  // Into a world from the menu: the other worlds slide away, and the chosen
  // circle flips over to the level while rising into the game's place.
  selectWorld({ index, to, swap }) {
    return this.seq.run(async () => {
      if (this.mode !== 'menu') return;
      this.setMode('busy');
      const { tween } = this.seq;
      const m = this.menu;
      const shape = this.env().shape;
      swap();
      this.hideParts(...STAGE_PARTS);
      this.chrome({ header: 0, tray: 0, done: 0 });
      const g2 = this.geo(to.world);
      const s0 = (T.menu.scale * m.g.D) / g2.D;
      const x0 = m.coins[index].x;
      const board = this.coin(g2.D)
        .faces(this.menuFace(m.worlds[index], g2.D), targetFace({ ...to, D: g2.D, shape }))
        .set({ x: x0, y: m.menuY, s: s0 });
      m.coins[index].set({ o: 0 });
      for (const n of ['tray', 'done']) this.part(n).style.visibility = '';

      const sel = T.menuSelect;
      const rf = T.riseFlip;
      const dist = sel.distance * m.g.k;
      let canvas;
      await Promise.all([
        tween(
          sel.duration,
          (e) => {
            m.coins.forEach((c, j) => j !== index && c.set({ dx: (j < index ? -dist : dist) * e, o: 1 - e }));
            m.title.set({ o: 1 - e });
            m.label.set({ o: 1 - e });
          },
          sel.ease,
        ),
        tween(rf.duration, (e) => board.set({ ry: 180 * e }), rf.flipEase),
        tween(rf.duration, (e) => board.set({ x: lerp(x0, g2.cx, e), y: lerp(m.menuY, g2.targetY, e), s: lerp(s0, 1, e) }), rf.moveEase),
        this.headerIn(rf.duration),
        this.canvasEnter(g2, canvasFace({ ...to, D: g2.D, shape })).then((c) => (canvas = c)),
      ]);
      this.drop(...m.coins, m.title, m.label);
      this.menu = null;
      await this.finishInGame(board, canvas);
    });
  }
}
