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
  // The page can get longer mid-jump (the Journey scene adds its scroll length when it
  // loads), so check where we landed and correct, a couple of times at most.
  const settle = (triesLeft: number) => {
    window.setTimeout(() => {
      const wanted = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      if (!lenis || Math.abs(target.getBoundingClientRect().top - wanted) < 4) return;
      lenis.scrollTo(target, { duration: 0.4, onComplete: () => triesLeft > 1 && settle(triesLeft - 1) });
    }, 120);
  };
  lenis.scrollTo(target, { duration: 1.1, onComplete: () => settle(2) });
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
