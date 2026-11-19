// The swarm rebuild. Written from scratch for this site; the idea (a page wiped and rebuilt
// by a swarm of multiplayer cursors) is Joel Califa's Swarm, and Dhvanil Patel's
// swarm-cursors, which points it at any page. No code from either is used.
//
// How it works:
//   1. Every element in the panel marked data-build="box|text|image|fill" becomes a task,
//      in page order. A task waits for the nearest marked parent to be built first.
//   2. The panel is blanked (each piece hidden in place, so nothing moves).
//   3. Five named cursors fly in, circle once, then each takes the next free task:
//        box    crosshair-drag a dashed rectangle with a live W × H badge, then it fills in
//        text   click, then type it in with a caret
//        image  drag a frame, then the picture sweeps in top to bottom
//        fill   paint-bucket: the colour floods out from the middle
//   4. When everything's back, the cursors drift toward your pointer and leave.
//
// Lite mode and reduced motion get a short recording instead (preload="none").

import { isLite, onLiteChange } from './device-tier';

type Kind = 'box' | 'text' | 'image' | 'fill';
type Task = {
  el: HTMLElement;
  kind: Kind;
  parent: Task | null;
  taken: boolean;
  done: boolean;
  text: string;
};
type Cursor = { id: string; el: HTMLElement; x: number; y: number; color: string };
type Pt = { x: number; y: number };

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

// While the panel is off-screen every tween freezes (no frames) and picks up where it left off.
let offscreen = false;
let wakers: (() => void)[] = [];
const setOffscreen = (v: boolean) => {
  offscreen = v;
  if (!v) {
    const w = wakers;
    wakers = [];
    w.forEach((f) => f());
  }
};

function tween(ms: number, step: (t: number) => void, ease = easeInOut): Promise<void> {
  return new Promise((resolve) => {
    let elapsed = 0;
    let prev = performance.now();
    const frame = (now: number) => {
      if (offscreen) {
        wakers.push(() => {
          prev = performance.now();
          requestAnimationFrame(frame);
        });
        return;
      }
      elapsed += Math.min(now - prev, 100);
      prev = now;
      const t = Math.min(1, elapsed / ms);
      step(ease(t));
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}

export function initRebuild(root: HTMLElement): void {
  const canvas = root.querySelector<HTMLElement>('[data-rebuild-canvas]')!;
  const layer = root.querySelector<HTMLElement>('[data-rebuild-layer]')!;
  const button = root.querySelector<HTMLButtonElement>('[data-rebuild-run]')!;
  const status = root.querySelector<HTMLElement>('[data-rebuild-status]');
  const video = root.querySelector<HTMLVideoElement>('[data-rebuild-video]');
  const cursors: Cursor[] = [...layer.querySelectorAll<HTMLElement>('[data-swarm-cursor]')].map((el) => ({
    id: el.dataset.swarmCursor!,
    el,
    x: 0,
    y: 0,
    color: getComputedStyle(el).getPropertyValue('--c').trim(),
  }));

  let running = false;
  let cancelled = false;
  let tasks: Task[] = [];
  let pointer: Pt | null = null;

  const still = () => isLite() || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const place = (c: Cursor, x: number, y: number) => {
    c.x = x;
    c.y = y;
    c.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  const move = (c: Cursor, to: Pt, ms = 420) => {
    const from = { x: c.x, y: c.y };
    // A slight arc, so paths don't look robotic.
    const bend = (Math.random() - 0.5) * 60;
    return tween(ms, (t) => {
      const arc = Math.sin(t * Math.PI) * bend;
      place(c, from.x + (to.x - from.x) * t + arc * 0.3, from.y + (to.y - from.y) * t + arc);
    });
  };

  const press = async (c: Cursor) => {
    c.el.dataset.press = '';
    await sleep(90);
    delete c.el.dataset.press;
  };

  const box = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const o = canvas.getBoundingClientRect();
    return { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height };
  };

  /** A dashed frame drawn from the top-left corner, with a live size badge. */
  const drawFrame = async (c: Cursor, el: HTMLElement, ms: number) => {
    const b = box(el);
    await move(c, { x: b.x, y: b.y });
    c.el.dataset.tool = 'cross';
    await press(c);
    const ph = document.createElement('div');
    ph.className = 'rb-ph';
    ph.style.setProperty('--c', c.color);
    const badge = document.createElement('span');
    badge.className = 'rb-badge';
    ph.append(badge);
    layer.append(ph);
    await tween(
      ms,
      (t) => {
        const w = Math.max(1, b.w * t);
        const h = Math.max(1, b.h * t);
        ph.style.transform = `translate(${b.x}px, ${b.y}px)`;
        ph.style.width = `${w}px`;
        ph.style.height = `${h}px`;
        badge.textContent = `${Math.round(w)} × ${Math.round(h)}`;
        place(c, b.x + w, b.y + h);
      },
      easeOut,
    );
    delete c.el.dataset.tool;
    return ph;
  };

  const runTask = async (c: Cursor, task: Task) => {
    const { el } = task;
    if (task.kind === 'box') {
      const ph = await drawFrame(c, el, 420);
      el.classList.remove('rb-hidden');
      el.classList.add('rb-pop');
      ph.classList.add('rb-ph-out');
      window.setTimeout(() => ph.remove(), 300);
    } else if (task.kind === 'image') {
      const ph = await drawFrame(c, el, 360);
      el.classList.remove('rb-hidden');
      el.classList.add('rb-sweep');
      ph.classList.add('rb-ph-out');
      window.setTimeout(() => ph.remove(), 300);
    } else if (task.kind === 'fill') {
      const b = box(el);
      await move(c, { x: b.x + b.w / 2, y: b.y + b.h / 2 }, 360);
      c.el.dataset.tool = 'bucket';
      await press(c);
      el.classList.remove('rb-hidden');
      el.classList.add('rb-flood');
      await sleep(260);
      delete c.el.dataset.tool;
    } else {
      const b = box(el);
      await move(c, { x: b.x, y: b.y + b.h / 2 }, 380);
      c.el.dataset.tool = 'beam';
      await press(c);
      // Hold the box's size while it's empty so nothing around it moves.
      el.style.minHeight = `${b.h}px`;
      el.style.minWidth = `${b.w}px`;
      el.textContent = '';
      el.classList.remove('rb-hidden');
      el.classList.add('rb-typing');
      const text = task.text;
      const per = Math.max(10, Math.min(34, 900 / Math.max(1, text.length)));
      for (let i = 1; i <= text.length; i++) {
        if (cancelled) break;
        el.textContent = text.slice(0, i);
        place(c, b.x + Math.min(b.w, (b.w * i) / text.length), b.y + b.h / 2);
        await sleep(per);
      }
      el.textContent = text;
      el.classList.remove('rb-typing');
      el.style.minHeight = '';
      el.style.minWidth = '';
      delete c.el.dataset.tool;
    }
    task.done = true;
  };

  const nextTask = () => tasks.find((t) => !t.taken && (!t.parent || t.parent.done));

  const worker = async (c: Cursor) => {
    while (!cancelled) {
      const t = nextTask();
      if (!t) {
        if (tasks.every((x) => x.taken)) return;
        await sleep(60);
        continue;
      }
      t.taken = true;
      await runTask(c, t);
    }
  };

  /** Put every piece back exactly as it was. */
  const restore = () => {
    for (const t of tasks) {
      t.el.classList.remove('rb-hidden', 'rb-typing', 'rb-pop', 'rb-sweep', 'rb-flood');
      if (t.kind === 'text') t.el.textContent = t.text;
      t.el.style.minHeight = '';
      t.el.style.minWidth = '';
    }
    layer.querySelectorAll('.rb-ph').forEach((p) => p.remove());
    canvas.classList.remove('rb-building');
  };

  const run = async () => {
    if (running) return;
    if (still()) {
      // The recording, only when asked for.
      if (video) {
        video.hidden = false;
        void video.play().catch(() => {});
      }
      return;
    }
    running = true;
    cancelled = false;
    button.disabled = true;
    if (status) status.textContent = 'Rebuilding: five cursors are drawing the panel back.';
    window.dispatchEvent(new Event('aryan-os:rebuild-start'));

    const els = [...canvas.querySelectorAll<HTMLElement>('[data-build]')];
    const byEl = new Map<HTMLElement, Task>();
    tasks = els.map((el) => {
      const t: Task = {
        el,
        kind: (el.dataset.build as Kind) ?? 'box',
        parent: null,
        taken: false,
        done: false,
        text: el.textContent ?? '',
      };
      byEl.set(el, t);
      return t;
    });
    for (const t of tasks) {
      const p = t.el.parentElement?.closest<HTMLElement>('[data-build]');
      t.parent = p ? (byEl.get(p) ?? null) : null;
    }

    // Blank the panel in place.
    canvas.classList.add('rb-building');
    tasks.forEach((t) => t.el.classList.add('rb-hidden'));

    // Fly in from the edges and circle the middle once.
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    const mid = { x: W / 2, y: H / 2 };
    layer.dataset.on = '';
    cursors.forEach((c, i) => {
      const a = (i / cursors.length) * Math.PI * 2;
      place(c, mid.x + Math.cos(a) * W, mid.y + Math.sin(a) * H);
    });
    await tween(
      1100,
      (t) => {
        cursors.forEach((c, i) => {
          const a = (i / cursors.length) * Math.PI * 2 + t * Math.PI * 1.4;
          const r = (1 - t) * Math.max(W, H) * 0.9 + t * Math.min(W, H) * 0.22;
          place(c, mid.x + Math.cos(a) * r, mid.y + Math.sin(a) * r * 0.7);
        });
      },
      easeOut,
    );

    await Promise.all(cursors.map((c, i) => sleep(i * 90).then(() => worker(c))));

    if (!cancelled) {
      // Drift toward the visitor's pointer for a moment, then leave.
      const goal = pointer ?? { x: W * 0.8, y: H * 0.85 };
      await Promise.all(
        cursors.map((c, i) => {
          const a = (i / cursors.length) * Math.PI * 2;
          return move(c, { x: goal.x + Math.cos(a) * 40, y: goal.y + Math.sin(a) * 30 }, 600);
        }),
      );
      await sleep(250);
      await Promise.all(
        cursors.map((c, i) => {
          const a = (i / cursors.length) * Math.PI * 2;
          return move(c, { x: c.x + Math.cos(a) * W, y: c.y + Math.sin(a) * H }, 700);
        }),
      );
    }
    delete layer.dataset.on;
    restore();
    running = false;
    button.disabled = false;
    if (status) status.textContent = 'Rebuilt. Press the button to watch it again.';
    window.dispatchEvent(new Event('aryan-os:rebuild-done'));
  };

  canvas.addEventListener('pointermove', (e) => {
    const o = canvas.getBoundingClientRect();
    pointer = { x: e.clientX - o.left, y: e.clientY - o.top };
  });
  canvas.addEventListener('pointerleave', () => (pointer = null));

  button.addEventListener('click', () => void run());
  if (still()) button.textContent = 'Play the recording';
  onLiteChange(() => {
    if (isLite() && running) cancelled = true;
    button.textContent = still() ? 'Play the recording' : 'Rebuild this section';
  });

  // Runs once by itself, the first time the panel is mostly on screen.
  const io = new IntersectionObserver(
    ([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      if (!still()) void run();
    },
    { threshold: 0.55 },
  );
  io.observe(canvas);
  new IntersectionObserver(([e]) => setOffscreen(!e.isIntersecting)).observe(root);
}
