// The "designed interface" layer the Astral and Orbits heroes draw on top of their skies:
// short-lived electric arcs between stars, a slowly turning ring of tick marks round the
// object, corner brackets, and a reticle that follows the pointer and locks on to the
// nearest star. Everything is a few batched paths per frame, so it costs almost nothing.
//
// The text readouts live in the DOM (HeroHud.tsx); this module also hands them the current
// lock through `hudState`, so both layers agree on what's targeted.

import { cream, ember } from '../../lib/palette';
import { rgb, type Pointer } from './canvas-loop';

const [CR, CG, CB] = rgb(cream['100']);
const [ER, EG, EB] = rgb(ember['500']);
const [HR, HG, HB] = rgb(ember['200']);
const MONO = "'Departure Mono', ui-monospace, Menlo, monospace";

/** Shared with the DOM readouts. */
export const hudState = { lock: -1, lockX: 0, lockY: 0 };

// ---------- Electric arcs ----------

type Arc = { a: number; b: number; age: number; life: number; seed: number };

/**
 * A few red-orange arcs that jump between nearby stars and die out in a fraction of a second.
 * `pick` returns a pair of star indices (or null) to start a new arc.
 */
export function arcs(max: number, pick: () => [number, number] | null) {
  const live: Arc[] = [];
  let wait = 0.4;
  let s = 1;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };

  return {
    draw(g: CanvasRenderingContext2D, dt: number, px: ArrayLike<number>, py: ArrayLike<number>) {
      wait -= dt;
      if (wait <= 0 && live.length < max) {
        const pair = pick();
        if (pair) live.push({ a: pair[0], b: pair[1], age: 0, life: 0.18 + Math.random() * 0.28, seed: Math.random() * 1e6 });
        // Bursts: sometimes two in quick succession, then a pause.
        wait = Math.random() < 0.35 ? 0.06 : 0.25 + Math.random() * 0.7;
      }
      if (!live.length) return;
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.lineCap = 'round';
      g.lineJoin = 'round';
      for (let i = live.length - 1; i >= 0; i--) {
        const arc = live[i];
        arc.age += dt;
        if (arc.age >= arc.life) {
          live.splice(i, 1);
          continue;
        }
        const k = arc.age / arc.life;
        // Strikes at full strength, then flickers out.
        const fade = (1 - k) * (0.6 + 0.4 * Math.sin(arc.age * 90));
        const x1 = px[arc.a];
        const y1 = py[arc.a];
        const x2 = px[arc.b];
        const y2 = py[arc.b];
        const len = Math.hypot(x2 - x1, y2 - y1);
        if (len < 4) continue;
        // A new jagged path every ~30 ms so it crackles.
        s = (Math.floor(arc.seed + arc.age * 33) % 2147483646) + 1;
        const nx = -(y2 - y1) / len;
        const ny = (x2 - x1) / len;
        const steps = Math.max(4, Math.min(12, Math.round(len / 9)));
        const jag = Math.min(9, len * 0.14);
        const ptsX: number[] = [x1];
        const ptsY: number[] = [y1];
        for (let j = 1; j < steps; j++) {
          const f = j / steps;
          const off = (rand() - 0.5) * 2 * jag * Math.sin(f * Math.PI);
          ptsX.push(x1 + (x2 - x1) * f + nx * off);
          ptsY.push(y1 + (y2 - y1) * f + ny * off);
        }
        ptsX.push(x2);
        ptsY.push(y2);
        const path = () => {
          g.beginPath();
          g.moveTo(ptsX[0], ptsY[0]);
          for (let j = 1; j < ptsX.length; j++) g.lineTo(ptsX[j], ptsY[j]);
        };
        // Glow, then the hot core.
        path();
        g.strokeStyle = `rgba(${ER},${EG},${EB},${0.28 * fade})`;
        g.lineWidth = 4;
        g.stroke();
        g.strokeStyle = `rgba(${HR},${HG},${HB},${0.9 * fade})`;
        g.lineWidth = 1;
        g.stroke();
        // A small fork off the middle.
        const m = Math.floor(ptsX.length / 2);
        const fl = jag * 1.6;
        g.beginPath();
        g.moveTo(ptsX[m], ptsY[m]);
        g.lineTo(ptsX[m] + nx * fl + (rand() - 0.5) * fl, ptsY[m] + ny * fl + (rand() - 0.5) * fl);
        g.strokeStyle = `rgba(${ER},${EG},${EB},${0.55 * fade})`;
        g.lineWidth = 0.8;
        g.stroke();
        // Both ends flash.
        g.fillStyle = `rgba(${HR},${HG},${HB},${0.7 * fade})`;
        g.fillRect(x1 - 1.5, y1 - 1.5, 3, 3);
        g.fillRect(x2 - 1.5, y2 - 1.5, 3, 3);
      }
      g.restore();
    },
  };
}

// ---------- Rings, brackets and the reticle ----------

/** A ring of tick marks and a partial ember arc round the object, plus corner brackets. */
export function frame(g: CanvasRenderingContext2D, cx: number, cy: number, R: number, t: number, squash = 1) {
  g.save();
  g.lineWidth = 1;
  // Ticks: one path, slowly turning. Every tenth tick is long.
  const rr = R * 1.24;
  const spin = t * 0.035;
  g.beginPath();
  for (let i = 0; i < 120; i++) {
    const a = spin + (i / 120) * Math.PI * 2;
    const long = i % 10 === 0;
    const r0 = rr;
    const r1 = rr + (long ? 9 : 4);
    const c = Math.cos(a);
    const s = Math.sin(a);
    g.moveTo(cx + c * r0, cy + s * r0 * squash);
    g.lineTo(cx + c * r1, cy + s * r1 * squash);
  }
  g.strokeStyle = `rgba(${CR},${CG},${CB},0.16)`;
  g.stroke();

  // A thin full ring, and an ember segment running the other way.
  g.beginPath();
  g.ellipse(cx, cy, R * 1.17, R * 1.17 * squash, 0, 0, Math.PI * 2);
  g.strokeStyle = `rgba(${CR},${CG},${CB},0.08)`;
  g.stroke();
  const a0 = -t * 0.22;
  g.beginPath();
  g.ellipse(cx, cy, R * 1.31, R * 1.31 * squash, 0, a0, a0 + 0.9);
  g.strokeStyle = `rgba(${ER},${EG},${EB},0.5)`;
  g.lineWidth = 1.5;
  g.stroke();
  g.beginPath();
  g.ellipse(cx, cy, R * 1.31, R * 1.31 * squash, 0, a0 + Math.PI, a0 + Math.PI + 0.25);
  g.strokeStyle = `rgba(${CR},${CG},${CB},0.32)`;
  g.stroke();

  // Corner brackets round the whole thing.
  const bx = R * 1.5;
  const by = R * 1.5 * squash + 8;
  const L = Math.max(14, R * 0.12);
  g.beginPath();
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    const x = cx + sx * bx;
    const y = cy + sy * by;
    g.moveTo(x - sx * L, y);
    g.lineTo(x, y);
    g.lineTo(x, y - sy * L);
  }
  g.strokeStyle = `rgba(${CR},${CG},${CB},0.4)`;
  g.lineWidth = 1;
  g.stroke();
  g.restore();
}

/**
 * The pointer's reticle, locked on to the nearest star within reach. `count` stars at px/py;
 * `bright(i)` says which ones are worth locking on to.
 */
export function reticle(
  g: CanvasRenderingContext2D,
  p: Pointer,
  W: number,
  H: number,
  px: ArrayLike<number>,
  py: ArrayLike<number>,
  count: number,
  bright: (i: number) => boolean,
  label: (i: number) => string,
) {
  hudState.lock = -1;
  if (!p.inside) return;
  const mx = ((p.x + 1) / 2) * W;
  const my = ((p.y + 1) / 2) * H;
  let best = -1;
  let bd = 70 * 70;
  for (let i = 0; i < count; i++) {
    if (!bright(i)) continue;
    const dx = px[i] - mx;
    const dy = py[i] - my;
    const d = dx * dx + dy * dy;
    if (d < bd) {
      bd = d;
      best = i;
    }
  }

  g.save();
  g.lineWidth = 1;
  // The free crosshair at the pointer.
  g.beginPath();
  g.arc(mx, my, 11, 0, Math.PI * 2);
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    g.moveTo(mx + dx * 15, my + dy * 15);
    g.lineTo(mx + dx * 22, my + dy * 22);
  }
  g.strokeStyle = `rgba(${CR},${CG},${CB},0.45)`;
  g.stroke();

  if (best >= 0) {
    const x = px[best];
    const y = py[best];
    hudState.lock = best;
    hudState.lockX = x;
    hudState.lockY = y;
    // Square lock brackets and a leader line out to the label.
    const s = 9;
    const l = 4;
    g.beginPath();
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      g.moveTo(x + sx * s, y + sy * s - sy * l);
      g.lineTo(x + sx * s, y + sy * s);
      g.lineTo(x + sx * s - sx * l, y + sy * s);
    }
    g.strokeStyle = `rgba(${ER},${EG},${EB},0.95)`;
    g.stroke();
    const lx = x + 34;
    const ly = y - 26;
    g.beginPath();
    g.moveTo(x + s, y - s);
    g.lineTo(lx - 6, ly);
    g.lineTo(lx + 92, ly);
    g.strokeStyle = `rgba(${CR},${CG},${CB},0.35)`;
    g.stroke();
    g.font = `10px ${MONO}`;
    g.fillStyle = `rgba(${CR},${CG},${CB},0.85)`;
    g.fillText(label(best), lx, ly - 5);
  }
  g.restore();
}
