// The Signal: a live energy conduit in the LEFT margin of the homepage. It never crosses
// text, cards or images: it is one fixed canvas the width of the page gutter.
//   - a comet head (cream core, red-orange glow) rides at your scroll position, with a lit
//     trail above it, energy pulses running down the lit part and small electric crackle
//     around the head
//   - ahead of it, a faint dotted unlit path, a node per section, and a HUD label under the
//     head, NEXT ↓ ~/journey, which flips like a split-flap when the sector changes
//   - on each sector arrival the conduit surges and one short spark arcs into that section's
//     title brackets (the lock-on in arrive.ts), then retracts. No blinking.
//   - at the very bottom it signs "Aryan" and types > end of transmission.
// It hides completely while any overlay is open (folder page, reader, windows, menus, ⌘K).
// Narrow gutters and phones get a thin progress conduit on the left edge with the head only.
// Lite and reduced motion: drawn still, no crackle, pulses or sparks. Pauses when hidden.

import { SECTORS, onSector, still } from './bus';
import { sectorTarget } from './channel';

const NS = 'http://www.w3.org/2000/svg';
const END_TEXT = '> end of transmission. thanks for scrolling.';
const OVERLAY = '[role="dialog"], [role="alertdialog"], [role="menu"], .palette-veil';
const TITLE = '.section-heading, .work-heading, .journey-heading, .me-heading, .foot-title';

// "Aryan" in one stroke, in a 220 x 96 box (hand-drawn for this site).
const SIGNATURE =
  'c10,-20 25,-60 38,-66 c6,-3 8,16 10,36 c2,15 4,28 8,32 c-10,-20 -32,-26 -42,-22 c16,-6 36,-8 50,-6 c6,1 6,14 8,18 c2,-10 8,-18 18,-16 c-2,10 2,18 8,16 c6,-2 8,-12 10,-18 c0,12 0,22 -2,32 c-4,16 -16,18 -14,6 c2,-10 18,-18 30,-22 c4,-12 18,-16 20,-8 c2,6 -6,14 -14,12 c-6,-2 -2,-14 10,-16 c4,0 4,8 6,14 c2,4 6,2 10,-4 c2,-6 4,-12 6,-12 c2,6 0,12 0,18 c2,-10 8,-18 16,-18 c6,0 6,10 8,16 c2,4 8,4 16,-2 c10,-6 14,10 -4,16 c-36,10 -116,8 -176,4';

const CREAM = '250,246,239';
const EMBER = '255,74,43';
const NAVY = '11,20,48';

type Pt = [number, number];

/** Layout position (ignores the transforms channel.ts sets). */
function pageTop(el: Element | null): number {
  if (!el) return 0;
  let y = 0;
  for (let e = el as HTMLElement | null; e; e = e.offsetParent as HTMLElement | null) y += e.offsetTop;
  return y;
}

/** A jagged bolt from a to b (midpoint displacement). */
function bolt(a: Pt, b: Pt, rough: number, depth = 4): Pt[] {
  let pts: Pt[] = [a, b];
  let r = rough;
  for (let d = 0; d < depth; d++) {
    const next: Pt[] = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.hypot(dx, dy) || 1;
      const off = (Math.random() - 0.5) * r;
      next.push([(x0 + x1) / 2 - (dy / len) * off, (y0 + y1) / 2 + (dx / len) * off], pts[i]);
    }
    pts = next;
    r *= 0.55;
  }
  return pts;
}

function strokePts(c: CanvasRenderingContext2D, pts: Pt[], n = pts.length) {
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < n; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.stroke();
}

export function initSignalLine(): () => void {
  const desktop = window.matchMedia('(min-width: 1024px) and (pointer: fine)');
  const root = document.createElement('div');
  root.className = 'conduit';
  root.setAttribute('aria-hidden', 'true');
  const cv = document.createElement('canvas');
  cv.className = 'conduit-cv';
  const label = document.createElement('p');
  label.className = 'sig-next';
  label.innerHTML = '<span class="sig-next-k">NEXT ↓</span><span class="sig-next-p"></span>';
  root.append(cv, label);
  const labelPath = label.querySelector<HTMLElement>('.sig-next-p')!;
  // Sparks reach out of the gutter, so they get their own full-screen canvas, shown only
  // for the half-second a spark lives.
  const spk = document.createElement('canvas');
  spk.className = 'conduit-spark';
  spk.setAttribute('aria-hidden', 'true');
  spk.hidden = true;

  // The signature, anchored to the page above the footer.
  const sig = document.createElementNS(NS, 'svg');
  sig.classList.add('signal-sig');
  sig.setAttribute('aria-hidden', 'true');
  const sigGlow = document.createElementNS(NS, 'path');
  sigGlow.classList.add('signal-glow');
  const sigCase = document.createElementNS(NS, 'path');
  sigCase.classList.add('signal-case');
  const sigCore = document.createElementNS(NS, 'path');
  sigCore.classList.add('signal-core');
  sig.append(sigGlow, sigCase, sigCore);
  const end = document.createElement('p');
  end.className = 'signal-end';
  end.setAttribute('aria-hidden', 'true');
  document.body.append(root, spk, sig, end);

  const ctx = cv.getContext('2d')!;
  const sctx = spk.getContext('2d')!;
  let dpr = 1;
  let W = 0; // canvas width (css px)
  let H = 0;
  let X = 0; // conduit x
  let top = 0; // menu bar height
  let wide = false; // full conduit (wide gutter) vs thin edge conduit
  let nodes: number[] = []; // sector start, page y
  let headDoc = -1; // eased head position, page y
  let surge = 0;
  let sector = 0;
  let off = false; // an overlay is open
  let raf = 0;
  let lastT = 0;
  let lastScroll = scrollY;
  let speed = 0;
  let arcs: Pt[][] = [];
  let arcAt = 0;
  let typed = false;
  let signed = false;
  let sigLen = 0;

  const measure = () => {
    dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const writing = document.getElementById('writing');
    const gutter = writing ? parseFloat(getComputedStyle(writing).paddingLeft) || 0 : 0;
    wide = desktop.matches && gutter >= 72;
    root.dataset.mode = wide ? 'wide' : 'thin';
    label.hidden = !wide || gutter < 110;
    top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--menubar-h')) * 16 || 32;
    X = wide ? Math.round(Math.min(44, gutter * 0.36)) : 4;
    W = wide ? Math.round(gutter) : 12;
    H = innerHeight;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    cv.style.width = `${W}px`;
    cv.style.height = `${H}px`;
    root.style.setProperty('--cx', `${X}px`);
    nodes = SECTORS.map((_, i) => pageTop(document.getElementById(sectorTarget(i))));
    buildSig();
    kick();
  };

  function buildSig() {
    const foot = document.querySelector('.site-foot-strip .site-foot-inner');
    sig.style.display = desktop.matches && foot ? '' : 'none';
    end.style.display = sig.style.display;
    if (!desktop.matches || !foot) return;
    const r = foot.getBoundingClientRect();
    const sx = Math.max(X + 40, r.left + 8);
    const sy = r.bottom + scrollY + 18;
    const d = `M${X},${sy + 30} C${X},${sy + 70} ${sx - 30},${sy + 72} ${sx},${sy + 70} ${SIGNATURE}`;
    const docH = document.documentElement.scrollHeight;
    sig.setAttribute('width', String(document.documentElement.clientWidth));
    sig.setAttribute('height', String(docH));
    for (const p of [sigGlow, sigCase, sigCore]) p.setAttribute('d', d);
    sigLen = sigCore.getTotalLength();
    for (const p of [sigGlow, sigCase, sigCore]) {
      p.style.strokeDasharray = `${sigLen} ${sigLen}`;
      p.style.strokeDashoffset = signed ? '0' : String(sigLen);
    }
    end.style.left = `${sx + 250}px`;
    end.style.top = `${sy + 78}px`;
    if (still()) sign(true);
  }

  function sign(instant = false) {
    if (signed) return;
    signed = true;
    sig.classList.toggle('draw', !instant);
    for (const p of [sigGlow, sigCase, sigCore]) p.style.strokeDashoffset = '0';
    if (instant) return showEnd(true);
    window.setTimeout(() => showEnd(), 1500);
  }

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

  const setNext = (i: number) => {
    const next = SECTORS[i + 1]?.path ?? '';
    if (!next) delete label.dataset.on;
    else label.dataset.on = '';
    if (labelPath.textContent === next) return;
    if (still()) {
      labelPath.textContent = next;
      return;
    }
    labelPath.innerHTML = '';
    [...next].forEach((ch, k) => {
      const b = document.createElement('b');
      b.textContent = ch;
      b.style.animationDelay = `${k * 22}ms`;
      labelPath.append(b);
    });
  };

  // ---------- drawing ----------

  const draw = (t: number) => {
    const c = ctx;
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const prog = Math.min(1, Math.max(0, scrollY / max));
    const s = still();
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);

    if (!wide) {
      // Thin progress conduit: track, lit part, head.
      const hy = top + (H - top) * prog;
      c.fillStyle = `rgba(${CREAM},0.12)`;
      c.fillRect(X - 1, top, 2, H - top);
      const g = c.createLinearGradient(0, top, 0, hy);
      g.addColorStop(0, `rgba(${EMBER},0.25)`);
      g.addColorStop(1, `rgba(${CREAM},0.85)`);
      c.fillStyle = g;
      c.fillRect(X - 1, top, 2, Math.max(0, hy - top));
      head(c, X, Math.max(top + 3, Math.min(H - 3, hy)), 0.6, t, s);
      return;
    }

    const target = scrollY + H * (0.3 + 0.5 * prog);
    if (headDoc < 0 || s) headDoc = target;
    else headDoc += (target - headDoc) * 0.2;
    const hy = headDoc - scrollY;
    label.style.transform = `translate3d(0, ${(hy + 16).toFixed(1)}px, 0)`;
    const startY = Math.max(top, nodes[0] - scrollY + 6);
    const amp = 1 + surge * 1.4 + Math.min(1, speed / 3) * 0.5;

    // Ahead: faint dotted path.
    c.lineCap = 'round';
    c.setLineDash([1.5, 6]);
    c.lineDashOffset = s ? 0 : -t * 0.012;
    c.strokeStyle = `rgba(${CREAM},0.28)`;
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(X, hy + 10);
    c.lineTo(X, H);
    c.stroke();
    c.setLineDash([]);

    // Lit trail: navy casing (for cream grounds), ember glow, cream core, brightest at the head.
    if (hy > startY) {
      const g = c.createLinearGradient(0, Math.max(startY, hy - H * 0.7), 0, hy);
      g.addColorStop(0, `rgba(${EMBER},0.05)`);
      g.addColorStop(1, `rgba(${EMBER},${Math.min(0.5, 0.2 * amp)})`);
      c.strokeStyle = g;
      c.lineWidth = 7 * Math.min(1.6, amp);
      c.beginPath();
      c.moveTo(X, startY);
      c.lineTo(X, hy);
      c.stroke();
      c.strokeStyle = `rgba(${NAVY},0.5)`;
      c.lineWidth = 3.4;
      c.stroke();
      const core = c.createLinearGradient(0, Math.max(startY, hy - H * 0.8), 0, hy);
      core.addColorStop(0, `rgba(${CREAM},0.35)`);
      core.addColorStop(1, `rgba(${CREAM},0.95)`);
      c.strokeStyle = core;
      c.lineWidth = 1.5;
      c.stroke();

      // Energy pulses running down the lit part, toward the head.
      if (!s) {
        const span = Math.min(hy - startY, H * 0.75);
        for (let i = 0; i < 3; i++) {
          const f = (t * 0.00032 * (1 + surge) + i / 3) % 1;
          const py = hy - span + f * span;
          const a = Math.sin(f * Math.PI) * (0.55 + surge * 0.45);
          const pg = c.createLinearGradient(0, py - 22, 0, py);
          pg.addColorStop(0, `rgba(${CREAM},0)`);
          pg.addColorStop(1, `rgba(${CREAM},${a.toFixed(3)})`);
          c.strokeStyle = pg;
          c.lineWidth = 2.6;
          c.beginPath();
          c.moveTo(X, py - 22);
          c.lineTo(X, py);
          c.stroke();
        }
      }
    }

    // Section nodes on the conduit.
    for (let i = 0; i < nodes.length; i++) {
      const y = nodes[i] - scrollY;
      if (y < top - 6 || y > H + 6) continue;
      const lit = nodes[i] <= headDoc;
      c.beginPath();
      c.arc(X, y, lit ? 3 : 2.6, 0, Math.PI * 2);
      if (lit) {
        c.fillStyle = `rgba(${EMBER},0.3)`;
        c.fill();
        c.beginPath();
        c.arc(X, y, 2, 0, Math.PI * 2);
        c.fillStyle = `rgb(${CREAM})`;
        c.fill();
      } else {
        c.fillStyle = `rgb(${NAVY})`;
        c.fill();
        c.strokeStyle = `rgba(${CREAM},0.4)`;
        c.lineWidth = 1;
        c.stroke();
      }
      c.fillStyle = `rgba(${CREAM},${lit ? 0.6 : 0.25})`;
      c.fillRect(X + 6, y - 0.5, 6, 1);
    }

    // Crackle around the head.
    if (!s) {
      if (t - arcAt > 70) {
        arcAt = t;
        const n = Math.random() < 0.35 + surge * 0.6 + Math.min(0.4, speed / 6) ? 1 + Math.floor(Math.random() * (2 + surge * 2)) : 0;
        arcs = [];
        for (let i = 0; i < n; i++) {
          const ang = Math.random() * Math.PI * 2;
          const len = 8 + Math.random() * (14 + surge * 16);
          const ex = Math.max(2, Math.min(W - 2, X + Math.cos(ang) * len));
          arcs.push(bolt([X, hy], [ex, hy + Math.sin(ang) * len], len * 0.6, 3));
        }
      }
      c.lineJoin = 'round';
      for (const a of arcs) {
        c.strokeStyle = `rgba(${EMBER},0.35)`;
        c.lineWidth = 3;
        strokePts(c, a);
        c.strokeStyle = `rgba(${CREAM},0.85)`;
        c.lineWidth = 1;
        strokePts(c, a);
      }
    }
    head(c, X, hy, amp, t, s);
  };

  function head(c: CanvasRenderingContext2D, x: number, y: number, amp: number, t: number, s: boolean) {
    const flick = s ? 1 : 0.9 + Math.sin(t * 0.018) * 0.06 + Math.random() * 0.06;
    const r = (wide ? 16 : 8) * Math.min(1.7, amp) * flick;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${CREAM},0.95)`);
    g.addColorStop(0.18, `rgba(${EMBER},0.75)`);
    g.addColorStop(0.5, `rgba(${EMBER},0.22)`);
    g.addColorStop(1, `rgba(${EMBER},0)`);
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = `rgb(${CREAM})`;
    c.beginPath();
    c.arc(x, y, wide ? 2.8 : 1.8, 0, Math.PI * 2);
    c.fill();
  }

  // ---------- sparks into a title ----------

  let spark: { t0: number; to: Pt } | null = null;
  let sparkRaf = 0;
  const sparkFrame = (t: number) => {
    sparkRaf = 0;
    if (!spark) return;
    const p = (t - spark.t0) / 560;
    const w = innerWidth;
    const h = innerHeight;
    if (spk.width !== Math.round(w * dpr)) {
      spk.width = Math.round(w * dpr);
      spk.height = Math.round(h * dpr);
    }
    const c = sctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    if (p >= 1 || off) {
      spark = null;
      spk.hidden = true;
      return;
    }
    const from: Pt = [X, headDoc - scrollY];
    const pts = bolt(from, spark.to, Math.hypot(spark.to[0] - from[0], spark.to[1] - from[1]) * 0.18, 5);
    // Out in the first quarter, hold, then retract back into the conduit.
    const reach = p < 0.25 ? p / 0.25 : p > 0.62 ? 1 - (p - 0.62) / 0.38 : 1;
    const n = Math.max(2, Math.round(pts.length * reach));
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.strokeStyle = `rgba(${EMBER},0.4)`;
    c.lineWidth = 4;
    strokePts(c, pts, n);
    c.strokeStyle = `rgba(${CREAM},0.95)`;
    c.lineWidth = 1.2;
    strokePts(c, pts, n);
    if (reach > 0.95) {
      const [ex, ey] = spark.to;
      const g = c.createRadialGradient(ex, ey, 0, ex, ey, 14);
      g.addColorStop(0, `rgba(${CREAM},0.9)`);
      g.addColorStop(1, `rgba(${EMBER},0)`);
      c.fillStyle = g;
      c.fillRect(ex - 14, ey - 14, 28, 28);
    }
    sparkRaf = requestAnimationFrame(sparkFrame);
  };

  const fire = (index: number) => {
    if (!wide || still() || off) return;
    const id = sectorTarget(index);
    const title = document.getElementById(id)?.querySelector<HTMLElement>(TITLE);
    if (!title) return;
    const r = title.getBoundingClientRect();
    if (r.bottom < top || r.top > innerHeight || !r.width) return;
    const em = parseFloat(getComputedStyle(title).fontSize) || 16;
    // The top-left lock-on bracket (arrive.ts: inset -0.35em -0.45em).
    spark = { t0: performance.now(), to: [r.left - 0.45 * em, r.top - 0.35 * em] };
    spk.hidden = false;
    if (!sparkRaf) sparkRaf = requestAnimationFrame(sparkFrame);
  };

  // ---------- loop ----------

  const loop = (t: number) => {
    raf = 0;
    if (off || document.hidden) return;
    const dt = Math.min(64, t - (lastT || t));
    lastT = t;
    const dy = Math.abs(scrollY - lastScroll);
    lastScroll = scrollY;
    speed += (dy / Math.max(1, dt) - speed) * 0.2;
    surge = Math.max(0, surge - dt / 700);
    draw(t);
    const max = document.documentElement.scrollHeight - innerHeight;
    if (!signed && scrollY >= max - 4) sign();
    // The thin conduit and still mode only redraw on scroll; the wide one is alive.
    if (wide && !still()) raf = requestAnimationFrame(loop);
  };

  function kick() {
    if (!raf && !off && !document.hidden) raf = requestAnimationFrame(loop);
  }

  // Overlays: hide completely while any dialog, menu or the palette is open.
  const checkOverlay = () => {
    const on = [...document.querySelectorAll<HTMLElement>(OVERLAY)].some((el) => el.getClientRects().length > 0);
    if (on === off) return;
    off = on;
    root.toggleAttribute('data-off', on);
    if (!on) kick();
  };
  const overlayTimer = window.setInterval(checkOverlay, 150);

  const offSector = onSector(({ index, prev }) => {
    sector = index;
    setNext(sector);
    if (index === prev) return;
    surge = 1;
    fire(index);
    kick();
  });

  let rt = 0;
  const later = () => {
    window.clearTimeout(rt);
    rt = window.setTimeout(measure, 250);
  };
  const ro = new ResizeObserver(later);
  ro.observe(document.body);
  const onVis = () => !document.hidden && kick();
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', later);
  document.addEventListener('visibilitychange', onVis);
  desktop.addEventListener('change', measure);
  setNext(0);
  measure();
  checkOverlay();

  return () => {
    ro.disconnect();
    offSector();
    window.clearInterval(overlayTimer);
    window.removeEventListener('scroll', kick);
    window.removeEventListener('resize', later);
    document.removeEventListener('visibilitychange', onVis);
    desktop.removeEventListener('change', measure);
    cancelAnimationFrame(raf);
    cancelAnimationFrame(sparkRaf);
    root.remove();
    spk.remove();
    sig.remove();
    end.remove();
  };
}
