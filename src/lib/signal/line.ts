// The Signal: an electric line down the LEFT margin of the whole homepage, from the top of
// the hero to the "Aryan" signature above the footer. The track is drawn dim; as you scroll,
// it lights up behind a glowing head that rides along at the middle of the screen, and the
// signature lights when the head reaches it. Cheap by design:
//   - a few absolutely positioned segments (one per stretch between full-width bands, like
//     the ticker, which it skips), measured only when the page resizes
//   - on scroll, one rAF writes transforms only (each segment's fill scaleY + the head's
//     translateY), reading the cached scroll position (no layout reads)
//   - a cream core with a navy casing (so it reads on cream sections too) and an ember glow
//     on its own layer that breathes very slowly (opacity only, so no repaints)
// It sits in the page gutter, so it never crosses text, cards or images, and it hides
// completely while an overlay is open (folder page, reader, windows, menus, ⌘K).
// Phones and narrow gutters get a thin line on the left edge. Lite / reduced motion: no glow pulse.

import { still } from './bus';
import { pageHeight, scrollPos, viewHeight } from '../scroll';

const NS = 'http://www.w3.org/2000/svg';
const END_TEXT = '> end of transmission. thanks for scrolling.';
const OVERLAY = '[role="dialog"], [role="alertdialog"], [role="menu"], .palette-veil';
/** Full-width bands the line steps around. */
const SKIP = '#ticker, .ticker';

// "Aryan" in one stroke, in a 220 x 96 box (hand-drawn for this site).
const SIGNATURE =
  'c10,-20 25,-60 38,-66 c6,-3 8,16 10,36 c2,15 4,28 8,32 c-10,-20 -32,-26 -42,-22 c16,-6 36,-8 50,-6 c6,1 6,14 8,18 c2,-10 8,-18 18,-16 c-2,10 2,18 8,16 c6,-2 8,-12 10,-18 c0,12 0,22 -2,32 c-4,16 -16,18 -14,6 c2,-10 18,-18 30,-22 c4,-12 18,-16 20,-8 c2,6 -6,14 -14,12 c-6,-2 -2,-14 10,-16 c4,0 4,8 6,14 c2,4 6,2 10,-4 c2,-6 4,-12 6,-12 c2,6 0,12 0,18 c2,-10 8,-18 16,-18 c6,0 6,10 8,16 c2,4 8,4 16,-2 c10,-6 14,10 -4,16 c-36,10 -116,8 -176,4';

const pageBox = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { top: r.top + scrollY, bottom: r.bottom + scrollY, left: r.left + scrollX };
};

export function initSignalLine(): () => void {
  const desktop = window.matchMedia('(min-width: 1024px) and (pointer: fine)');
  const line = document.createElement('div');
  line.className = 'conduit';
  line.setAttribute('aria-hidden', 'true');

  // The signature, anchored to the page above the footer, already drawn.
  const sig = document.createElementNS(NS, 'svg');
  sig.classList.add('signal-sig');
  sig.setAttribute('aria-hidden', 'true');
  const paths = ['signal-glow', 'signal-case', 'signal-core'].map((c) => {
    const p = document.createElementNS(NS, 'path');
    p.classList.add(c);
    sig.append(p);
    return p;
  });
  const end = document.createElement('p');
  end.className = 'signal-end';
  end.setAttribute('aria-hidden', 'true');
  end.dataset.on = '';
  end.textContent = END_TEXT;
  document.body.append(line, sig, end);

  // The head: a HUD reticle (core, rotating arc, crosshair ticks), data pulses flowing into it,
  // two flickering electric arcs just above it, and a progress readout.
  const head = document.createElement('i');
  head.className = 'conduit-head';
  head.innerHTML =
    '<span class="ch-flow"></span>' +
    '<svg class="ch-arc" viewBox="-8 -96 16 92" width="16" height="92">' +
    '<polyline points="0,-96 3,-84 -2,-74 4,-60 -3,-48 2,-36 -4,-24 1,-12 0,-4"/>' +
    '<polyline points="0,-96 -3,-86 2,-72 -4,-62 3,-50 -2,-40 4,-28 -2,-16 0,-4"/></svg>' +
    '<span class="ch-ring"></span><span class="ch-cross"></span><span class="ch-core"></span>' +
    '<b class="ch-read">00%</b>';
  const read = head.querySelector<HTMLElement>('.ch-read')!;
  let lastPct = -1;

  let off = false;
  let lastKey = '';
  /** Current segments in page px, with their fill elements. */
  let segEls: { a: number; b: number; fill: HTMLElement; p: number }[] = [];
  let lineTop = 0;
  let lineBottom = 0;
  let lastHead = -1;
  let lit = false;

  const measure = () => {
    const hero = document.getElementById('home');
    const writing = document.getElementById('writing');
    const foot = document.querySelector('.site-foot-strip .site-foot-inner');
    if (!hero) return;
    const gutter = writing ? parseFloat(getComputedStyle(writing).paddingLeft) || 0 : 0;
    const wide = desktop.matches && gutter >= 72;
    const X = wide ? Math.round(Math.min(44, gutter * 0.36)) : 4;
    const top = pageBox(hero).top + 8;
    const docH = document.documentElement.scrollHeight;

    // Where it ends: the start of the signature (desktop), else the end of the page.
    let bottom = docH - 4;
    let sx = 0;
    let sy = 0;
    const signed = desktop.matches && !!foot;
    if (signed) {
      const f = pageBox(foot!);
      sx = Math.max(X + 40, f.left + 8);
      sy = f.bottom + 18;
      bottom = sy + 30;
    }

    // Segments between the bands it skips.
    const gaps = [...document.querySelectorAll(SKIP)]
      .map(pageBox)
      .filter((b) => b.bottom > top && b.top < bottom)
      .sort((a, b) => a.top - b.top);
    const segs: [number, number][] = [];
    let y = top;
    for (const g of gaps) {
      if (g.top - 6 > y) segs.push([y, g.top - 6]);
      y = Math.max(y, g.bottom + 6);
    }
    if (bottom > y) segs.push([y, bottom]);

    const key = `${wide}|${X}|${segs.map((s) => s.map(Math.round).join('-')).join(',')}|${sx},${Math.round(sy)}`;
    if (key === lastKey) return;
    lastKey = key;
    line.dataset.mode = wide ? 'wide' : 'thin';
    line.style.left = `${X}px`;
    segEls = segs.map(([a, b]) => {
      const fill = document.createElement('b');
      fill.className = 'conduit-fill';
      return { a: Math.round(a), b: Math.round(b), fill, p: -1 };
    });
    line.replaceChildren(
      ...segEls.map(({ a, b, fill }) => {
        const s = document.createElement('i');
        s.className = 'conduit-seg';
        s.style.top = `${a}px`;
        s.style.height = `${b - a}px`;
        s.append(fill);
        return s;
      }),
      head,
    );
    lineTop = segEls[0]?.a ?? top;
    lineBottom = segEls[segEls.length - 1]?.b ?? bottom;
    lastHead = -1;
    paint();

    sig.style.display = signed ? '' : 'none';
    end.style.display = sig.style.display;
    if (!signed) return;
    const d = `M${X},${bottom} C${X},${sy + 70} ${sx - 30},${sy + 72} ${sx},${sy + 70} ${SIGNATURE}`;
    sig.setAttribute('width', String(document.documentElement.clientWidth));
    sig.setAttribute('height', String(docH));
    for (const p of paths) p.setAttribute('d', d);
    end.style.left = `${sx + 250}px`;
    end.style.top = `${sy + 78}px`;
  };

  // Scroll: the head sits a little below the middle of the screen; everything above it is lit.
  let raf = 0;
  function paint() {
    raf = 0;
    const vh = viewHeight() || innerHeight;
    const sy = scrollPos();
    let y = sy + vh * 0.55;
    // Over the last screen of scrolling, ease the head down so it reaches the signature
    // exactly when the page ends (the signature sits below the middle of the last screen).
    const max = Math.max(1, pageHeight() - vh);
    const t = Math.min(1, Math.max(0, (sy - (max - vh)) / vh));
    if (lineBottom > y) y += (lineBottom - (max + vh * 0.55)) * t * t;
    y = Math.min(lineBottom, Math.max(lineTop, y));
    // Inside a skipped band (the ticker): wait at the end of the segment above it.
    const seg = segEls.find((g) => y <= g.b);
    if (seg && y < seg.a) y = segEls[segEls.indexOf(seg) - 1]?.b ?? seg.a;
    y = Math.round(y);
    if (y === lastHead) return;
    lastHead = y;
    head.style.transform = `translate3d(-50%, ${y}px, 0)`;
    for (const g of segEls) {
      const p = Math.min(1, Math.max(0, (y - g.a) / Math.max(1, g.b - g.a)));
      if (Math.abs(p - g.p) < 0.0005) continue;
      g.p = p;
      g.fill.style.transform = `scaleY(${p.toFixed(4)})`;
    }
    const pct = Math.round(((y - lineTop) / Math.max(1, lineBottom - lineTop)) * 100);
    if (pct !== lastPct) {
      lastPct = pct;
      read.textContent = `${String(pct).padStart(2, '0')}%`;
    }
    const done = y >= lineBottom - 2;
    if (done !== lit) {
      lit = done;
      sig.toggleAttribute('data-lit', done);
      end.toggleAttribute('data-lit', done);
    }
  }
  const onScroll = () => {
    if (!raf) raf = requestAnimationFrame(paint);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  // Overlays: hide completely while any dialog, menu or the palette is open. A cheap poll
  // (a handful of matches, 4x a second) instead of watching every DOM change.
  const checkOverlay = () => {
    const on = [...document.querySelectorAll<HTMLElement>(OVERLAY)].some((el) => el.getClientRects().length > 0);
    if (on === off) return;
    off = on;
    for (const el of [line, sig, end]) el.toggleAttribute('data-off', on);
  };
  const overlayTimer = window.setInterval(checkOverlay, 250);

  let rt = 0;
  const later = () => {
    window.clearTimeout(rt);
    rt = window.setTimeout(measure, 250);
  };
  const ro = new ResizeObserver(later);
  ro.observe(document.body);
  desktop.addEventListener('change', measure);
  line.toggleAttribute('data-still', still());
  measure();
  checkOverlay();

  return () => {
    ro.disconnect();
    cancelAnimationFrame(raf);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    window.clearInterval(overlayTimer);
    desktop.removeEventListener('change', measure);
    line.remove();
    sig.remove();
    end.remove();
  };
}
