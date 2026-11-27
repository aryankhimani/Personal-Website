// Footer scene, v2: a pixel street on the footer CRT. Aryan stands still in the middle under an
// HUD bracket while pixel people walk past on five depth lanes; a few carry tags of his work.
// Pixel art rules: one art-pixel size for every sprite (P CSS px), a whole-number pixel ratio,
// no smoothing, no soft gradients. Sprites move on device pixels (not art pixels), so motion stays
// smooth while every pixel edge stays sharp. Depth comes from tone and height on screen, not size.
// Canvas 2D on the shared loop (pauses off-screen); Lite and reduced motion get one still frame.
// TODO: a pixelated version of my photo could
// replace the ARYAN sprite below (same 10x19 grid).
import { useLite } from '../../lib/device-tier';
import { cream, ember, navy } from '../../lib/palette';
import { pixelDpr, rgb, rng, useCanvasScene, type Scene } from '../hero/canvas-loop';

// Walker frames, 8x16, facing right. h hair, s skin, e eye, t top, a far arm, p near leg,
// q far leg, f shoes. Cycle: stride, pass, stride (legs swapped), pass. Pass frames sit 1px higher.
const HEAD = ['..hhhh..', '.hhhhhh.', '.hhhses.', '.hhssss.', '..ssss..', '...ss...'];
const STRIDE_1 = [
  '..tttt..',
  '.attttt.',
  '.attttt.',
  'a.tttt.t',
  's.tttt.s',
  '..pppp..',
  '..qqpp..',
  '.qq..pp.',
  'qq....pp',
  'ff....ff',
];
const STRIDE_2 = [
  '..tttt..',
  '.ttttta.',
  '.ttttta.',
  't.tttt.a',
  's.tttt.s',
  '..pppp..',
  '..ppqq..',
  '.pp..qq.',
  'pp....qq',
  'ff....ff',
];
const PASS = [
  '..tttt..',
  '..tttt..',
  '..attt..',
  '..attt..',
  '..sttt..',
  '..pppp..',
  '...qpp..',
  '...qpp..',
  '...qpp..',
  '...ffff.',
];
type Cell = [x: number, y: number, ink: string];
const cells = (rows: string[]): Cell[] => {
  const out: Cell[] = [];
  rows.forEach((r, y) => [...r].forEach((ch, x) => ch !== '.' && out.push([x, y, ch])));
  return out;
};
const FRAMES = [STRIDE_1, PASS, STRIDE_2, PASS].map((body) => cells([...HEAD, ...body]));
const LIFT = [0, 1, 0, 1];

// Aryan, 10x19, facing out. o ember hoodie, O its shade, n trousers, k shoes.
const ARYAN = cells([
  '...hhhh...',
  '..hhhhhh..',
  '..hssssh..',
  '..sesses..',
  '..ssssss..',
  '...ssss...',
  '....ss....',
  '..oooooo..',
  '.OooooooO.',
  '.OooooooO.',
  '.OooooooO.',
  '.OoOOOOoO.',
  '.s.oooo.s.',
  '..nnnnnn..',
  '..nn..nn..',
  '..nn..nn..',
  '..nn..nn..',
  '..nn..nn..',
  '.kkk..kkk.',
]);
const ARYAN_INK: Record<string, string> = {
  h: navy['950'],
  s: cream['200'],
  e: navy['950'],
  o: ember['500'],
  O: ember['700'],
  n: navy['600'],
  k: navy['950'],
};

const TAGS = ['TruthLens', 'PyTorch', 'FastAPI', 'Western AI', 'React', 'Python', 'Ivey', 'Mount Sinai', 'AI tools', 'JoeyHelps', 'RoBERTa', 'WFN'];
const LANES = [0, 0.25, 0.5, 0.75, 1];

type Walker = {
  x: number;
  dir: 1 | -1;
  lane: number; // 0 far .. 1 near
  speed: number;
  phase: number;
  tag: string | null;
  ink: Record<string, string>;
};

// Tones run from the navy ground up to cream: far people sit low on the ramp, near ones high.
const lo = rgb(navy['700']);
const hi = rgb(cream['100']);
const tone = (k: number) => {
  const m = Math.max(0, Math.min(1, k));
  return `rgb(${lo.map((v, i) => Math.round(v + (hi[i] - v) * m)).join(' ')})`;
};

function makeScene(): Scene {
  const rand = rng(2029);
  let W = 0;
  let H = 0;
  let P = 3; // CSS px per art pixel, the same on every screen
  let dpr = 1;
  let walkers: Walker[] = [];
  let skyline: HTMLCanvasElement | null = null;
  let beacon = { x: 0, y: 0 };
  const phone = () => W < 640;
  /** Snap to whole device pixels. */
  const snap = (v: number) => Math.round(v * dpr) / dpr;
  const laneY = (lane: number) => H - 6 * P - Math.round((1 - lane) * (phone() ? 12 : 14)) * P;

  const inks = (lane: number): Record<string, string> => {
    const base = 0.12 + lane * 0.5;
    const hot = lane >= 0.75 && rand() < 0.12;
    const top = base + 0.08 + rand() * 0.22;
    return {
      h: tone(base - 0.1),
      s: tone(base + 0.32),
      e: tone(base - 0.12),
      t: hot ? ember['600'] : tone(top),
      a: hot ? ember['800'] : tone(top - 0.14),
      p: tone(base - 0.02),
      q: tone(base - 0.1),
      f: tone(base - 0.16),
    };
  };

  const spawn = (lane: number, x: number): Walker => ({
    x,
    dir: rand() < 0.5 ? 1 : -1,
    lane,
    speed: (16 + rand() * 14) * (0.7 + lane * 0.7),
    phase: rand() * 4,
    tag: lane >= 0.75 && rand() < 0.3 ? TAGS[Math.floor(rand() * TAGS.length)] : null,
    ink: inks(lane),
  });

  /** People in front of Aryan step down in opacity as they pass him, in hard steps. */
  const clearOf = (w: Walker) => {
    if (w.lane <= 0.5) return 1;
    const d = Math.abs(w.x - W / 2) / (9 * P);
    return d >= 1 ? 1 : Math.max(0.25, Math.ceil(d * 4) / 4);
  };

  // The city behind the street, drawn once per resize: flat navy blocks with a few lit windows.
  function buildSkyline() {
    const c = document.createElement('canvas');
    c.width = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
    const g = c.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const r = rng(77);
    const base = laneY(0) - 2 * P;
    let x = -r() * 8 * P;
    let tallest = 0;
    while (x < W) {
      const bw = (6 + Math.floor(r() * 10)) * P;
      const bh = (8 + Math.floor(r() * 22)) * P;
      g.fillStyle = r() < 0.5 ? navy['900'] : navy['800'];
      g.fillRect(x, base - bh, bw, bh);
      g.fillStyle = 'rgb(242 235 221 / 0.22)';
      for (let wy = base - bh + 2 * P; wy < base - 2 * P; wy += 3 * P)
        for (let wx = x + 2 * P; wx < x + bw - 2 * P; wx += 3 * P) if (r() < 0.22) g.fillRect(wx, wy, P, P);
      if (bh > tallest && x > W * 0.1 && x < W * 0.9) {
        tallest = bh;
        beacon = { x: x + Math.floor(bw / P / 2) * P, y: base - bh - 2 * P };
      }
      x += bw + Math.floor(r() * 3) * P;
    }
    // Pavement: a solid band with a dashed kerb line on the art grid.
    g.fillStyle = navy['900'];
    g.fillRect(0, base, W, H - base);
    g.fillStyle = 'rgb(242 235 221 / 0.12)';
    for (let k = 0; k < W; k += 6 * P) g.fillRect(k, base, 3 * P, P);
    g.fillStyle = 'rgb(242 235 221 / 0.06)';
    for (const lane of [0.5, 1]) for (let k = 2 * P; k < W; k += 8 * P) g.fillRect(k, laneY(lane) + P, 2 * P, P);
    skyline = c;
  }

  function drawWalker(g: CanvasRenderingContext2D, w: Walker) {
    const f = Math.floor(w.phase) % 4;
    const left = snap(w.x - 4 * P);
    const top = Math.round(laneY(w.lane)) - (16 + LIFT[f]) * P;
    g.globalAlpha = clearOf(w);
    for (const [cx, cy, ch] of FRAMES[f]) {
      g.fillStyle = w.ink[ch];
      g.fillRect(left + (w.dir === 1 ? cx : 7 - cx) * P, top + cy * P, P, P);
    }
  }

  function drawTag(g: CanvasRenderingContext2D, w: Walker) {
    if (!w.tag || clearOf(w) < 1 || Math.abs(w.x - W / 2) < 22 * P) return;
    const f = Math.floor(w.phase) % 4;
    const top = Math.round(laneY(w.lane)) - (16 + LIFT[f]) * P;
    g.globalAlpha = 1;
    g.font = '10px "Departure Mono", ui-monospace, monospace';
    const tw = Math.ceil(g.measureText(w.tag).width / P + 3) * P;
    const hand = snap(w.x + w.dir * 3 * P);
    const ty = top - 7 * P;
    g.fillStyle = cream['200'];
    g.fillRect(hand, ty + 5 * P, P, 6 * P); // stick
    g.fillStyle = w.lane === 1 ? ember['500'] : cream['100'];
    g.fillRect(snap(hand - tw / 2), ty, tw, 5 * P);
    g.fillStyle = navy['950'];
    g.textBaseline = 'middle';
    g.textAlign = 'center';
    g.fillText(w.tag, snap(hand), ty + 2.5 * P + 0.5);
    g.textAlign = 'left';
  }

  function drawAryan(g: CanvasRenderingContext2D, t: number) {
    g.globalAlpha = 1;
    const feet = Math.round(laneY(0.5)) + P;
    const left = snap(W / 2) - 5 * P;
    const top = feet - 19 * P;
    // Blink every few seconds: eyes take the skin colour for a moment.
    const blink = t % 4.2 > 4.05;
    // Floor mark: a pixel ember line under his feet.
    g.fillStyle = ember['700'];
    g.fillRect(left - P, feet, 12 * P, P);
    for (const [cx, cy, ch] of ARYAN) {
      g.fillStyle = blink && ch === 'e' ? ARYAN_INK.s : ARYAN_INK[ch];
      g.fillRect(left + cx * P, top + cy * P, P, P);
    }

    // HUD bracket: ember corners on the art grid, and his name above.
    const bx = left - 3 * P;
    const by = top - 3 * P;
    const bw = 16 * P;
    const bh = 23 * P;
    const arm = 3 * P;
    g.fillStyle = ember['500'];
    for (const [x, y, sx, sy] of [
      [bx, by, 1, 1],
      [bx + bw - P, by, -1, 1],
      [bx, by + bh - P, 1, -1],
      [bx + bw - P, by + bh - P, -1, -1],
    ]) {
      g.fillRect(sx > 0 ? x : x - arm + P, y, arm, P);
      g.fillRect(x, sy > 0 ? y : y - arm + P, P, arm);
    }
    g.font = '11px "Departure Mono", ui-monospace, monospace';
    g.textBaseline = 'bottom';
    g.textAlign = 'center';
    g.fillStyle = cream['100'];
    g.fillText('aryan', snap(W / 2), by - P);
    g.textAlign = 'left';
  }

  return {
    resize(w, h) {
      W = w;
      H = h;
      dpr = pixelDpr();
      P = 3;
      const perLane = Math.max(2, Math.round(W / (phone() ? 150 : 210)));
      walkers = LANES.flatMap((lane) => Array.from({ length: perLane }, () => spawn(lane, rand() * W)));
      buildSkyline();
    },
    draw(g, t, dt) {
      g.globalAlpha = 1;
      if (skyline) g.drawImage(skyline, 0, 0, W, H);
      // The beacon on the tallest roof blinks ember, in two hard steps.
      if (Math.floor(t * 1.2) % 2 === 0) {
        g.fillStyle = ember['500'];
        g.fillRect(beacon.x, beacon.y, P, P);
      }
      let aryanDrawn = false;
      for (const w of walkers) {
        w.x += w.dir * w.speed * dt;
        w.phase += (w.speed / (5.5 * P)) * dt;
        if (w.x < -8 * P || w.x > W + 8 * P) {
          Object.assign(w, spawn(w.lane, 0));
          w.x = w.dir === 1 ? -6 * P : W + 6 * P;
        }
        if (!aryanDrawn && w.lane > 0.5) {
          drawAryan(g, t);
          aryanDrawn = true;
        }
        drawWalker(g, w);
      }
      if (!aryanDrawn) drawAryan(g, t);
      for (const w of walkers) drawTag(g, w);
      g.globalAlpha = 1;
    },
  };
}

function Crowd({ still }: { still: boolean }) {
  const ref = useCanvasScene(makeScene, { still, pixel: true });
  return <canvas ref={ref} className="foot-crowd-canvas" aria-hidden="true" />;
}

export default function FooterCrowd() {
  const lite = useLite();
  return <Crowd key={String(lite)} still={lite} />;
}
