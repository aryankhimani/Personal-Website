// The boot sequence, v3: a CRT terminal boots under an HUD, then the name assembles from
// cream grid cells and breaks apart into the hero on the first scroll. Base.astro's inline
// script decides whether it shows and removes it after 5s (0.5s in Lite) no matter what;
// this runs the timeline:
//
//   0.0s  CRT power-on: a white line opens into the screen (CSS)
//   0.3s  HUD rings, ticks and readouts draw in around the AK logo (CSS)
//   0.45s POST log types fast, progress bar starts
//   1.15s "ARYAN KHIMANI" assembles from grid cells, staggered out from the centre
//   2.35s a scan line sweeps the name
//   3.25s the breakdown: cells scatter column by column and the hero shows through.
//         Scrolling (wheel or touch) drives it earlier; it plays by itself if you don't.
//   ~4.3s done
//
// Any key or a tap/click skips. In Lite / reduced motion it's a single 0.5s fade (CSS only).
//
// The breakdown is our own canvas version of the idea on animejs.com's opening (pieces that
// come apart, staggered, tied to scroll). No animation library: ~700 squares on one canvas.

import { cream, ember } from './palette';
import { lockScroll, unlockScroll } from './scroll';

const AT = { post: 450, cells: 1150, sweep: 2350, auto: 3250, autoFor: 1000, end: 4700 };
const ASSEMBLE = 700; // ms per cell
const SPREAD = 650; // ms between the centre cell and the farthest one
const WHEEL_SPAN = 650;
const BREAK_MIN = 750; // ms // px of wheel travel for the whole breakdown

function lines(projects: string): [string, string][] {
  // [text, status]. A status is printed after a dot leader once the line has typed.
  return [
    ['ARYAN-OS v3.0  (c) 2026 Aryan Khimani', ''],
    ['', ''],
    ['CPU: curiosity @ 100%', 'OK'],
    [`MEM: ${projects} projects`, 'OK'],
    ['GPU: one canvas at a time', 'OK'],
    ['/research', 'mounted'],
    ['/ventures', 'mounted'],
    ['/code', 'mounted'],
    ['/programs', 'mounted'],
    ['/talks', 'mounted'],
    ['', ''],
    ['starting desktop', '...'],
  ];
}

const WIDTH = 34; // dot leader column

// 5x7 bitmap glyphs for the letters in the name, one string per row.
const ROWS: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
};
const GLYPHS: Record<string, string> = { ' ': '.'.repeat(35) };
for (const k in ROWS) GLYPHS[k] = ROWS[k].join('');

type Cell = {
  tx: number; // target (assembled) position, CSS px
  ty: number;
  sx: number; // start offset from the target
  sy: number;
  sr: number; // start rotation
  delay: number; // assemble delay, ms after AT.cells
  bx: number; // breakdown direction * distance
  by: number;
  br: number;
  bAt: number; // where in the breakdown (0..1) this cell starts leaving
  hot: boolean;
};

const easeOutExpo = (x: number) => (x >= 1 ? 1 : 1 - 2 ** (-10 * x));
const easeInCubic = (x: number) => x * x * x;
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

function layout(W: number, H: number): { cells: Cell[]; pitch: number } {
  const wide = W >= 768;
  const words = wide ? ['ARYAN KHIMANI'] : ['ARYAN', 'KHIMANI'];
  const sub = wide ? 2 : 1; // each glyph pixel is split into sub x sub cells
  const longest = Math.max(...words.map((w) => w.length));
  const cols = (longest * 6 - 1) * sub;
  const rows = (words.length * 8 - 1) * sub;
  const pitch = Math.max(3, Math.floor(Math.min((W * (wide ? 0.8 : 0.86)) / cols, (H * 0.3) / rows)));
  const x0 = (W - cols * pitch) / 2;
  const y0 = (H - rows * pitch) / 2;
  const cx = W / 2;
  const cy = H / 2;
  const far = Math.hypot(cols * pitch, rows * pitch) / 2;
  const reach = Math.max(W, H);
  const cells: Cell[] = [];

  words.forEach((word, line) => {
    const off = ((longest - word.length) * 6 * sub * pitch) / 2; // centre the shorter line
    [...word].forEach((ch, ci) => {
      const g = GLYPHS[ch] ?? GLYPHS[' '];
      for (let gy = 0; gy < 7; gy++) {
        for (let gx = 0; gx < 5; gx++) {
          if (g[gy * 5 + gx] !== '#') continue;
          for (let a = 0; a < sub; a++) {
            for (let b = 0; b < sub; b++) {
              const tx = x0 + off + ((ci * 6 + gx) * sub + a + 0.5) * pitch;
              const ty = y0 + ((line * 8 + gy) * sub + b + 0.5) * pitch;
              const dx = tx - cx;
              const dy = ty - cy;
              const d = Math.hypot(dx, dy);
              // Assemble: fly in from a ring outside the name, later the farther out.
              const ang = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.6;
              const dist = reach * (0.35 + Math.random() * 0.45);
              // Breakdown: outward and a little up, the way a shell of parts comes apart.
              const bang = Math.atan2(dy - pitch * 6, dx) + (Math.random() - 0.5) * 0.9;
              const bdist = reach * (0.25 + Math.random() * 0.55);
              cells.push({
                tx,
                ty,
                sx: Math.cos(ang) * dist,
                sy: Math.sin(ang) * dist,
                sr: (Math.random() - 0.5) * Math.PI * 2,
                delay: (d / far) * SPREAD + Math.random() * 90,
                bx: Math.cos(bang) * bdist,
                by: Math.sin(bang) * bdist,
                br: (Math.random() - 0.5) * Math.PI * 3,
                // Column by column from the left, with some noise: a grid coming apart.
                bAt: ((tx - x0) / (cols * pitch)) * 0.45 + Math.random() * 0.12,
                hot: Math.random() < 0.05,
              });
            }
          }
        }
      }
    });
  });
  return { cells, pitch };
}

export function runBoot(): void {
  const root = document.documentElement;
  const boot = document.getElementById('boot');
  const mode = root.dataset.boot;
  if (!mode || !boot) return;

  let done = false;
  let locked = false;
  let raf = 0;
  const timers: number[] = [];
  const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));

  const end = () => {
    if (!root.dataset.boot) return;
    delete root.dataset.boot;
    delete root.dataset.bootPhase;
    window.dispatchEvent(new Event('aryan-os:boot-done'));
  };

  const finish = (skipped: boolean) => {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove', onTouchMove);
    boot.removeEventListener('pointerdown', onDown);
    boot.removeEventListener('pointerup', onUp);
    if (locked) unlockScroll();
    if (skipped) {
      boot.classList.add('boot-skip-out');
      window.setTimeout(end, 220);
    } else {
      end();
    }
  };

  // Scrolling drives the breakdown instead of the page.
  let pull = 0; // 0..1 from wheel / touch
  let touchY = 0;
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (e.deltaY > 0) pull = Math.min(1, pull + e.deltaY / WHEEL_SPAN);
  };
  const onTouchStart = (e: TouchEvent) => (touchY = e.touches[0]?.clientY ?? 0);
  const onTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    const y = e.touches[0]?.clientY ?? touchY;
    if (touchY > y) pull = Math.min(1, pull + (touchY - y) / (WHEEL_SPAN * 0.6));
    touchY = y;
  };
  // Any key skips; so does a click or a tap, but not a touch that turns into a swipe.
  let down: { x: number; y: number } | null = null;
  const onKey = () => finish(true);
  const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
  const onUp = (e: PointerEvent) => {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 10) finish(true);
    down = null;
  };
  window.addEventListener('keydown', onKey);
  boot.addEventListener('pointerdown', onDown);
  boot.addEventListener('pointerup', onUp);

  if (mode === 'lite') {
    at(500, () => finish(false));
    return;
  }

  lockScroll();
  locked = true;
  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: false });

  const log = document.getElementById('boot-log');
  const bar = document.getElementById('boot-bar');
  const pct = document.getElementById('boot-pct');
  const clock = document.getElementById('boot-clock');
  const canvas = document.getElementById('boot-cells') as HTMLCanvasElement | null;

  root.dataset.bootPhase = 'post';
  at(AT.cells, () => (root.dataset.bootPhase = 'cells'));
  at(AT.sweep, () => (root.dataset.bootPhase = 'ready'));
  at(AT.end, () => finish(false)); // safety: never longer than this

  // POST log: each line types in ~2 frames, then its status lands on a dot leader.
  if (log) {
    const rows = lines(log.dataset.projects ?? '');
    const shown: string[] = [];
    let t = AT.post;
    rows.forEach(([text, status], i) => {
      const step = text.length ? Math.max(3, Math.round(60 / text.length)) : 0;
      for (let c = 1; c <= text.length; c += 3) {
        const partial = text.slice(0, c);
        at(t + c * step, () => {
          shown[i] = partial;
          log.textContent = shown.join('\n');
        });
      }
      t += text.length * step + 15;
      const full = status ? `${text} ${'.'.repeat(Math.max(2, WIDTH - text.length))} ${status}` : text;
      at(t, () => {
        shown[i] = full;
        log.textContent = shown.join('\n');
      });
      t += status ? 55 : 25;
    });
  }

  // Canvas setup.
  const g = canvas?.getContext('2d') ?? null;
  let W = window.innerWidth;
  let H = window.innerHeight;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let cells: Cell[] = [];
  let pitch = 8;
  const size = () => {
    if (!canvas) return;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ({ cells, pitch } = layout(W, H));
  };
  size();

  const cr = cream['100'];
  const er = ember['500'];
  const t0 = performance.now();
  let shown = 0; // breakdown progress on screen
  let last = t0;

  const frame = (now: number) => {
    raf = 0;
    if (done) return;
    const t = now - t0;

    // Progress bar (quick, stall, quick, stall, finish) and the T+ readout.
    const x = clamp01((t - AT.post) / (AT.auto - AT.post));
    const v = x < 0.35 ? (x / 0.35) * 0.48 : x < 0.45 ? 0.48 + (x - 0.35) * 0.4 : x < 0.8 ? 0.52 + ((x - 0.45) / 0.35) * 0.4 : 0.92 + ((x - 0.8) / 0.2) * 0.08;
    if (bar) bar.style.transform = `scaleX(${Math.max(v, shown).toFixed(3)})`;
    if (pct) pct.textContent = `${Math.round(Math.max(v, shown) * 100)}%`;
    if (clock) clock.textContent = `T+${(t / 1000).toFixed(2)}`;

    // Breakdown: whichever is further along, the visitor's scroll or the clock.
    const auto = clamp01((t - AT.auto) / AT.autoFor);
    const want = Math.max(pull, auto);
    // Never faster than BREAK_MIN for the whole thing, so a hard flick still reads as a breakdown.
    shown = Math.min(want, shown + (now - last) / BREAK_MIN);
    last = now;
    boot.style.setProperty('--b', shown.toFixed(3));

    if (g && canvas) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, canvas.width, canvas.height);
      const s = pitch * 0.78;
      const sweepX = ((t - AT.sweep) / 700) * (W + 200) - 100;
      const sweeping = t > AT.sweep && t < AT.sweep + 700;
      for (const c of cells) {
        const a = easeOutExpo(clamp01((t - AT.cells - c.delay) / ASSEMBLE));
        if (a <= 0) continue;
        const k = easeInCubic(clamp01((shown - c.bAt) / 0.45));
        if (k >= 1) continue;
        const px = c.tx + c.sx * (1 - a) + c.bx * k;
        const py = c.ty + c.sy * (1 - a) + c.by * k;
        const rot = c.sr * (1 - a) + c.br * k;
        const near = sweeping ? Math.max(0, 1 - Math.abs(c.tx - sweepX) / 60) : 0;
        g.globalAlpha = Math.min(1, a * 1.4) * (1 - k);
        g.fillStyle = c.hot || near > 0.5 ? er : cr;
        const cos = Math.cos(rot) * dpr;
        const sin = Math.sin(rot) * dpr;
        const sc = 1 - k * 0.4;
        g.setTransform(cos * sc, sin * sc, -sin * sc, cos * sc, px * dpr, py * dpr);
        g.fillRect(-s / 2, -s / 2, s, s);
      }
      g.globalAlpha = 1;
    }

    if (shown >= 1) {
      finish(false);
      return;
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  window.addEventListener('resize', size, { once: true });
}
