// The Signal: one thin glowing line (cream core, faint red-orange glow, like an oscilloscope
// trace) that draws itself down the homepage as you scroll. It is one SVG path, built from
// where the sections really are, so it never crosses body text:
//   hero      comes down out of the boot screen and circles the AK logo
//   rail      runs down the left margin between sections
//   work      a circuit trace around the folders, tapping down to each one
//   journey   the timeline: a tick per chapter on the rail
//   playground a recorded-looking cursor path that ends in a cursor arrow
//   footer    it signs "Aryan", then a line types: > end of transmission.
// The pen sits a little above the middle of the screen, so what is drawn is what you have
// read. Desktop only; phones get a straight progress trace on the right edge. Lite and
// reduced motion get the whole line, drawn, and no motion.

import { onSector, still } from './bus';

const NS = 'http://www.w3.org/2000/svg';
const END_TEXT = '> end of transmission. thanks for scrolling.';

// "Aryan" in one stroke, in a 220 x 96 box (hand-drawn for this site).
const SIGNATURE =
  'c10,-20 25,-60 38,-66 c6,-3 8,16 10,36 c2,15 4,28 8,32 c-10,-20 -32,-26 -42,-22 c16,-6 36,-8 50,-6 c6,1 6,14 8,18 c2,-10 8,-18 18,-16 c-2,10 2,18 8,16 c6,-2 8,-12 10,-18 c0,12 0,22 -2,32 c-4,16 -16,18 -14,6 c2,-10 18,-18 30,-22 c4,-12 18,-16 20,-8 c2,6 -6,14 -14,12 c-6,-2 -2,-14 10,-16 c4,0 4,8 6,14 c2,4 6,2 10,-4 c2,-6 4,-12 6,-12 c2,6 0,12 0,18 c2,-10 8,-18 16,-18 c6,0 6,10 8,16 c2,4 8,4 16,-2 c10,-6 14,10 -4,16 c-36,10 -116,8 -176,4';

type Pt = [number, number];

const docRect = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height, r: r.right + scrollX, b: r.bottom + scrollY };
};

function buildPath(): { parts: string[]; sig: Pt } | null {
  const hero = document.getElementById('home');
  const writing = document.getElementById('writing');
  const foot = document.querySelector('.site-foot-strip .site-foot-inner');
  if (!hero || !writing || !foot) return null;
  const W = document.documentElement.clientWidth;
  const gutter = parseFloat(getComputedStyle(writing).paddingLeft) || 16;
  const X = Math.max(9, Math.round(gutter / 2));
  const H = docRect(hero);
  // The path is built in pieces (one per stretch of the page) so it can be measured piece by
  // piece: getPointAtLength walks from the start of a path, so one long path is slow to sample.
  const parts: string[] = [];
  let d = '';
  const cut = () => {
    if (d) parts.push(d);
    d = '';
  };

  // 1. Out of the boot screen and around the logo.
  const visual = hero.querySelector('[data-hero-visual]');
  const orb = hero.querySelector('.hero-orb');
  let ring = visual ? docRect(orb ?? visual) : null;
  if (!ring || ring.w > W * 0.7 || ring.w < 40) ring = { x: W * 0.62, y: H.y + H.h * 0.3, w: W * 0.26, h: H.h * 0.36, r: 0, b: 0 };
  const cx = ring.x + ring.w / 2;
  const cy = ring.y + ring.h / 2;
  const rx = Math.min(ring.w * 0.62, W * 0.24);
  const ry = Math.min(ring.h * 0.62, H.h * 0.3);
  const top = H.y + 8;
  d += `M${cx},${top} C${cx},${top + 40} ${cx + rx * 0.2},${cy - ry - 30} ${cx},${cy - ry}`;
  d += ` A${rx},${ry} 0 1 1 ${cx - 0.01},${cy - ry}`; // one full orbit
  d += ` A${rx},${ry} 0 0 1 ${cx - rx},${cy}`; // a quarter more, out on the left
  const exitY = H.b - 28;
  d += ` C${cx - rx},${exitY - 20} ${cx - rx - 20},${exitY} ${cx - rx - 60},${exitY}`;
  d += ` L${X + 40},${exitY} C${X + 10},${exitY} ${X},${exitY + 10} ${X},${exitY + 40}`;

  cut();
  // 2. Down the rail to the folders, then a circuit trace around them.
  const folders = [...document.querySelectorAll('#work .gf-body')].map((f) => docRect(f.closest('li') ?? f)).filter((f) => f.w > 0);
  if (folders.length) {
    const fTop = Math.min(...folders.map((f) => f.y)) - 30;
    const fBot = Math.max(...folders.map((f) => f.b)) + 30;
    const fRight = Math.max(...folders.map((f) => f.r)) + 26;
    d += ` L${X},${fTop - 14} Q${X},${fTop} ${X + 14},${fTop}`;
    for (const f of folders.sort((a, b) => a.x - b.x)) {
      const fx = Math.round(f.x + f.w / 2);
      d += ` L${fx},${fTop} V${f.y - 6} V${fTop}`; // a tap down to each folder and back
    }
    d += ` L${fRight - 14},${fTop} Q${fRight},${fTop} ${fRight},${fTop + 14} L${fRight},${fBot - 14} Q${fRight},${fBot} ${fRight - 14},${fBot}`;
    d += ` L${X + 14},${fBot} Q${X},${fBot} ${X},${fBot + 14}`;
  }

  cut();
  // 3. Journey: the rail is the timeline, with a tick for each chapter.
  const journey = document.getElementById('journey');
  const chapters = journey ? journey.querySelectorAll('[data-chapter]').length : 0;
  if (journey && chapters) {
    const J = docRect(journey);
    const span = Math.max(1, J.h - innerHeight);
    for (let i = 0; i < chapters; i++) {
      const y = Math.round(J.y + 120 + (span * i) / Math.max(1, chapters - 1));
      d += ` L${X},${y} h12 h-12`;
    }
  }

  cut();
  // 4. Playground: a cursor path across the gap above the .fig window, ending in an arrow.
  const fig = document.querySelector('#playground .fig');
  if (fig) {
    const F = docRect(fig);
    const y = F.y - 24;
    const tipX = F.x + F.w * 0.42;
    d += ` L${X},${y - 30} C${X},${y} ${X + 30},${y + 6} ${X + 80},${y - 4}`;
    d += ` C${X + 160},${y - 22} ${tipX - 160},${y + 14} ${tipX - 70},${y - 2} S${tipX - 20},${y - 10} ${tipX},${y - 12}`;
    // The arrow: tip, down the left edge, notch, tail, back up to the tip.
    d += ` l0,22 l5,-5 l4,9 l4,-2 l-4,-9 l7,0 L${tipX},${y - 12}`;
    d += ` C${tipX - 60},${y - 30} ${X + 40},${y + 20} ${X},${y + 40}`;
  }

  cut();
  // 5. Down past Writing, the contact block and the toys, to the footer; then the signature.
  const S = docRect(foot);
  const sigX = Math.max(X + 40, S.x + 8);
  const sigY = S.b + 18;
  d += ` L${X},${sigY + 30} C${X},${sigY + 70} ${sigX - 30},${sigY + 72} ${sigX},${sigY + 70}`;
  cut();
  d += ` ${SIGNATURE}`;
  cut();
  return { parts, sig: [sigX + 250, sigY + 78] };
}

export function initSignalLine(): () => void {
  const desktop = window.matchMedia('(min-width: 1024px) and (pointer: fine)');
  const layer = document.createElement('div');
  layer.className = 'signal-layer';
  layer.setAttribute('aria-hidden', 'true');
  const svg = document.createElementNS(NS, 'svg');
  svg.classList.add('signal-svg');
  const glow = document.createElementNS(NS, 'path');
  glow.classList.add('signal-glow');
  // A dark casing under the core keeps the line visible on cream grounds too.
  const casing = document.createElementNS(NS, 'path');
  casing.classList.add('signal-case');
  const core = document.createElementNS(NS, 'path');
  core.classList.add('signal-core');
  const pen = document.createElementNS(NS, 'circle');
  pen.classList.add('signal-pen');
  pen.setAttribute('r', '3');
  svg.append(glow, casing, core, pen);
  const end = document.createElement('p');
  end.className = 'signal-end';
  layer.append(svg, end);
  const trace = document.createElement('div');
  trace.className = 'signal-trace';
  trace.setAttribute('aria-hidden', 'true');
  trace.innerHTML = '<i></i>';
  document.body.append(layer, trace);

  let total = 0;
  let ys = new Float32Array(0);
  let pts: Pt[] = [];
  let L = 0;
  let target = 0;
  let raf = 0;
  let typed = false;
  const N = 1200;

  const build = () => {
    const isDesk = desktop.matches;
    layer.hidden = !isDesk;
    trace.hidden = isDesk;
    if (!isDesk) return;
    const built = buildPath();
    if (!built) return;
    const H = document.documentElement.scrollHeight;
    svg.setAttribute('width', String(document.documentElement.clientWidth));
    svg.setAttribute('height', String(H));
    layer.style.height = `${H}px`;
    const full = built.parts.join(' ');
    for (const p of [glow, casing, core]) p.setAttribute('d', full);
    // Measure each piece on a scratch path that starts where the previous piece ended.
    const scratch = document.createElementNS(NS, 'path');
    svg.append(scratch);
    const pieces: { len: number; d: string }[] = [];
    let start = '';
    for (const part of built.parts) {
      const d = start ? `M${start} ${part}` : part;
      scratch.setAttribute('d', d);
      const len = scratch.getTotalLength();
      const e = scratch.getPointAtLength(len);
      start = `${e.x},${e.y}`;
      pieces.push({ len, d });
    }
    total = pieces.reduce((a, p) => a + p.len, 0);
    ys = new Float32Array(N + 1);
    pts = [];
    let maxY = -Infinity;
    let base = 0;
    let k = 0;
    for (const piece of pieces) {
      scratch.setAttribute('d', piece.d);
      for (; k <= N; k++) {
        const at = (total * k) / N - base;
        if (at > piece.len + 0.01 && piece !== pieces[pieces.length - 1]) break;
        const p = scratch.getPointAtLength(Math.min(at, piece.len));
        maxY = Math.max(maxY, p.y);
        ys[k] = maxY;
        pts.push([p.x, p.y]);
      }
      base += piece.len;
    }
    scratch.remove();
    for (const p of [glow, casing, core]) p.style.strokeDasharray = `${total} ${total}`;
    end.style.left = `${built.sig[0]}px`;
    end.style.top = `${built.sig[1]}px`;
    if (still()) {
      L = total;
      draw();
      showEnd(true);
    } else {
      L = Math.min(L, total);
      update();
    }
  };

  const lengthFor = (y: number) => {
    let lo = 0;
    let hi = N;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (ys[mid] < y) lo = mid + 1;
      else hi = mid;
    }
    return (total * lo) / N;
  };

  const draw = () => {
    const off = String(total - L);
    glow.style.strokeDashoffset = off;
    casing.style.strokeDashoffset = off;
    core.style.strokeDashoffset = off;
    const p = pts[Math.min(N, Math.round((L / total) * N))];
    if (p) {
      pen.setAttribute('cx', String(p[0]));
      pen.setAttribute('cy', String(p[1]));
    }
    pen.style.opacity = L > 4 && L < total - 2 ? '1' : '0';
  };

  function showEnd(instant = false) {
    if (typed) return;
    typed = true;
    end.dataset.on = '';
    if (instant) {
      end.textContent = END_TEXT;
      return;
    }
    let i = 0;
    const id = window.setInterval(() => {
      end.textContent = END_TEXT.slice(0, ++i);
      if (i >= END_TEXT.length) window.clearInterval(id);
    }, 38);
  }

  const frame = () => {
    raf = 0;
    const diff = target - L;
    L += Math.abs(diff) < 0.6 ? diff : diff * 0.16;
    draw();
    if (L >= total - 2) showEnd();
    if (L !== target) raf = requestAnimationFrame(frame);
  };

  function update() {
    if (!desktop.matches) {
      const max = document.documentElement.scrollHeight - innerHeight;
      trace.style.setProperty('--p', String(max > 0 ? Math.min(1, scrollY / max) : 1));
      return;
    }
    if (!total || still()) return;
    const max = document.documentElement.scrollHeight - innerHeight;
    const prog = max > 0 ? scrollY / max : 1;
    const y = scrollY + innerHeight * (0.55 + 0.45 * prog ** 6);
    target = prog > 0.995 ? total : lengthFor(y);
    if (!raf) raf = requestAnimationFrame(frame);
  }

  // Rebuild when the page changes size (fonts, islands hydrating, the Journey scene sizing).
  let t = 0;
  const idle = window.requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 1));
  const later = () => {
    window.clearTimeout(t);
    t = window.setTimeout(() => idle(build, { timeout: 800 }), 300);
  };
  const ro = new ResizeObserver(later);
  ro.observe(document.body);
  window.addEventListener('scroll', update, { passive: true });
  desktop.addEventListener('change', build);
  const offSector = onSector(() => {
    if (still()) return;
    svg.classList.remove('flick');
    void svg.getBoundingClientRect();
    svg.classList.add('flick');
  });
  build();

  return () => {
    ro.disconnect();
    offSector();
    window.removeEventListener('scroll', update);
    desktop.removeEventListener('change', build);
    cancelAnimationFrame(raf);
    layer.remove();
    trace.remove();
  };
}
