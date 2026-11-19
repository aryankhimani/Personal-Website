// Storyboard scroll: Aryan's cut-out photo starts beside the hero text, travels down with the
// scroll (tilting in 3D on the way, like a card being carried) and lands in its slot in me.md
// (the 3:4 photo box standing at the bottom of the navy pad).
// Inspired by aswinpanengal.me; written from scratch.
//
// How: a fixed "flying" copy of the photo is drawn each frame at a blend of two page
// positions (start: by the hero text; end: the me.md slot). Because both are page positions,
// at progress 1 the copy sits exactly on the slot, so the hand-off to the real image is
// seamless. GSAP ScrollTrigger scrubs the progress (smoothed), Lenis does the scrolling.
//
// Phones get a simple fade/slide when me.md comes into view. Lite and reduced motion: still.

import { isLite, onLiteChange } from './device-tier';

const SCRUB = 0.6; // seconds of smoothing behind the scroll
const START_W = 170; // px, the photo's width beside the hero text

type Box = { x: number; y: number; w: number; h: number };

export function initStoryboard(): void {
  const slot = document.querySelector<HTMLElement>('[data-photo-slot]');
  const img = slot?.querySelector('img');
  if (!slot || !img) return;
  if (isLite() || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  if (!matchMedia('(min-width: 768px)').matches) {
    reveal(slot);
    return;
  }
  const go = () => void fly(slot, img);
  if (document.documentElement.dataset.boot) window.addEventListener('aryan-os:boot-done', go, { once: true });
  else go();
}

function reveal(slot: HTMLElement) {
  slot.classList.add('photo-reveal');
  const io = new IntersectionObserver(
    ([e]) => {
      if (!e?.isIntersecting) return;
      slot.classList.add('is-in');
      io.disconnect();
    },
    { rootMargin: '0px 0px -15% 0px' },
  );
  io.observe(slot);
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

async function fly(slot: HTMLElement, img: HTMLImageElement) {
  const [{ gsap }, { ScrollTrigger }, { syncWithGsap }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
    import('./scroll'),
  ]);
  gsap.registerPlugin(ScrollTrigger);
  syncWithGsap(gsap, ScrollTrigger);

  const copy = document.querySelector<HTMLElement>('.hero-copy');
  if (!copy) return;

  const flyer = document.createElement('img');
  flyer.src = img.currentSrc || img.src;
  flyer.alt = '';
  flyer.setAttribute('aria-hidden', 'true');
  flyer.className = 'photo-fly';
  document.body.append(flyer);
  slot.classList.add('photo-landing');

  const state = { p: 0 };
  let sizeKey = '';

  // Page (not viewport) boxes for the start and the end, read fresh each frame so a hero
  // switch, a font load or a resize can never leave the photo in the wrong place.
  const boxes = (): { a: Box; b: Box } => {
    const sy = window.scrollY;
    const r = img.getBoundingClientRect();
    const b = { x: r.left, y: r.top + sy, w: r.width, h: r.height };
    const c = copy.getBoundingClientRect();
    const w = Math.min(START_W, b.w);
    const h = w * (b.h / b.w);
    // Just under the hero text, right-aligned with it.
    return { a: { x: c.right - w, y: c.bottom + 20 + sy, w, h }, b };
  };

  // Scroll distance over which the trip happens: until the slot is centred on screen.
  const end = () => {
    const { b } = boxes();
    return Math.max(1, b.y + b.h / 2 - window.innerHeight / 2);
  };

  const render = () => {
    const p = state.p;
    const landed = p >= 0.999;
    slot.classList.toggle('is-landed', landed);
    flyer.style.visibility = landed ? 'hidden' : 'visible';
    if (landed) return;

    const { a, b } = boxes();
    const key = `${Math.round(b.w)}x${Math.round(b.h)}`;
    if (key !== sizeKey) {
      sizeKey = key;
      flyer.style.width = `${b.w}px`;
      flyer.style.height = `${b.h}px`;
    }
    // Half linear, half smoothstep: soft at both ends without falling behind the page.
    const e = 0.5 * p + 0.5 * p * p * (3 - 2 * p);
    const w = lerp(a.w, b.w, e);
    const cx = lerp(a.x + a.w / 2, b.x + b.w / 2, e);
    const cy = lerp(a.y + a.h / 2, b.y + b.h / 2, e) - window.scrollY;
    const arc = Math.sin(p * Math.PI); // 0 at both ends, 1 mid-flight
    flyer.style.transform =
      `translate3d(${(cx - b.w / 2).toFixed(1)}px, ${(cy - b.h / 2).toFixed(1)}px, 0) ` +
      `perspective(900px) rotateY(${(-18 * arc).toFixed(2)}deg) rotateX(${(6 * arc).toFixed(2)}deg) ` +
      `rotate(${(-3 * arc).toFixed(2)}deg) scale(${(w / b.w).toFixed(4)})`;
  };

  const tween = gsap.to(state, {
    p: 1,
    ease: 'none',
    onUpdate: render,
    scrollTrigger: { start: 0, end, scrub: SCRUB, invalidateOnRefresh: true, onRefresh: render },
  });
  render();
  window.addEventListener('resize', render);

  const stop = onLiteChange(() => {
    if (!isLite()) return;
    tween.scrollTrigger?.kill();
    tween.kill();
    window.removeEventListener('resize', render);
    flyer.remove();
    slot.classList.remove('photo-landing', 'is-landed');
    stop();
  });
}
