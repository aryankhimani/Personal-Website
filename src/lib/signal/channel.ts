// Channel changes between sections, and the sector tracker that drives everything else.
//
// As a section leaves the top of the screen, its last strip squeezes into a thin bright
// line (like a CRT switching off); as the next one comes up from the bottom, it opens out
// sideways from a line (switching on). Both are scrubbed with the scroll and only use
// transform, opacity and clip-path, so they stay smooth. A single flash line rides the
// boundary. Off in Lite and reduced motion.
//
// The tracker works out which sector the middle of the screen is in and fires `sector`
// (bus.ts) once per change, so the line, HUD, lock-ons and sound all move together.

import { SECTORS, emitSector, still } from './bus';

// Where each sector starts. Contact starts at the "Let's build something." block.
const START: Record<string, string> = { contact: 'build' };

const OUT = 0.3; // fraction of the screen over which the leaving section collapses
const IN = 0.34; // ...and over which the arriving one opens

const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/** Layout position (ignores the transforms this file sets). */
function pageTop(el: HTMLElement | null): number {
  if (!el) return Infinity;
  let y = 0;
  for (let e: HTMLElement | null = el; e; e = e.offsetParent as HTMLElement | null) y += e.offsetTop;
  return y;
}

export function initChannel(): () => void {
  const sections = [...document.querySelectorAll<HTMLElement>('main > section[id]')];
  const starts = SECTORS.map((s) => document.getElementById(START[s.id] ?? s.id));
  const flash = document.createElement('div');
  flash.className = 'channel-flash';
  flash.setAttribute('aria-hidden', 'true');
  document.body.append(flash);

  let tops: number[] = [];
  let sectorTops: number[] = [];
  let current = -1;
  let raf = 0;
  const touched = new Set<HTMLElement>();

  const measure = () => {
    tops = sections.map(pageTop);
    sectorTops = starts.map(pageTop);
  };

  const reset = (el: HTMLElement) => {
    el.style.transform = '';
    el.style.transformOrigin = '';
    el.style.opacity = '';
    el.style.clipPath = '';
    touched.delete(el);
  };

  const frame = () => {
    raf = 0;
    const vh = innerHeight;
    const mid = scrollY + vh * 0.5;

    // Sector.
    let idx = 0;
    for (let i = 0; i < sectorTops.length; i++) if (sectorTops[i] <= mid) idx = i;
    if (idx !== current) {
      const prev = current;
      current = idx;
      if (prev !== -1) emitSector({ index: idx, prev });
      else emitSector({ index: idx, prev: idx });
    }

    if (still()) {
      touched.forEach(reset);
      flash.style.opacity = '0';
      return;
    }

    // Transitions at each boundary.
    const live = new Set<HTMLElement>();
    let flashY = -1;
    let flashA = 0;
    let flashW = 1;
    for (let k = 1; k < sections.length; k++) {
      const yv = tops[k] - scrollY; // the boundary's place on screen
      const prevEl = sections[k - 1];
      const nextEl = sections[k];
      if (yv > 0 && yv < vh * OUT) {
        const e = ease(yv / (vh * OUT));
        const sY = 0.04 + 0.96 * e;
        prevEl.style.transformOrigin = `50% ${prevEl.offsetHeight}px`;
        prevEl.style.transform = `scaleY(${sY.toFixed(4)})`;
        prevEl.style.opacity = (0.3 + 0.7 * e).toFixed(3);
        live.add(prevEl);
        const a = 1 - e;
        if (a > flashA) [flashY, flashA, flashW] = [yv, a, 1];
      }
      if (yv > vh * (1 - IN) && yv < vh) {
        const u = ease((vh - yv) / (vh * IN));
        const side = ((1 - u) * 46).toFixed(2);
        nextEl.style.clipPath = `inset(0 ${side}% 0 ${side}%)`;
        live.add(nextEl);
        const a = Math.sin(u * Math.PI) * 0.9;
        if (a > flashA) [flashY, flashA, flashW] = [yv, a, Math.max(0.08, u)];
      }
    }
    touched.forEach((el) => !live.has(el) && reset(el));
    live.forEach((el) => touched.add(el));
    flash.style.opacity = flashA.toFixed(3);
    if (flashY >= 0) flash.style.transform = `translate3d(0, ${flashY.toFixed(1)}px, 0) scaleX(${flashW.toFixed(3)})`;
  };

  const tick = () => {
    if (!raf) raf = requestAnimationFrame(frame);
  };

  let t = 0;
  const ro = new ResizeObserver(() => {
    window.clearTimeout(t);
    t = window.setTimeout(() => (measure(), tick()), 200);
  });
  ro.observe(document.body);
  window.addEventListener('scroll', tick, { passive: true });
  measure();
  tick();

  return () => {
    ro.disconnect();
    window.removeEventListener('scroll', tick);
    cancelAnimationFrame(raf);
    touched.forEach(reset);
    flash.remove();
  };
}

/** Scroll to sector `i` (HUD buttons, the command palette). */
export function sectorTarget(i: number): string {
  const s = SECTORS[i];
  return START[s.id] ?? s.id;
}
