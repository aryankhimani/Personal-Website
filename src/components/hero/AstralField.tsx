// Hero 4, "Astral": a slowly turning globe of stars joined into constellations, with a few
// red-orange signals hopping from star to star along the lines. The pointer tilts the globe
// and lights up the stars near it.
//
// Written from scratch; the idea (a plexus of stars on a sphere) is inspired by React Bits
// Pro's Astral Shell, which we only looked at. Plain canvas 2D, so it costs no WebGL context.

import { cream, ember, navy } from '../../lib/palette';
import { rgb, rng, useCanvasScene, type Scene } from './canvas-loop';

const NODES = 230;
const LINKS = 3; // nearest neighbours per star
const MAX_LINK = 0.42; // max link length, in sphere radii
const SIGNALS = 7;

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
  nodes.forEach((n, i) => {
    const near = nodes
      .map((m, j) => ({ j, d: Math.hypot(n.x - m.x, n.y - m.y, n.z - m.z) }))
      .filter((o) => o.j !== i && o.d < MAX_LINK)
      .sort((a, b) => a.d - b.d)
      .slice(0, LINKS);
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
  const sky = Array.from({ length: 170 }, () => ({ x: r(), y: r(), s: 0.4 + r() * 0.8, tw: r() * 6.3 }));
  const signals: Signal[] = Array.from({ length: SIGNALS }, () => {
    const from = Math.floor(r() * NODES);
    return { from, to: next[from][0] ?? from, k: r(), speed: 0.5 + r() * 0.6 };
  });
  const px = new Float32Array(NODES);
  const py = new Float32Array(NODES);
  const pz = new Float32Array(NODES);
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
      // Far stars.
      for (const s of sky) {
        const a = 0.12 + 0.12 * Math.sin(t * 0.8 + s.tw);
        g.fillStyle = `rgba(${mr},${mg},${mb},${a})`;
        g.fillRect(s.x * W, s.y * H, s.s, s.s);
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
      const hx = cx + p.x * R * 1.1;
      const hy = cy + p.y * R * 1.1;
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

      // Constellation lines, fainter at the back.
      g.lineWidth = 0.7;
      for (const [a, b] of edges) {
        const z = (pz[a] + pz[b]) / 2;
        let alpha = 0.05 + 0.3 * ((z + 1) / 2) ** 2;
        if (p.inside) {
          const d = Math.hypot((px[a] + px[b]) / 2 - hx, (py[a] + py[b]) / 2 - hy);
          alpha += Math.max(0, 1 - d / (R * 0.45)) * 0.35;
        }
        g.strokeStyle = `rgba(${cr},${cg},${cb},${alpha})`;
        g.beginPath();
        g.moveTo(px[a], py[a]);
        g.lineTo(px[b], py[b]);
        g.stroke();
      }

      // Stars.
      for (let i = 0; i < NODES; i++) {
        const n = nodes[i];
        const front = (pz[i] + 1) / 2;
        let alpha = 0.18 + 0.82 * front * (0.85 + 0.15 * Math.sin(t * 1.6 + n.tw));
        let size = n.size * (0.6 + front * 0.6);
        if (p.inside) {
          const near = Math.max(0, 1 - Math.hypot(px[i] - hx, py[i] - hy) / (R * 0.35));
          alpha = Math.min(1, alpha + near * 0.5);
          size += near * 1.2;
        }
        g.fillStyle = n.hot ? `rgba(${er},${eg},${eb},${alpha})` : `rgba(${cr},${cg},${cb},${alpha})`;
        g.beginPath();
        g.arc(px[i], py[i], size, 0, Math.PI * 2);
        g.fill();
      }

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
        const x = px[s.from] + (px[s.to] - px[s.from]) * s.k;
        const y = py[s.from] + (py[s.to] - py[s.from]) * s.k;
        const front = ((pz[s.from] + pz[s.to]) / 2 + 1) / 2;
        const glow = g.createRadialGradient(x, y, 0, x, y, 7);
        glow.addColorStop(0, `rgba(${er},${eg},${eb},${0.25 + 0.6 * front})`);
        glow.addColorStop(1, `rgba(${er},${eg},${eb},0)`);
        g.fillStyle = glow;
        g.fillRect(x - 7, y - 7, 14, 14);
      }
      g.restore();
    },
  };
}

export default function AstralField() {
  const canvas = useCanvasScene(astral);
  return <canvas ref={canvas} className="sky-canvas" />;
}
