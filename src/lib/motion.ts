// Section entrances and big-heading effects.
//
// - Reveals: blocks marked below ease up 40px and fade in once (700ms, power3.out) as they
//   enter. IntersectionObserver + a CSS transition, so it costs nothing until it happens.
// - Headings: section headings get React Bits' Scroll Float effect (letters float up into
//   place, scrubbed to the scroll), adapted to plain DOM so the headings stay server-rendered.
//   GSAP loads only when the first heading gets close.
//
// Lite mode and reduced motion skip both: everything is simply there.

import { isLite } from './device-tier';

const REVEAL = [
  '.section-head',
  '.work-head',
  '.writing-head',
  '.desk',
  '.fig',
  '.toys',
  '.finder-window',
  '.me-window',
  '.compose',
  '.memories-inner',
  '[data-reveal]',
].join(',');

const FLOAT = ['.section-heading', '.work-heading', '.memories-heading'].join(',');

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initMotion(): void {
  if (isLite() || reduced()) return;
  const root = document.documentElement;
  root.dataset.motion = '';

  const blocks = [...document.querySelectorAll<HTMLElement>(REVEAL)];
  // Anything already on screen at load stays put; only things below the fold animate.
  const fold = window.innerHeight;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        (e.target as HTMLElement).classList.add('is-in');
        io.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -12% 0px' },
  );
  for (const el of blocks) {
    if (el.getBoundingClientRect().top < fold) continue;
    el.classList.add('reveal');
    io.observe(el);
  }

  const headings = [...document.querySelectorAll<HTMLElement>(FLOAT)].filter(
    (h) => h.getBoundingClientRect().top > fold,
  );
  if (!headings.length) return;
  const near = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      near.disconnect();
      void floatHeadings(headings);
    },
    { rootMargin: '1200px 0px' },
  );
  headings.forEach((h) => near.observe(h));
}

/** Splits a heading's text into letters for the effect, keeping the real text for screen readers. */
function split(h: HTMLElement): HTMLElement[] {
  const text = h.textContent ?? '';
  h.setAttribute('aria-label', text.trim());
  h.classList.add('float-heading');
  const out: HTMLElement[] = [];
  const frag = document.createDocumentFragment();
  for (const part of text.split(/(\s+)/)) {
    if (!part.trim()) {
      frag.append(part);
      continue;
    }
    const word = document.createElement('span');
    word.className = 'float-word';
    word.setAttribute('aria-hidden', 'true');
    for (const ch of Array.from(part)) {
      const c = document.createElement('span');
      c.className = 'float-char';
      c.textContent = ch;
      word.append(c);
      out.push(c);
    }
    frag.append(word);
  }
  h.replaceChildren(frag);
  return out;
}

async function floatHeadings(headings: HTMLElement[]) {
  const [{ gsap }, { ScrollTrigger }, { syncWithGsap }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
    import('./scroll'),
  ]);
  gsap.registerPlugin(ScrollTrigger);
  syncWithGsap(gsap, ScrollTrigger);
  if (isLite()) return;

  // Scroll Float's default "float" effect: each letter rises from below, stretched tall
  // and squeezed thin, and settles as the heading scrolls into place.
  const stretch = 2.3;
  const squeeze = stretch ** -0.43;
  for (const h of headings) {
    const chars = split(h);
    gsap.fromTo(
      chars,
      { opacity: 0, yPercent: 120, scaleY: stretch, scaleX: squeeze, transformOrigin: '50% 0%' },
      {
        opacity: 1,
        yPercent: 0,
        scaleY: 1,
        scaleX: 1,
        ease: 'back.inOut(2)',
        stagger: 0.03,
        scrollTrigger: {
          trigger: h,
          start: 'center bottom+=50%',
          end: 'bottom bottom-=40%',
          scrub: true,
        },
      },
    );
  }
  ScrollTrigger.refresh();
}
