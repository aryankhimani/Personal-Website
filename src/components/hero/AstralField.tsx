// Hero 4, "Astral": a slowly turning globe of stars joined into constellations, with a few
// red-orange signals hopping from star to star along the lines, short electric arcs, and a
// HUD (tick ring, brackets, a reticle that locks on to stars). The pointer tilts the globe
// and lights up the stars near it.
//
// Written from scratch; the idea (a plexus of stars on a sphere) is inspired by React Bits
// Pro's Astral Shell, which we only looked at. Plain canvas 2D, so it costs no WebGL context.

import { cream, ember, navy } from '../../lib/palette';
import { rgb, rng, useCanvasScene, type Scene } from './canvas-loop';
import { arcs, frame, reticle } from './hud';

const BUCKETS = 8; // brightness steps for batched drawing
const NODES = 340;
const LINKS = 3; // nearest neighbours per star
const MAX_LINK = 0.36; // max link length, in sphere radii
const SIGNALS = 11;
const TRAIL = 4; // glow copies behind each signal

type Node = { x: number; y: number; z: number; size: number; hot: boolean; tw: number };
type Signal = { from: number; to: number; k: number; speed: number };

function build(): { nodes: Node[]; edges: [number, number][]; next: number[][] } {
  const r = rng(4);
  const nodes: Node[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < NODES; i++) {
    // Fibonacci sphere, nudged so it reads as a sky, not a grid.
    const y = 1 - ((i + 0.5) / NODES) * 2;
    const ring = Math.sqrt(1 - y * y);
    const a = i * golden + (r() - 0.5) * 0.5;
    const yy = Math.max(-1, Math.min(1, y + (r() - 0.5) * 0.05));
    const len = Math.hypot(Math.cos(a) * ring, yy, Math.sin(a) * ring) || 1;
    nodes.push({
      x: (Math.cos(a) * ring) / len,
      y: yy / len,
      z: (Math.sin(a) * ring) / len,
      size: 0.7 + r() ** 3 * 1.9,
      hot: r() < 0.035,
      tw: r() * Math.PI * 2,
    });
  }
  const seen = new Set<string>();
  const edges: [number, number][] = [];
  const next: number[][] = nodes.map(() => []);
  const max2 = MAX_LINK * MAX_LINK;
  nodes.forEach((n, i) => {
    const close: { j: number; d: number }[] = [];
    for (let j = 0; j < nodes.length; j++) {
      if (j === i) continue;
      const m = nodes[j];
      const d = (n.x - m.x) ** 2 + (n.y - m.y) ** 2 + (n.z - m.z) ** 2;
      if (d < max2) close.push({ j, d });
    }
    const near = close.sort((a, b) => a.d - b.d).slice(0, LINKS);
    for (const { j } of near) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([i, j]);
      next[i].push(j);
      next[j].push(i);
    }
  });
  return { nodes, edges, next };
}

function astral(): Scene {
  const { nodes, edges, next } = build();
  const r = rng(11);
  // Far sky in three depth layers: more, smaller, slower stars further back. The pointer
  // shifts each layer a little (parallax), using the eased position.
  const LAYERS = [
    { n: 300, s: [0.4, 0.7], a: 0.14, shift: 4 },
    { n: 160, s: [0.6, 1.0], a: 0.2, shift: 10 },
    { n: 60, s: [0.9, 1.5], a: 0.3, shift: 20 },
  ];
  const sky = LAYERS.map((L) =>
    Array.from({ length: L.n }, () => ({ x: r(), y: r(), s: L.s[0] + r() * (L.s[1] - L.s[0]), tw: r() * 6.3, sp: 0.5 + r() * 1.4 })),
  );
  const signals: Signal[] = Array.from({ length: SIGNALS }, () => {
    const from = Math.floor(r() * NODES);
    return { from, to: next[from][0] ?? from, k: r(), speed: 0.5 + r() * 0.6 };
  });
  // One pre-drawn ember glow, stamped with drawImage (no gradient objects per frame).
  const GLOW = 16;
  const glow = document.createElement('canvas');
  glow.width = glow.height = GLOW * 2;
  {
    const gg = glow.getContext('2d')!;
    const [r0, g0, b0] = rgb(ember['500']);
    const [h0, h1, h2] = rgb(ember['200']);
    const grad = gg.createRadialGradient(GLOW, GLOW, 0, GLOW, GLOW, GLOW);
    grad.addColorStop(0, `rgba(${h0},${h1},${h2},1)`);
    grad.addColorStop(0.18, `rgba(${r0},${g0},${b0},0.9)`);
    grad.addColorStop(1, `rgba(${r0},${g0},${b0},0)`);
    gg.fillStyle = grad;
    gg.fillRect(0, 0, GLOW * 2, GLOW * 2);
  }
  // A rare shooting star across the far sky.
  const meteor = { on: false, x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 0, wait: 3 + r() * 4 };
  const px = new Float32Array(NODES);
  const py = new Float32Array(NODES);
  const pz = new Float32Array(NODES);
  const edgeLevel = new Uint8Array(edges.length);
  const starLevel = new Uint8Array(NODES);
  const starSize = new Float32Array(NODES);
  // Arcs jump along a constellation line on the near side of the globe.
  const sparks = arcs(3, () => {
    for (let tries = 0; tries < 12; tries++) {
      const [a, b] = edges[Math.floor(Math.random() * edges.length)];
      if (pz[a] > 0.15 && pz[b] > 0.15) return [a, b];
    }
    return null;
  });
  const [cr, cg, cb] = rgb(cream['100']);
  const [er, eg, eb] = rgb(ember['500']);
  const [mr, mg, mb] = rgb(navy['300']);
  let W = 0;
  let H = 0;
  let cx = 0;
  let cy = 0;
  let R = 0;

  return {
    resize(w, h) {
      W = w;
      H = h;
      // Desktop: right of the copy. Phone: in the top half, above it.
      if (w >= 768) {
        cx = w * 0.69;
        cy = h * 0.47;
        R = Math.min(w * 0.25, h * 0.37);
      } else {
        cx = w * 0.5;
        cy = h * 0.29;
        R = Math.min(w * 0.4, h * 0.2);
      }
    },
    draw(g, t, dt, p) {
      // Far stars: one path per layer and twinkle step.
      for (let l = 0; l < LAYERS.length; l++) {
        const L = LAYERS[l];
        const ox = -p.x * L.shift;
        const oy = -p.y * L.shift * 0.6;
        for (let lv = 0; lv < 4; lv++) {
          g.beginPath();
          for (const st of sky[l]) {
            const tw = 0.5 + 0.5 * Math.sin(t * st.sp + st.tw);
            if (Math.min(3, Math.floor(tw * 4)) !== lv) continue;
            g.rect(st.x * W + ox, st.y * H + oy, st.s, st.s);
          }
          g.fillStyle = l === 2 && lv === 3 ? `rgba(${cr},${cg},${cb},${L.a + 0.25})` : `rgba(${mr},${mg},${mb},${(L.a * (0.45 + lv * 0.3)).toFixed(3)})`;
          g.fill();
        }
      }

      // Shooting star: a short streak that fades along its tail.
      meteor.wait -= dt;
      if (!meteor.on && meteor.wait <= 0) {
        const dir = Math.random() < 0.5 ? -1 : 1;
        meteor.on = true;
        meteor.x = W * (0.15 + Math.random() * 0.7);
        meteor.y = H * (0.05 + Math.random() * 0.3);
        const v = 520 + Math.random() * 380;
        meteor.vx = dir * v * 0.86;
        meteor.vy = v * 0.5;
        meteor.age = 0;
        meteor.life = 0.55 + Math.random() * 0.4;
      }
      if (meteor.on) {
        meteor.age += dt;
        meteor.x += meteor.vx * dt;
        meteor.y += meteor.vy * dt;
        const k = meteor.age / meteor.life;
        if (k >= 1) {
          meteor.on = false;
          meteor.wait = 5 + Math.random() * 7;
        } else {
          const fade = Math.sin(k * Math.PI);
          g.lineCap = 'round';
          for (let seg = 0; seg < 3; seg++) {
            const a0 = 0.06 * seg;
            const a1 = 0.06 * (seg + 1);
            g.beginPath();
            g.moveTo(meteor.x - meteor.vx * a0, meteor.y - meteor.vy * a0);
            g.lineTo(meteor.x - meteor.vx * a1, meteor.y - meteor.vy * a1);
            g.strokeStyle = `rgba(${cr},${cg},${cb},${(0.7 * fade * (1 - seg / 3)).toFixed(3)})`;
            g.lineWidth = 1.3 - seg * 0.35;
            g.stroke();
          }
        }
      }

      // A soft halo, so the globe has a body.
      const halo = g.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.35);
      halo.addColorStop(0, 'rgba(44,59,107,0.32)');
      halo.addColorStop(1, 'rgba(11,20,48,0)');
      g.fillStyle = halo;
      g.fillRect(cx - R * 1.4, cy - R * 1.4, R * 2.8, R * 2.8);

      // Rotate: a steady turn plus the pointer's tilt.
      const yaw = t * 0.11 + p.x * 0.7;
      const pitch = 0.38 + p.y * 0.35;
      const cyw = Math.cos(yaw);
      const syw = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      // Hover light sits exactly on the pointer; only its strength (p.on) eases.
      const hx = p.mx;
      const hy = p.my;
      const hover = p.on > 0.01;
      for (let i = 0; i < NODES; i++) {
        const n = nodes[i];
        const x1 = n.x * cyw + n.z * syw;
        const z1 = -n.x * syw + n.z * cyw;
        const y2 = n.y * cp - z1 * sp;
        const z2 = n.y * sp + z1 * cp;
        const persp = 1 / (1.9 - z2 * 0.5);
        px[i] = cx + x1 * R * persp * 1.4;
        py[i] = cy + y2 * R * persp * 1.4;
        pz[i] = z2; // -1 back .. 1 front
      }

      // Constellation lines, fainter at the back. Bucketed by brightness so the whole web is
      // BUCKETS strokes a frame instead of one per line.
      for (let e = 0; e < edges.length; e++) {
        const [a, b] = edges[e];
        const z = (pz[a] + pz[b]) / 2;
        let alpha = 0.05 + 0.3 * ((z + 1) / 2) ** 2;
        if (hover) {
          const d = Math.hypot((px[a] + px[b]) / 2 - hx, (py[a] + py[b]) / 2 - hy);
          alpha += Math.max(0, 1 - d / (R * 0.45)) * 0.35 * p.on;
        }
        edgeLevel[e] = Math.min(BUCKETS - 1, Math.floor(alpha * BUCKETS * 1.4));
      }
      g.lineWidth = 0.7;
      for (let lv = 0; lv < BUCKETS; lv++) {
        g.beginPath();
        let any = false;
        for (let e = 0; e < edges.length; e++) {
          if (edgeLevel[e] !== lv) continue;
          const [a, b] = edges[e];
          g.moveTo(px[a], py[a]);
          g.lineTo(px[b], py[b]);
          any = true;
        }
        if (!any) continue;
        g.strokeStyle = `rgba(${cr},${cg},${cb},${((lv + 0.5) / (BUCKETS * 1.4)).toFixed(3)})`;
        g.stroke();
      }

      // Stars, bucketed the same way (cream and ember separately).
      for (let i = 0; i < NODES; i++) {
        const n = nodes[i];
        const front = (pz[i] + 1) / 2;
        let alpha = 0.18 + 0.82 * front * (0.85 + 0.15 * Math.sin(t * 1.6 + n.tw));
        let size = n.size * (0.6 + front * 0.6);
        if (hover) {
          const near = Math.max(0, 1 - Math.hypot(px[i] - hx, py[i] - hy) / (R * 0.35)) * p.on;
          alpha = Math.min(1, alpha + near * 0.5);
          size += near * 1.2;
        }
        starLevel[i] = Math.min(BUCKETS - 1, Math.floor(alpha * BUCKETS));
        starSize[i] = size;
      }
      for (const hot of [false, true]) {
        for (let lv = 0; lv < BUCKETS; lv++) {
          g.beginPath();
          let any = false;
          for (let i = 0; i < NODES; i++) {
            if (starLevel[i] !== lv || nodes[i].hot !== hot) continue;
            g.moveTo(px[i] + starSize[i], py[i]);
            g.arc(px[i], py[i], starSize[i], 0, Math.PI * 2);
            any = true;
          }
          if (!any) continue;
          const a = ((lv + 1) / BUCKETS).toFixed(3);
          g.fillStyle = hot ? `rgba(${er},${eg},${eb},${a})` : `rgba(${cr},${cg},${cb},${a})`;
          g.fill();
        }
      }

      // The interface on top: arcs between front stars, the ring, the reticle.
      sparks.draw(g, dt, px, py);
      frame(g, cx, cy, R, t);
      reticle(g, p, dt, px, py, NODES, (i) => pz[i] > 0, (i) => `STAR ${String(i).padStart(4, '0')} · Z ${pz[i].toFixed(2)}`);

      // Signals: ember sparks that travel a line, then pick a neighbour and carry on.
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (const s of signals) {
        s.k += dt * s.speed;
        if (s.k >= 1) {
          const options = next[s.to].filter((j) => j !== s.from);
          s.from = s.to;
          s.to = options.length ? options[Math.floor(Math.random() * options.length)] : next[s.to][0];
          s.k = 0;
        }
        const front = ((pz[s.from] + pz[s.to]) / 2 + 1) / 2;
        // Head plus a short fading trail along the same line.
        for (let j = TRAIL - 1; j >= 0; j--) {
          const k = s.k - j * 0.06;
          if (k < 0) continue;
          const x = px[s.from] + (px[s.to] - px[s.from]) * k;
          const y = py[s.from] + (py[s.to] - py[s.from]) * k;
          const size = (j === 0 ? 8 : 6 - j) * (0.7 + 0.5 * front);
          g.globalAlpha = (0.2 + 0.75 * front) * (1 - j / TRAIL);
          g.drawImage(glow, x - size, y - size, size * 2, size * 2);
        }
      }
      g.globalAlpha = 1;
      g.restore();
    },
  };
}

export default function AstralField() {
  const canvas = useCanvasScene(astral);
  return <canvas ref={canvas} className="sky-canvas" />;
}
