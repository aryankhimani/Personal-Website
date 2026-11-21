// The Signal: a static electric line in the LEFT margin of the homepage. It never crosses
// text, cards or images (it sits in the page gutter) and it doesn't react to scrolling: a
// cream core with a red-orange glow and a very slow shimmer running down it (CSS only,
// transform/opacity, so it costs nothing while you scroll). It hides completely while any
// overlay is open (folder page, reader, windows, menus, ⌘K). Narrow gutters and phones get a
// thin line on the left edge. Lite and reduced motion: no shimmer.
// At the very bottom it signs "Aryan" and types > end of transmission.

import { still } from './bus';

const NS = 'http://www.w3.org/2000/svg';
const END_TEXT = '> end of transmission. thanks for scrolling.';
const OVERLAY = '[role="dialog"], [role="alertdialog"], [role="menu"], .palette-veil';

// "Aryan" in one stroke, in a 220 x 96 box (hand-drawn for this site).
const SIGNATURE =
  'c10,-20 25,-60 38,-66 c6,-3 8,16 10,36 c2,15 4,28 8,32 c-10,-20 -32,-26 -42,-22 c16,-6 36,-8 50,-6 c6,1 6,14 8,18 c2,-10 8,-18 18,-16 c-2,10 2,18 8,16 c6,-2 8,-12 10,-18 c0,12 0,22 -2,32 c-4,16 -16,18 -14,6 c2,-10 18,-18 30,-22 c4,-12 18,-16 20,-8 c2,6 -6,14 -14,12 c-6,-2 -2,-14 10,-16 c4,0 4,8 6,14 c2,4 6,2 10,-4 c2,-6 4,-12 6,-12 c2,6 0,12 0,18 c2,-10 8,-18 16,-18 c6,0 6,10 8,16 c2,4 8,4 16,-2 c10,-6 14,10 -4,16 c-36,10 -116,8 -176,4';

export function initSignalLine(): () => void {
  const desktop = window.matchMedia('(min-width: 1024px) and (pointer: fine)');
  const line = document.createElement('div');
  line.className = 'conduit';
  line.setAttribute('aria-hidden', 'true');

  // The signature, anchored to the page above the footer.
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
  document.body.append(line, sig, end);

  let X = 4;
  let typed = false;
  let signed = false;
  let off = false;

  const measure = () => {
    const writing = document.getElementById('writing');
    const gutter = writing ? parseFloat(getComputedStyle(writing).paddingLeft) || 0 : 0;
    const wide = desktop.matches && gutter >= 72;
    line.dataset.mode = wide ? 'wide' : 'thin';
    X = wide ? Math.round(Math.min(44, gutter * 0.36)) : 4;
    line.style.left = `${X}px`;
    buildSig();
  };

  function buildSig() {
    const foot = document.querySelector('.site-foot-strip .site-foot-inner');
    const show = desktop.matches && !!foot;
    sig.style.display = show ? '' : 'none';
    end.style.display = sig.style.display;
    if (!show) return;
    const r = foot!.getBoundingClientRect();
    const sx = Math.max(X + 40, r.left + 8);
    const sy = r.bottom + scrollY + 18;
    const d = `M${X},${sy + 30} C${X},${sy + 70} ${sx - 30},${sy + 72} ${sx},${sy + 70} ${SIGNATURE}`;
    sig.setAttribute('width', String(document.documentElement.clientWidth));
    sig.setAttribute('height', String(document.documentElement.scrollHeight));
    for (const p of paths) p.setAttribute('d', d);
    const len = paths[2].getTotalLength();
    for (const p of paths) {
      p.style.strokeDasharray = `${len} ${len}`;
      p.style.strokeDashoffset = signed ? '0' : String(len);
    }
    end.style.left = `${sx + 250}px`;
    end.style.top = `${sy + 78}px`;
    if (still()) sign(true);
  }

  function sign(instant = false) {
    if (signed) return;
    signed = true;
    sig.classList.toggle('draw', !instant);
    for (const p of paths) p.style.strokeDashoffset = '0';
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

  // Sign when the bottom of the page comes into view (no scroll listener).
  const sentinel = document.querySelector('.site-foot-strip');
  const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting && e.intersectionRatio > 0.85) && sign(), {
    threshold: [0.85, 1],
  });
  if (sentinel) io.observe(sentinel);

  // Overlays: hide completely while any dialog, menu or the palette is open. A cheap poll
  // (a handful of matches, 4x a second) instead of watching every DOM change.
  const checkOverlay = () => {
    const on = [...document.querySelectorAll<HTMLElement>(OVERLAY)].some((el) => el.getClientRects().length > 0);
    if (on === off) return;
    off = on;
    line.toggleAttribute('data-off', on);
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
  measure();
  checkOverlay();

  return () => {
    ro.disconnect();
    io.disconnect();
    window.clearInterval(overlayTimer);
    desktop.removeEventListener('change', measure);
    line.remove();
    sig.remove();
    end.remove();
  };
}
