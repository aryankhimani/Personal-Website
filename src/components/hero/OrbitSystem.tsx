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

type Star = { r: number; t: number; w: number; jx: number; jy: number; size: number; tone: number };

function galaxy(): Scene {
  const rand = rng(7);
  const tones = [cream['50'], cream['200'], navy['300'], ember['400']].map(rgb);
  let stars: Star[] = [];
  let sky: { x: number; y: number; s: number }[] = [];
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
      if (stars[a].r < 0.2 || stars[a].r > 0.75) continue;
      let best = -1;
      let bd = Infinity;
      for (let k = 0; k < 260; k++) {
        const b = Math.floor(Math.random() * stars.length);
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

  const seed = (count: number) => {
    stars = Array.from({ length: count }, () => {
      // More stars near the middle, a thin halo out to the rim.
      const r = 0.04 + rand() ** 1.25 * 0.96;
      const hot = r > 0.25 && r < 0.75 && rand() < 0.05;
      return {
        r,
        t: rand() * Math.PI * 2,
        w: 0.16 / Math.sqrt(r + 0.08), // inner stars orbit faster
        jx: (rand() - 0.5) * 0.035,
        jy: (rand() - 0.5) * 0.035,
        size: 0.5 + rand() ** 4 * 1.6,
        tone: hot ? 3 : r < 0.18 ? 0 : r < 0.55 ? 1 : 2,
      };
    });
    px = new Float32Array(count);
    py = new Float32Array(count);
    sky = Array.from({ length: 140 }, () => ({ x: rand(), y: rand(), s: 0.4 + rand() * 0.7 }));
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
      const count = w >= 768 ? 3600 : 1800;
      if (stars.length !== count) seed(count);
    },
    draw(g, t, dt, p) {
      const [sr, sg, sb] = tones[2];
      g.fillStyle = `rgba(${sr},${sg},${sb},0.18)`;
      for (const s of sky) g.fillRect(s.x * W, s.y * H, s.s, s.s);

      const spin = t * 0.025;
      const tilt = 1.08 + p.y * 0.18; // ~62° from face-on
      const roll = -0.32 + p.x * 0.12;
      const ct = Math.cos(tilt);
      const cr = Math.cos(roll);
      const sr2 = Math.sin(roll);
      const hx = cx + p.x * R * 0.9;
      const hy = cy + p.y * R * 0.6;

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.t += s.w * dt;
        const phi = s.r * TWIST + spin;
        const ex = Math.cos(s.t) * s.r + s.jx;
        const ey = Math.sin(s.t) * s.r * SQUASH + s.jy;
        // Turn the ellipse, tilt the disc, roll it on screen.
        const gx = ex * Math.cos(phi) - ey * Math.sin(phi);
        const gy = (ex * Math.sin(phi) + ey * Math.cos(phi)) * ct;
        let x = cx + (gx * cr - gy * sr2) * R;
        let y = cy + (gx * sr2 + gy * cr) * R;
        if (p.inside) {
          const dx = x - hx;
          const dy = y - hy;
          const d = Math.hypot(dx, dy);
          if (d < LENS && d > 0.001) {
            const push = (1 - d / LENS) ** 2 * 22;
            x += (dx / d) * push;
            y += (dy / d) * push;
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
      // One path per colour and brightness step keeps fillStyle changes to a dozen a frame.
      for (let tone = 0; tone < tones.length; tone++) {
        const [r, gg, b] = tones[tone];
        for (let level = 0; level < 3; level++) {
          g.beginPath();
          for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            if (s.tone !== tone) continue;
            const fade = 1 - s.r; // dimmer towards the rim
            const lv = fade > 0.66 ? 2 : fade > 0.33 ? 1 : 0;
            if (lv !== level) continue;
            const z = s.size;
            g.rect(px[i] - z / 2, py[i] - z / 2, z, z);
          }
          g.fillStyle = `rgba(${r},${gg},${b},${tone === 3 ? 0.9 : 0.42 + level * 0.26})`;
          g.fill();
        }
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
        W,
        H,
        px,
        py,
        stars.length,
        (i) => stars[i].size > 1.1 || stars[i].tone === 3,
        (i) => `STAR ${String(i).padStart(4, '0')} · R ${(stars[i].r * 15).toFixed(1)} KPC`,
      );
    },
  };
}

export default function OrbitSystem() {
  const canvas = useCanvasScene(galaxy);
  return <canvas ref={canvas} className="sky-canvas" />;
}
