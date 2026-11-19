// Footer scene: Aryan stands still in the middle while pixel people walk past on a few
// depth lanes, like a time-lapse of a busy street. Some carry tags of his work and fields.
// Canvas 2D on the shared loop (pauses off-screen); Lite and reduced motion get one still frame.
// TODO(aryan): if you'd rather stand there as yourself, a pixelated version of the cut-out
// photo (lib/me.ts) can replace the sprite in drawAryan().
import { useLite } from '../../lib/device-tier';
import { cream, ember, navy } from '../../lib/palette';
import { rgb, rng, useCanvasScene, type Scene } from '../hero/canvas-loop';

// 7x12 walker frames, facing right ('#' = filled). Mirrored for walking left.
const TOP_A = ['..###..', '..####.', '...#...', '.#####.', '#.###.#', '#.###.#', '..###..', '..###..'];
const TOP_B = ['..###..', '..####.', '...#...', '.#####.', '.#####.', '.#####.', '..###..', '..###..'];
const LEG_STRIDE = ['..#.#..', '.#...#.', '.#...#.', '#.....#'];
const LEG_HALF = ['..#.#..', '.#..#..', '.#...#.', '.#...#.'];
const LEG_PASS = ['..#.#..', '..#.#..', '..#.#..', '..#.#..'];
const FRAMES = [
  [...TOP_A, ...LEG_STRIDE],
  [...TOP_B, ...LEG_HALF],
  [...TOP_B, ...LEG_PASS],
  [...TOP_A, ...LEG_HALF],
].map((rows) => {
  const cells: [number, number][] = [];
  rows.forEach((r, y) => [...r].forEach((ch, x) => ch === '#' && cells.push([x, y])));
  return cells;
});

// Aryan, 9x16, standing: h hair, c skin, e ember top, n trousers, k shoes.
const ARYAN = [
  '..hhhh...',
  '.hhhhhh..',
  '.hcccch..',
  '..cccc...',
  '...cc....',
  '.eeeeee..',
  'eeeeeeee.',
  'e.eeeee.e',
  'e.eeeee.e',
  'c.eeeee.c',
  '..nnnnn..',
  '..nn.nn..',
  '..nn.nn..',
  '..nn.nn..',
  '..nn.nn..',
  '.kkk.kkk.',
];
const ARYAN_INK: Record<string, string> = { h: navy['950'], c: cream['200'], e: ember['500'], n: navy['700'], k: navy['950'] };

const TAGS = ['CRISPR', 'TruthLens', 'PyTorch', 'Ivey', 'JoeyHelps', 'Youreka', 'iGEM', 'React', 'gene editing', 'AI tools', 'ventures', 'TKS'];

type Walker = {
  x: number;
  dir: 1 | -1;
  lane: number; // 0 far .. 1 near
  speed: number;
  phase: number;
  tag: string | null;
  ink: string;
};

const [cr, cg, cb] = rgb(cream['100']);
const [sr, sg, sb] = rgb(navy['300']);

function makeScene(): Scene {
  const rand = rng(2029);
  let W = 0;
  let H = 0;
  let ground = 0;
  let walkers: Walker[] = [];
  const phone = () => W < 640;

  const scaleOf = (lane: number) => (phone() ? 2 : 2) + Math.round(lane * (phone() ? 1 : 2));
  const spread = () => (phone() ? 44 : 72);
  const laneY = (lane: number) => ground - spread() + lane * spread();
  // People in front of Aryan fade as they pass him, so he never disappears in the crowd.
  const clearOf = (w: Walker) => {
    if (w.lane <= 0.5) return 1;
    const d = Math.abs(w.x - W / 2) / (phone() ? 34 : 52);
    return Math.min(1, 0.18 + d * d * 0.82);
  };

  const spawn = (x?: number): Walker => {
    const lane = Math.round(rand() * 4) / 4;
    const near = lane >= 0.5;
    const mix = 0.25 + lane * 0.6;
    return {
      x: x ?? 0,
      dir: rand() < 0.5 ? 1 : -1,
      lane,
      speed: (22 + rand() * 18) * (0.6 + lane * 0.8),
      phase: rand() * 4,
      tag: near && rand() < 0.3 ? TAGS[Math.floor(rand() * TAGS.length)] : null,
      // Far people fade into the navy, near ones are bright cream (atmospheric depth).
      ink: `rgb(${Math.round(sr + (cr - sr) * mix)} ${Math.round(sg + (cg - sg) * mix)} ${Math.round(sb + (cb - sb) * mix)} / ${0.35 + lane * 0.6})`,
    };
  };

  function drawWalker(g: CanvasRenderingContext2D, w: Walker, frame: number, x: number, alpha: number) {
    const s = scaleOf(w.lane);
    const baseY = Math.round(laneY(w.lane)) - 12 * s;
    const left = Math.round(x) - 3 * s;
    g.globalAlpha = alpha * clearOf(w);
    g.fillStyle = w.ink;
    for (const [cx, cy] of FRAMES[frame]) {
      const px = w.dir === 1 ? cx : 6 - cx;
      g.fillRect(left + px * s, baseY + cy * s, s, s);
    }
  }

  function drawTag(g: CanvasRenderingContext2D, w: Walker) {
    if (!w.tag || clearOf(w) < 1 || Math.abs(w.x - W / 2) < (phone() ? 70 : 110)) return;
    const s = scaleOf(w.lane);
    const top = Math.round(laneY(w.lane)) - 12 * s;
    const x = Math.round(w.x);
    g.globalAlpha = 1;
    g.font = '10px "Departure Mono", ui-monospace, monospace';
    const tw = Math.ceil(g.measureText(w.tag).width) + 10;
    const ty = top - 22;
    // A little placard on a stick.
    g.fillStyle = cream['100'];
    g.fillRect(x - 1 + w.dir * 2 * s, ty + 14, 2, 22 - 14 + 4 * s);
    g.fillStyle = w.lane === 1 ? ember['500'] : cream['100'];
    g.fillRect(x - tw / 2 + w.dir * 2 * s, ty, tw, 14);
    g.fillStyle = navy['950'];
    g.textBaseline = 'middle';
    g.fillText(w.tag, x - tw / 2 + 5 + w.dir * 2 * s, ty + 7.5);
  }

  function drawAryan(g: CanvasRenderingContext2D, t: number) {
    const s = phone() ? 4 : 6;
    const cx = Math.round(W / 2);
    const feet = Math.round(laneY(0.5));
    // Spotlight cone and floor pool.
    const cone = g.createLinearGradient(0, 0, 0, feet);
    cone.addColorStop(0, 'rgb(242 235 221 / 0)');
    cone.addColorStop(1, 'rgb(242 235 221 / 0.07)');
    g.globalAlpha = 1;
    g.fillStyle = cone;
    g.beginPath();
    g.moveTo(cx - 14, 0);
    g.lineTo(cx + 14, 0);
    g.lineTo(cx + 9 * s, feet);
    g.lineTo(cx - 9 * s, feet);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgb(255 74 43 / 0.16)';
    g.beginPath();
    g.ellipse(cx, feet, 10 * s, 2 * s, 0, 0, Math.PI * 2);
    g.fill();

    // Breathing: one pixel up and down, slowly.
    const bob = Math.sin(t * 1.6) > 0.6 ? -1 : 0;
    const left = cx - Math.round(4.5 * s);
    const top = feet - 16 * s;
    ARYAN.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch === '.') return;
        g.fillStyle = ARYAN_INK[ch];
        g.fillRect(left + x * s, top + y * s + (y < 10 ? bob : 0), s, s);
      }),
    );

    // HUD label: brackets and a name, the one thing that holds still.
    g.font = '11px "Departure Mono", ui-monospace, monospace';
    g.textBaseline = 'middle';
    g.textAlign = 'center';
    const ly = top - 18;
    g.fillStyle = cream['100'];
    g.fillText('aryan', cx, ly);
    g.strokeStyle = 'rgb(255 74 43 / 0.8)';
    g.lineWidth = 1;
    const bw = 30;
    g.beginPath();
    g.moveTo(cx - bw + 4, ly - 8.5);
    g.lineTo(cx - bw, ly - 8.5);
    g.lineTo(cx - bw, ly + 8.5);
    g.lineTo(cx - bw + 4, ly + 8.5);
    g.moveTo(cx + bw - 4, ly - 8.5);
    g.lineTo(cx + bw, ly - 8.5);
    g.lineTo(cx + bw, ly + 8.5);
    g.lineTo(cx + bw - 4, ly + 8.5);
    g.stroke();
    g.textAlign = 'left';
  }

  function drawFloor(g: CanvasRenderingContext2D) {
    g.globalAlpha = 1;
    for (let i = 0; i < 5; i++) {
      const y = Math.round(laneY(i / 4)) + 0.5;
      g.strokeStyle = `rgb(242 235 221 / ${0.03 + i * 0.015})`;
      g.setLineDash([2, 6 - i]);
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(W, y);
      g.stroke();
    }
    g.setLineDash([]);
  }

  return {
    resize(w, h) {
      const first = !W;
      W = w;
      H = h;
      ground = H - 14;
      const n = Math.max(8, Math.round(W / (phone() ? 42 : 52)));
      if (first || walkers.length !== n) {
        walkers = Array.from({ length: n }, () => spawn(rand() * W));
        walkers.sort((a, b) => a.lane - b.lane);
      }
    },
    draw(g, t, dt) {
      drawFloor(g);
      let aryanDrawn = false;
      for (const w of walkers) {
        if (!aryanDrawn && w.lane > 0.5) {
          drawAryan(g, t);
          aryanDrawn = true;
        }
        w.x += w.dir * w.speed * dt;
        w.phase += (w.speed / 14) * dt;
        if (w.x < -60 || w.x > W + 60) {
          Object.assign(w, spawn(), { lane: w.lane, ink: w.ink });
          w.x = w.dir === 1 ? -40 : W + 40;
        }
        const frame = Math.floor(w.phase) % 4;
        // Time-lapse smear: two fading ghosts behind each walker.
        for (let k = 2; k >= 1; k--) drawWalker(g, w, (frame + 4 - k) % 4, w.x - w.dir * k * 5 * scaleOf(w.lane), 0.12 / k);
        drawWalker(g, w, frame, w.x, 1);
      }
      if (!aryanDrawn) drawAryan(g, t);
      g.globalAlpha = 1;
      for (const w of walkers) drawTag(g, w);
    },
  };
}

function Crowd({ still }: { still: boolean }) {
  const ref = useCanvasScene(makeScene, { still });
  return <canvas ref={ref} className="foot-crowd-canvas" aria-hidden="true" />;
}

export default function FooterCrowd() {
  const lite = useLite();
  return <Crowd key={String(lite)} still={lite} />;
}
