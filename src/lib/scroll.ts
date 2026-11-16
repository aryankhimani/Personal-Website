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
const tick = (time: number) => lenis?.raf(time * 1000);

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
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  lenis?.on('scroll', ST.update);
}

export function initScroll(): void {
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
