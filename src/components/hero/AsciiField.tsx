// The ASCII hero: a full-screen field of characters with the AK logo carved out of it.
//
//   - The field drifts like Gradient ASCII (a slow wave of density) with a few matrix-style
//     rain columns falling through it.
//   - The logo is "carved": cells inside it use the dense end of the ramp and are brighter,
//     with lighter characters on its edges, like ASCII lettering.
//   - The pointer drags a red-orange wake through it (the heat-grid idea from Bencho's ASCII
//     Wake, MIT): cells under the hand heat up, scramble and cool back down behind it.
//   - A click sends a ripple out. As it passes, cells re-scramble and switch to the next
//     character set: 01 → #*+. → ｱｲｳ → ░▒▓ → back to 01.
//
// Plain canvas 2D with a pre-drawn glyph atlas, so it costs no WebGL context. It renders at
// the device pixel ratio (capped at 2), pauses off-screen and in hidden tabs.

import { useEffect, useRef } from 'react';
import { cream, ember } from '../../lib/palette';
import { HERO_DPR } from './canvas-loop';

type CharSet = { name: string; ramp: string[] };

/** Lightest to densest. The first entry is always blank. */
export const SETS: CharSet[] = [
  { name: 'binary', ramp: [' ', '.', ':', '0', '1', '0', '1'] },
  { name: 'classic', ramp: [' ', '.', ':', '-', '=', '+', '*', '#', '%', '@'] },
  { name: 'kana', ramp: [' ', '･', 'ｰ', 'ﾉ', 'ｼ', 'ﾂ', 'ｱ', 'ｲ', 'ｳ', 'ﾊ'] },
  { name: 'blocks', ramp: [' ', '·', '░', '▒', '▓', '█'] },
];

const LEVELS = 6; // brightness steps per colour in the atlas
const FONT = `'Departure Mono', ui-monospace, 'SF Mono', Menlo, monospace`;
const RING_SPEED = 900; // px per second
const RING_WIDTH = 36;

type Props = {
  /** Where the logo sits, as fractions of the canvas: [centreX, centreY, height]. */
  logo?: (w: number, h: number) => [number, number, number];
  /** Called when the character set changes (for the screen-reader status / tests). */
  onSet?: (name: string) => void;
};

function defaultLogo(w: number, h: number): [number, number, number] {
  // Desktop: right of centre, beside the name. Phone: in the top half, above the copy.
  return w >= 768 ? [0.7, 0.47, 0.62] : [0.5, 0.3, Math.min(0.32, (w / h) * 0.75)];
}

export default function AsciiField({ logo = defaultLogo, onSet }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = wrap.current;
    const c = canvas.current;
    const g = c?.getContext('2d', { alpha: true });
    if (!host || !c || !g) return;

    let dpr = 1;
    let drawn = 0; // last drawn frame: the field runs at ~30 fps, which reads fine for text
    let W = 0;
    let H = 0;
    let cw = 10;
    let ch = 14;
    let cols = 0;
    let rows = 0;
    let heat = new Float32Array(0); // pointer wake, 0..1
    let mask = new Float32Array(0); // logo, 0..1
    let edge = new Float32Array(0); // logo outline, 0..1
    let set = new Uint8Array(0); // character set per cell
    let seed = new Float32Array(0); // per-cell random, for shimmer
    let rain: { col: number; y: number; speed: number; len: number }[] = [];
    let current = 0;
    const rings: { x: number; y: number; t0: number; to: number }[] = [];
    const atlases = new Map<number, HTMLCanvasElement>();

    let logoImg: HTMLImageElement | null = null;
    let raf = 0;
    let visible = true;
    let last = performance.now();
    let deal = 0;
    const hand = { x: -1e4, y: -1e4, lx: NaN, ly: NaN };

    // One atlas per character set: every glyph in LEVELS shades of cream and of ember.
    const atlasFor = (si: number) => {
      const hit = atlases.get(si);
      if (hit) return hit;
      const ramp = SETS[si].ramp;
      const a = document.createElement('canvas');
      a.width = Math.ceil(cw * dpr) * ramp.length;
      a.height = Math.ceil(ch * dpr) * LEVELS * 2;
      const x = a.getContext('2d')!;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.font = `${Math.round(ch * 0.78 * dpr)}px ${FONT}`;
      const tw = Math.ceil(cw * dpr);
      const th = Math.ceil(ch * dpr);
      for (let l = 0; l < LEVELS * 2; l++) {
        const hot = l >= LEVELS;
        const k = (l % LEVELS) + 1;
        x.globalAlpha = hot ? 0.35 + (0.65 * k) / LEVELS : 0.1 + (0.9 * k * k) / (LEVELS * LEVELS);
        x.fillStyle = hot ? ember['500'] : cream['100'];
        ramp.forEach((glyph, gi) => x.fillText(glyph, gi * tw + tw / 2, l * th + th / 2 + 0.5));
      }
      atlases.set(si, a);
      return a;
    };

    // The logo as a density mask: interior cells dense, edges light.
    const carve = () => {
      mask = new Float32Array(cols * rows);
      edge = new Float32Array(cols * rows);
      if (!logoImg?.complete || !logoImg.naturalWidth) return;
      const off = document.createElement('canvas');
      off.width = cols;
      off.height = rows;
      const x = off.getContext('2d', { willReadFrequently: true })!;
      const [fx, fy, fh] = logo(W, H);
      const hPx = (fh * H) / ch; // logo height in rows
      const wPx = (hPx * ch) / cw; // same height, in columns (cells aren't square)
      x.drawImage(logoImg, fx * cols - wPx / 2, fy * rows - hPx / 2, wPx, hPx);
      const data = x.getImageData(0, 0, cols, rows).data;
      for (let i = 0; i < cols * rows; i++) mask[i] = data[i * 4 + 3] / 255;
      // An edge is a filled cell next to an empty one.
      for (let j = 1; j < rows - 1; j++) {
        for (let i = 1; i < cols - 1; i++) {
          const k = j * cols + i;
          if (mask[k] < 0.5) continue;
          const n = mask[k - 1] + mask[k + 1] + mask[k - cols] + mask[k + cols];
          if (n < 3.5) edge[k] = 1;
        }
      }
    };

    const resize = () => {
      const r = host.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      dpr = Math.min(HERO_DPR, window.devicePixelRatio || 1);
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
      c.style.width = `${W}px`;
      c.style.height = `${H}px`;
      const size = W < 768 ? 11 : 13;
      ch = size;
      cw = Math.round(size * 0.62 * 100) / 100;
      cols = Math.ceil(W / cw);
      rows = Math.ceil(H / ch);
      heat = new Float32Array(cols * rows);
      set = new Uint8Array(cols * rows).fill(current);
      seed = new Float32Array(cols * rows).map(() => Math.random());
      rain = Array.from({ length: Math.max(4, Math.round(cols / 14)) }, () => ({
        col: Math.floor(Math.random() * cols),
        y: Math.random() * rows,
        speed: 8 + Math.random() * 16,
        len: 6 + Math.random() * 14,
      }));
      atlases.clear();
      carve();
    };

    const stamp = (x: number, y: number, rad: number, amt: number) => {
      const c0 = Math.max(0, Math.floor((x - rad) / cw));
      const c1 = Math.min(cols - 1, Math.ceil((x + rad) / cw));
      const r0 = Math.max(0, Math.floor((y - rad) / ch));
      const r1 = Math.min(rows - 1, Math.ceil((y + rad) / ch));
      const R2 = rad * rad;
      for (let j = r0; j <= r1; j++) {
        const dy = (j + 0.5) * ch - y;
        for (let i = c0; i <= c1; i++) {
          const dx = (i + 0.5) * cw - x;
          const q = (dx * dx + dy * dy) / R2;
          if (q >= 1) continue;
          const k = j * cols + i;
          heat[k] = Math.min(1, heat[k] + amt * (1 - q) * (1 - q));
        }
      }
    };

    const frame = (now: number) => {
      raf = 0;
      if (!visible) return;
      if (now - drawn < 31) {
        raf = requestAnimationFrame(frame);
        return;
      }
      drawn = now;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;

      // The wake: stamp along the line the hand moved, so fast strokes leave no gaps.
      if (Number.isFinite(hand.lx)) {
        const dx = hand.x - hand.lx;
        const dy = hand.y - hand.ly;
        const steps = Math.min(24, Math.ceil(Math.hypot(dx, dy) / 8));
        for (let s = 1; s <= steps; s++) stamp(hand.lx + (dx * s) / steps, hand.ly + (dy * s) / steps, 54, 0.32);
      }
      hand.lx = hand.x;
      hand.ly = hand.y;
      const cool = Math.pow(0.18, dt); // ~1.2s to cool
      for (let k = 0; k < heat.length; k++) heat[k] *= cool;

      // Ripples: switch each cell's set as the ring front passes it, and heat the front.
      for (let r = rings.length - 1; r >= 0; r--) {
        const ring = rings[r];
        const rad = (t - ring.t0) * RING_SPEED;
        if (rad > Math.hypot(W, H) + RING_WIDTH) {
          rings.splice(r, 1);
          continue;
        }
        const inner = Math.max(0, rad - RING_WIDTH);
        const j0 = Math.max(0, Math.floor((ring.y - rad) / ch));
        const j1 = Math.min(rows - 1, Math.ceil((ring.y + rad) / ch));
        for (let j = j0; j <= j1; j++) {
          const dy = (j + 0.5) * ch - ring.y;
          if (Math.abs(dy) > rad) continue;
          const span = Math.sqrt(rad * rad - dy * dy);
          const innerSpan = inner > Math.abs(dy) ? Math.sqrt(inner * inner - dy * dy) : 0;
          // Two arcs per row: left and right of the centre.
          for (const sign of [-1, 1]) {
            const a = ring.x + sign * innerSpan;
            const b = ring.x + sign * span;
            const i0 = Math.max(0, Math.floor(Math.min(a, b) / cw));
            const i1 = Math.min(cols - 1, Math.ceil(Math.max(a, b) / cw));
            for (let i = i0; i <= i1; i++) {
              const k = j * cols + i;
              set[k] = ring.to;
              heat[k] = Math.max(heat[k], 0.12);
              seed[k] = Math.random();
            }
          }
        }
      }

      // Rain heads move down; their trail is computed per cell below.
      for (const d of rain) {
        d.y += d.speed * dt;
        if (d.y - d.len > rows) {
          d.y = -Math.random() * 10;
          d.col = Math.floor(Math.random() * cols);
          d.speed = 8 + Math.random() * 16;
        }
      }
      const rainAt = new Float32Array(cols * rows);
      for (const d of rain) {
        const head = Math.floor(d.y);
        for (let s = 0; s < d.len; s++) {
          const j = head - s;
          if (j < 0 || j >= rows) continue;
          rainAt[j * cols + d.col] = Math.max(rainAt[j * cols + d.col], s === 0 ? 1 : 0.55 * (1 - s / d.len));
        }
      }

      deal += dt;
      const reshuffle = deal > 0.08;
      if (reshuffle) deal = 0;

      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, c.width, c.height);
      const tw = Math.ceil(cw * dpr);
      const th = Math.ceil(ch * dpr);
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const k = j * cols + i;
          const x = i * cw;
          const y = j * ch;
          // The drifting field: two slow waves, kept faint so the logo and text read first.
          const wave =
            0.5 +
            0.5 * Math.sin(i * 0.045 + t * 0.35 + Math.sin(j * 0.06 - t * 0.22) * 2.2) * Math.cos(j * 0.035 - t * 0.18);
          let level = wave * wave * 0.4;
          const m = mask[k];
          if (m > 0.4) level = edge[k] ? 0.5 + 0.1 * Math.sin(t * 2 + seed[k] * 6) : 0.78 + 0.18 * wave;
          const rn = rainAt[k];
          if (rn > level) level = rn * (m > 0.4 ? 1 : 0.8);
          const hk = heat[k];
          if (hk > 0.02) level = Math.max(level, 0.35 + hk * 0.65);
          if (level < 0.06) continue;

          const ramp = SETS[set[k]].ramp;
          let gi = Math.min(ramp.length - 1, 1 + Math.floor(level * (ramp.length - 1)));
          // Shimmer: hot, rain and logo-edge cells flicker between neighbouring glyphs.
          if ((hk > 0.08 || rn > 0.3) && reshuffle) seed[k] = Math.random();
          if (hk > 0.08 || rn > 0.3) gi = Math.max(1, Math.min(ramp.length - 1, gi + Math.round((seed[k] - 0.5) * 3)));

          const hot = hk > 0.14;
          const shade = hot ? hk : m > 0.4 ? level : Math.max(level, rn);
          const lvl = Math.min(LEVELS - 1, Math.floor(shade * LEVELS));
          const row = (hot ? LEVELS : 0) + lvl;
          g.drawImage(atlasFor(set[k]), gi * tw, row * th, tw, th, Math.round(x * dpr), Math.round(y * dpr), tw, th);
        }
      }
      if (visible) raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (!raf && visible && !document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    // Pointer: listen on the whole hero, since the field sits behind the copy.
    const hero = host.closest('.hero') ?? host;
    const onMove = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      hand.x = e.clientX - r.left;
      hand.y = e.clientY - r.top;
      if (!Number.isFinite(hand.lx)) {
        hand.lx = hand.x;
        hand.ly = hand.y;
      }
    };
    const onLeave = () => {
      hand.lx = NaN;
      hand.x = hand.y = -1e4;
    };
    const onDown = (e: PointerEvent) => {
      if ((e.target as Element).closest('a, button, input, [role="button"]')) return;
      const r = c.getBoundingClientRect();
      current = (current + 1) % SETS.length;
      rings.push({ x: e.clientX - r.left, y: e.clientY - r.top, t0: performance.now() / 1000, to: current });
      host.dataset.charset = SETS[current].name;
      onSet?.(SETS[current].name);
    };
    hero.addEventListener('pointermove', onMove as EventListener);
    hero.addEventListener('pointerleave', onLeave);
    hero.addEventListener('pointerdown', onDown as EventListener);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    });
    io.observe(host);
    const onVis = () => (document.hidden ? (visible = false) : ((visible = true), start()));
    document.addEventListener('visibilitychange', onVis);
    const ro = new ResizeObserver(() => {
      resize();
      start();
    });
    ro.observe(host);

    logoImg = new Image();
    logoImg.onload = () => carve();
    logoImg.src = '/logo.svg';

    host.dataset.charset = SETS[current].name;
    resize();
    // Fonts can arrive after the first atlas; rebuild once they do.
    void document.fonts?.ready.then(() => atlases.clear());
    start();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      hero.removeEventListener('pointermove', onMove as EventListener);
      hero.removeEventListener('pointerleave', onLeave);
      hero.removeEventListener('pointerdown', onDown as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={wrap} className="ascii-field">
      <canvas ref={canvas} />
    </div>
  );
}
