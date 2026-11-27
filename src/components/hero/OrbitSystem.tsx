// Hero 5, "Orbits": a tilted two-armed spiral galaxy. Each star runs its own ellipse; the
// ellipses turn a little more the further out they sit, and where they crowd together the
// two arms appear (the density-wave trick, so the arms never wind themselves up). A bright
// cream core, a few red-orange stars in the arms. The pointer tilts the disc and bends the
// stars near it, like a small lens.
//
// Written from scratch; the look is inspired by React Bits Pro's Binary Orbits, which we only
// looked at. Plain canvas 2D, drawn in batches by colour, so it costs no WebGL context.

import { cream, ember, navy } from '../../lib/palette';
import { rgb, rng, useCanvasScene, type Scene } from './canvas-loop';
import { arcs, frame, reticle } from './hud';

const TWIST = 3.4; // how far the ellipses turn from core to rim, in radians
const SQUASH = 0.58; // ellipse minor/major ratio: lower = stronger arms
const LENS = 90; // pointer lens radius, px
const LEVELS = 3; // brightness steps (by distance from the core)
const DUST = 5; // tone index of the soft arm dust

type Star = { r: number; t: number; w: number; jx: number; jy: number; size: number; tone: number; tc: number; ts: number };

function galaxy(): Scene {
  const rand = rng(7);
  // cream core, cream arms, navy rim, ember hot stars, cream highlights, dust.
  const tones = [cream['50'], cream['200'], navy['300'], ember['400'], cream['50'], navy['300']].map(rgb);
  const alpha = (tone: number, level: number) =>
    tone === 3 ? 0.9 : tone === 4 ? 0.95 : tone === DUST ? 0.05 + level * 0.025 : 0.42 + level * 0.26;
  let stars: Star[] = [];
  // Stars are sorted by colour bucket; bucket b runs from start[b] to start[b + 1].
  let start: number[] = [];
  const LAYERS = [
    { n: 260, s: [0.4, 0.7], a: 0.14, shift: 5 },
    { n: 130, s: [0.6, 1.1], a: 0.22, shift: 12 },
  ];
  let sky: { x: number; y: number; s: number; tw: number }[][] = [];
  let W = 0;
  let H = 0;
  let cx = 0;
  let cy = 0;
  let R = 0;
  let px = new Float32Array(0);
  let py = new Float32Array(0);

  // Arcs leap between two neighbouring stars in the arms.
  const sparks = arcs(3, () => {
    if (!stars.length) return null;
    for (let tries = 0; tries < 6; tries++) {
      const a = Math.floor(Math.random() * stars.length);
      if (stars[a].tone === DUST || stars[a].r < 0.2 || stars[a].r > 0.75) continue;
      let best = -1;
      let bd = Infinity;
      for (let k = 0; k < 260; k++) {
        const b = Math.floor(Math.random() * stars.length);
        if (stars[b].tone === DUST) continue;
        const d = Math.hypot(px[b] - px[a], py[b] - py[a]);
        if (d > 14 && d < 52 && d < bd) {
          bd = d;
          best = b;
        }
      }
      if (best >= 0) return [a, best];
    }
    return null;
  });

  const levelOf = (r: number) => Math.min(LEVELS - 1, Math.floor((1 - r) * LEVELS));
  const seed = (count: number, dust: number) => {
    const make = (isDust: boolean): Star => {
      // More stars near the middle, a thin halo out to the rim. Dust stays in the arms.
      const r = isDust ? 0.14 + rand() * 0.7 : 0.04 + rand() ** 1.25 * 0.96;
      const hot = !isDust && r > 0.25 && r < 0.75 && rand() < 0.05;
      const bright = !isDust && !hot && rand() < 0.012;
      const phi = r * TWIST;
      return {
        r,
        t: rand() * Math.PI * 2,
        w: 0.16 / Math.sqrt(r + 0.08), // inner stars orbit faster
        jx: (rand() - 0.5) * (isDust ? 0.05 : 0.035),
        jy: (rand() - 0.5) * (isDust ? 0.05 : 0.035),
        size: isDust ? 2.2 + rand() * 2.6 : bright ? 1.8 + rand() * 0.8 : 0.5 + rand() ** 4 * 1.6,
        tone: isDust ? DUST : hot ? 3 : bright ? 4 : r < 0.18 ? 0 : r < 0.55 ? 1 : 2,
        tc: Math.cos(phi),
        ts: Math.sin(phi),
      };
    };
    stars = [...Array.from({ length: count }, () => make(false)), ...Array.from({ length: dust }, () => make(true))];
    // Dust first so the stars draw over it.
    const key = (s: Star) => (s.tone === DUST ? -1 : s.tone) * LEVELS + levelOf(s.r);
    stars.sort((x, y) => key(x) - key(y));
    start = [];
    let prev = -Infinity;
    stars.forEach((s, i) => {
      const k = key(s);
      if (k !== prev) start.push(i);
      prev = k;
    });
    start.push(stars.length);
    px = new Float32Array(stars.length);
    py = new Float32Array(stars.length);
    sky = LAYERS.map((L) => Array.from({ length: L.n }, () => ({ x: rand(), y: rand(), s: L.s[0] + rand() * (L.s[1] - L.s[0]), tw: rand() * 6.3 })));
  };

  return {
    resize(w, h) {
      W = w;
      H = h;
      if (w >= 768) {
        cx = w * 0.68;
        cy = h * 0.47;
        R = Math.min(w * 0.29, h * 0.55);
      } else {
        cx = w * 0.5;
        cy = h * 0.27;
        R = Math.min(w * 0.55, h * 0.3);
      }
      const count = w >= 768 ? 5600 : 2600;
      const dust = w >= 768 ? 900 : 400;
      if (stars.length !== count + dust) seed(count, dust);
    },
    draw(g, t, dt, p) {
      // Far sky, two parallax layers that twinkle in two steps.
      const [sr, sg, sb] = tones[2];
      for (let l = 0; l < LAYERS.length; l++) {
        const L = LAYERS[l];
        const ox = -p.x * L.shift;
        const oy = -p.y * L.shift * 0.6;
        for (let lv = 0; lv < 2; lv++) {
          g.beginPath();
          for (const st of sky[l]) {
            if ((Math.sin(t * 0.9 + st.tw) > 0 ? 1 : 0) !== lv) continue;
            g.rect(st.x * W + ox, st.y * H + oy, st.s, st.s);
          }
          g.fillStyle = `rgba(${sr},${sg},${sb},${(L.a * (0.6 + lv * 0.6)).toFixed(3)})`;
          g.fill();
        }
      }

      const spin = t * 0.025;
      const cs = Math.cos(spin);
      const ss = Math.sin(spin);
      const tilt = 1.08 + p.y * 0.18; // ~62° from face-on
      const roll = -0.32 + p.x * 0.12;
      const ct = Math.cos(tilt);
      const cr = Math.cos(roll);
      const sr2 = Math.sin(roll);
      // The lens sits exactly on the pointer; only its strength (p.on) eases.
      const hx = p.mx;
      const hy = p.my;
      const lens = p.on > 0.01 ? 22 * p.on : 0;

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.t += s.w * dt;
        // Each ellipse is turned by r * TWIST (stored) plus the slow spin (shared).
        const pc = s.tc * cs - s.ts * ss;
        const ps = s.ts * cs + s.tc * ss;
        const ex = Math.cos(s.t) * s.r + s.jx;
        const ey = Math.sin(s.t) * s.r * SQUASH + s.jy;
        // Turn the ellipse, tilt the disc, roll it on screen.
        const gx = ex * pc - ey * ps;
        const gy = (ex * ps + ey * pc) * ct;
        let x = cx + (gx * cr - gy * sr2) * R;
        let y = cy + (gx * sr2 + gy * cr) * R;
        if (lens) {
          const dx = x - hx;
          const dy = y - hy;
          if (dx > -LENS && dx < LENS && dy > -LENS && dy < LENS) {
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < LENS && d > 0.001) {
              const push = (1 - d / LENS) ** 2 * lens;
              x += (dx / d) * push;
              y += (dy / d) * push;
            }
          }
        }
        px[i] = x;
        py[i] = y;
      }

      // The core glow first, then the stars on top, added like light.
      const [c0r, c0g, c0b] = tones[0];
      const core = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.32);
      core.addColorStop(0, `rgba(${c0r},${c0g},${c0b},0.55)`);
      core.addColorStop(0.25, `rgba(${c0r},${c0g},${c0b},0.16)`);
      core.addColorStop(1, `rgba(${c0r},${c0g},${c0b},0)`);
      g.fillStyle = core;
      g.fillRect(cx - R * 0.4, cy - R * 0.4, R * 0.8, R * 0.8);

      g.save();
      g.globalCompositeOperation = 'lighter';
      // One path per colour bucket keeps fillStyle changes to ~15 a frame.
      for (let b = 0; b < start.length - 1; b++) {
        const s0 = stars[start[b]];
        const [r, gg, bl] = tones[s0.tone];
        g.beginPath();
        for (let i = start[b]; i < start[b + 1]; i++) {
          const z = stars[i].size;
          g.rect(px[i] - z / 2, py[i] - z / 2, z, z);
        }
        g.fillStyle = `rgba(${r},${gg},${bl},${alpha(s0.tone, levelOf(s0.r))})`;
        g.fill();
      }
      // A tiny hot centre.
      const [er, eg, eb] = rgb(ember['200']);
      const heart = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.05);
      heart.addColorStop(0, `rgba(${er},${eg},${eb},0.9)`);
      heart.addColorStop(1, `rgba(${er},${eg},${eb},0)`);
      g.fillStyle = heart;
      g.fillRect(cx - R * 0.06, cy - R * 0.06, R * 0.12, R * 0.12);
      g.restore();

      // The interface on top: arcs in the arms, a ring flattened to the disc, the reticle.
      sparks.draw(g, dt, px, py);
      frame(g, cx, cy, R * 0.82, t, Math.max(0.42, ct + 0.05));
      reticle(
        g,
        p,
        dt,
        px,
        py,
        stars.length,
        (i) => stars[i].tone === 3 || stars[i].tone === 4 || (stars[i].tone !== DUST && stars[i].size > 1.1),
        (i) => `STAR ${String(i).padStart(4, '0')} · R ${(stars[i].r * 15).toFixed(1)} KPC`,
      );
    },
  };
}

export default function OrbitSystem() {
  const canvas = useCanvasScene(galaxy);
  return <canvas ref={canvas} className="sky-canvas" />;
}
