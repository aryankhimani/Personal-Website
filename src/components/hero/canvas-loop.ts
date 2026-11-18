// A small shared loop for the canvas-2D heroes (Astral, Orbits): sizes the canvas to its box
// at the device pixel ratio (capped at 2), tracks the pointer across the whole hero, pauses
// off-screen and in hidden tabs, and draws a single still frame under reduced motion.

import { useEffect, useRef } from 'react';

export type Pointer = {
  /** Pointer position as -1..1 across the canvas, eased; 0,0 when away. */
  x: number;
  y: number;
  /** True while the pointer is over the hero. */
  inside: boolean;
};

export type Scene = {
  resize: (w: number, h: number) => void;
  draw: (g: CanvasRenderingContext2D, t: number, dt: number, p: Pointer) => void;
};

export function useCanvasScene(make: () => Scene) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvas.current;
    const g = c?.getContext('2d', { alpha: true });
    if (!c || !g) return;
    const scene = make();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const target = { x: 0, y: 0 };
    const p: Pointer = { x: 0, y: 0, inside: false };
    let W = 0;
    let H = 0;
    let raf = 0;
    let visible = true;
    let last = performance.now();
    let t = 0;

    const resize = () => {
      const r = c.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      scene.resize(W, H);
    };

    const paint = (dt: number) => {
      g.clearRect(0, 0, W, H);
      scene.draw(g, t, dt, p);
    };

    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      const k = 1 - Math.exp(-dt * 3);
      p.x += (target.x - p.x) * k;
      p.y += (target.y - p.y) * k;
      paint(dt);
      if (visible) raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (reduced) {
        t = 8; // a settled moment, not frame zero
        paint(0);
        return;
      }
      if (!raf && visible) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    const hero = c.closest('.hero') ?? c;
    const onMove = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      target.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      target.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      p.inside = true;
    };
    const onLeave = () => {
      target.x = target.y = 0;
      p.inside = false;
    };
    hero.addEventListener('pointermove', onMove as EventListener);
    hero.addEventListener('pointerleave', onLeave);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && !document.hidden;
      if (visible) start();
    });
    io.observe(c);
    const onVis = () => {
      visible = !document.hidden;
      if (visible) start();
    };
    document.addEventListener('visibilitychange', onVis);
    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) paint(0);
      else start();
    });
    ro.observe(c);

    resize();
    start();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      hero.removeEventListener('pointermove', onMove as EventListener);
      hero.removeEventListener('pointerleave', onLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return canvas;
}

/** Deterministic random, so the sky is the same on every visit (and in the stills). */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = Math.imul(s ^ (s >>> 15), 1 | s);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** "#RRGGBB" -> "r g b" pieces for rgba() strings. */
export function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
