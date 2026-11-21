// Smooth scrolling. Lenis runs only outside Lite mode; in Lite the browser scrolls natively.
//
// Lenis drives itself with requestAnimationFrame until GSAP arrives (it's lazy: the Journey
// scene and the heading effects load it). From then on Lenis runs on GSAP's ticker, so
// ScrollTrigger and the scroll position update in the same frame (no lag, no jitter).

import Lenis from 'lenis';
import { isLite, onLiteChange } from './device-tier';

type Gsap = typeof import('gsap').gsap;
type ST = typeof import('gsap/ScrollTrigger').ScrollTrigger;

let lenis: Lenis | null = null;
let locks = 0;
let raf = 0;
let gsapRef: { gsap: Gsap; ST: ST } | null = null;
// GSAP's ticker time starts at 0 when GSAP loads, but Lenis has been running on the page clock;
// feeding it GSAP's time mid-scroll would send its clock backwards and freeze a jump. Use one clock.
const tick = () => lenis?.raf(performance.now());

function ownLoop(t: number) {
  lenis?.raf(t);
  raf = requestAnimationFrame(ownLoop);
}

function start() {
  if (lenis || isLite()) return;
  lenis = new Lenis({
    lerp: 0.08,
    smoothWheel: true,
    wheelMultiplier: 0.9,
    touchMultiplier: 1.2,
    autoRaf: false,
    anchors: false,
  });
  if (gsapRef) {
    lenis.on('scroll', gsapRef.ST.update);
  } else {
    raf = requestAnimationFrame(ownLoop);
  }
  if (locks > 0) lenis.stop();
}

function stop() {
  cancelAnimationFrame(raf);
  lenis?.destroy();
  lenis = null;
}

/** Hand Lenis over to GSAP's ticker. Safe to call more than once. */
export function syncWithGsap(gsap: Gsap, ST: ST): void {
  if (gsapRef) return;
  gsapRef = { gsap, ST };
  cancelAnimationFrame(raf);
  // First in the tick: Lenis scrolls (and ScrollTrigger reads the position) while layout is
  // still clean, before GSAP writes this frame's tween styles. Otherwise both force a layout.
  gsap.ticker.add(tick, false, true);
  gsap.ticker.lagSmoothing(0);
  lenis?.on('scroll', ST.update);
}

// Reading window.scrollY or scrollHeight inside an animation frame, after something else has
// written styles in that frame, forces Chrome to lay the page out again synchronously. Scroll
// effects read these instead: Lenis's own number, or values cached on the scroll event / resize.
let cachedY = typeof window === 'undefined' ? 0 : window.scrollY;
let cachedH = 0;
let cachedVh = typeof window === 'undefined' ? 0 : window.innerHeight;

/** Current scroll position without touching layout. */
export const scrollPos = (): number => (lenis ? lenis.animatedScroll : cachedY);
/** Page height, refreshed when the page resizes. */
export const pageHeight = (): number => cachedH || (cachedH = document.documentElement.scrollHeight);
/** Viewport height, refreshed on resize. */
export const viewHeight = (): number => cachedVh;

function cacheSizes() {
  window.addEventListener('scroll', () => (cachedY = window.scrollY), { passive: true });
  window.addEventListener('resize', () => (cachedVh = window.innerHeight), { passive: true });
  new ResizeObserver(() => {
    cachedH = document.documentElement.scrollHeight;
  }).observe(document.body);
}

/** Marks <html data-scrolling> while the page moves, so costly glass can step down (colour.css). */
function flagScrolling() {
  const html = document.documentElement;
  let t = 0;
  window.addEventListener(
    'scroll',
    () => {
      if (!t) html.setAttribute('data-scrolling', '');
      else window.clearTimeout(t);
      t = window.setTimeout(() => {
        t = 0;
        html.removeAttribute('data-scrolling');
      }, 160);
    },
    { passive: true },
  );
}

export function initScroll(): void {
  cacheSizes();
  flagScrolling();
  start();
  onLiteChange(() => (isLite() ? stop() : start()));
}

export function getLenis(): Lenis | null {
  return lenis;
}

export function scrollToSection(id: string): void {
  const target = document.getElementById(id);
  // On a project page the homepage sections aren't here, so go home to them.
  if (!target) {
    location.assign(`/#${id}`);
    return;
  }
  if (!lenis) {
    target.scrollIntoView({ behavior: 'auto', block: 'start' });
    return;
  }
  // The page can change height mid-jump (the Journey scene sizes itself when it loads, and
  // lazy islands hydrate as they come near), so keep checking where we landed and nudge,
  // until the target has stayed put for a few checks (or ~3s have passed).
  let checks = 0;
  let still = 0;
  // The moment the visitor scrolls themselves, stop correcting.
  let userMoved = false;
  const stopIt = () => (userMoved = true);
  for (const ev of ['wheel', 'touchstart', 'keydown'] as const) window.addEventListener(ev, stopIt, { once: true, passive: true });
  const settle = () => {
    window.setTimeout(() => {
      if (!lenis || userMoved) return;
      checks += 1;
      const wanted = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      const off = target.getBoundingClientRect().top - wanted;
      if (Math.abs(off) < 2) {
        still += 1;
        if (still >= 3 || checks > 20) return;
        settle();
        return;
      }
      still = 0;
      if (checks > 20) return;
      lenis.scrollTo(target, { duration: 0.25, onComplete: settle });
    }, 120);
  };
  lenis.scrollTo(target, { duration: 1.1, onComplete: settle });
}

/** Stops page scrolling while a full-screen sheet is open. Calls nest. */
export function lockScroll(): void {
  locks += 1;
  if (locks === 1) {
    document.documentElement.style.overflow = 'hidden';
    lenis?.stop();
  }
}

export function unlockScroll(): void {
  locks = Math.max(0, locks - 1);
  if (locks === 0) {
    document.documentElement.style.overflow = '';
    lenis?.start();
  }
}
