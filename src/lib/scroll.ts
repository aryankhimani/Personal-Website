// Smooth scrolling. Lenis runs only outside Lite mode; in Lite the browser scrolls natively.

import Lenis from 'lenis';
import { isLite, onLiteChange } from './device-tier';

let lenis: Lenis | null = null;
let locks = 0;

function start() {
  if (lenis || isLite()) return;
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9, autoRaf: true, anchors: false });
  if (locks > 0) lenis.stop();
}

function stop() {
  lenis?.destroy();
  lenis = null;
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
