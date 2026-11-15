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
  if (!target) return;
  if (lenis) {
    lenis.scrollTo(target, { duration: 1.1 });
  } else {
    target.scrollIntoView({ behavior: 'auto', block: 'start' });
  }
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
