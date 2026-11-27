// The pinned Journey scene. The stage stays on screen while scrolling scrubs through the
// chapters: each one's words come in one by one and its photo powers on like a CRT
// (a bright line widens, opens, flickers once, scanlines settle) while HUD brackets and a
// SIGNAL LOCK readout snap in. Scrub is smoothed so it eases behind the scroll.
// Loaded on demand and never in Lite mode (see Journey.astro); journey.css does the layout.

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { syncWithGsap } from './scroll';

gsap.registerPlugin(ScrollTrigger);
syncWithGsap(gsap, ScrollTrigger);

const SCREENS_PER_CHAPTER = 0.8;
const SMOOTH = 0.7; // seconds the scrub trails the scroll

/** Adds a CRT power-on for one photo to `tl`, from `at` over `dur` timeline units. */
function powerOn(tl: gsap.core.Timeline, el: HTMLElement, at: number, dur: number) {
  const pic = el.querySelector('picture');
  const scan = el.querySelector('.crt-scan');
  const brackets = el.querySelectorAll('.jhud-br');
  const read = el.querySelector('.jhud-read');
  const nosig = el.querySelector('.jhud-nosig');
  const lock = el.querySelector('.jhud-lock');
  if (!pic) return;
  // The "overexposed" glow is a cream layer over the photo fading out (opacity only), not a
  // brightness() filter: a filter scrubbed on a big image repainted it on every scroll frame.
  let flash = pic.parentElement!.querySelector<HTMLElement>(':scope > .crt-flash');
  if (!flash) {
    flash = document.createElement('i');
    flash.className = 'crt-flash';
    flash.setAttribute('aria-hidden', 'true');
    pic.after(flash);
  }
  const both = [pic, flash];
  const t = (f: number) => at + dur * f;
  tl.fromTo(both, { scaleX: 0.04, scaleY: 0.008 }, { scaleX: 1, duration: dur * 0.22, ease: 'power2.out' }, t(0));
  tl.fromTo(pic, { opacity: 1 }, { opacity: 1, duration: dur * 0.22 }, t(0));
  tl.fromTo(flash, { opacity: 0.85 }, { opacity: 0.85, duration: dur * 0.22 }, t(0));
  tl.to(both, { scaleY: 1, duration: dur * 0.3, ease: 'expo.out' }, t(0.22));
  tl.to(flash, { opacity: 0.35, duration: dur * 0.3, ease: 'expo.out' }, t(0.22));
  // One flicker, then settle.
  tl.to(pic, { opacity: 0.45, duration: dur * 0.03 }, t(0.54));
  tl.to(pic, { opacity: 1, duration: dur * 0.03 }, t(0.57));
  tl.to(pic, { opacity: 0.75, duration: dur * 0.02 }, t(0.62));
  tl.to(pic, { opacity: 1, duration: dur * 0.16 }, t(0.64));
  tl.to(flash, { opacity: 0, duration: dur * 0.16 }, t(0.64));
  if (scan) tl.fromTo(scan, { opacity: 1 }, { opacity: 0, duration: dur * 0.35, ease: 'power1.in' }, t(0.55));
  if (brackets.length)
    tl.fromTo(brackets, { opacity: 0, scale: 1.8 }, { opacity: 1, scale: 1, duration: dur * 0.14, stagger: dur * 0.035, ease: 'back.out(2.2)' }, t(0.48));
  if (read) tl.fromTo(read, { opacity: 0 }, { opacity: 1, duration: dur * 0.06 }, t(0.5));
  if (nosig && lock) {
    tl.fromTo(nosig, { opacity: 1 }, { opacity: 0, duration: dur * 0.02 }, t(0.86));
    tl.fromTo(lock, { opacity: 0 }, { opacity: 1, duration: dur * 0.02 }, t(0.86));
  }
}

function splitWords(el: HTMLElement): HTMLElement[] {
  const text = el.textContent?.trim() ?? '';
  el.dataset.text = text;
  el.textContent = '';
  // Screen readers get the sentence whole; the per-word spans are only for the eyes.
  const whole = document.createElement('span');
  whole.className = 'sr-only';
  whole.textContent = text;
  el.append(whole);
  return text.split(/\s+/).map((word, i, all) => {
    const span = document.createElement('span');
    span.textContent = word + (i < all.length - 1 ? ' ' : '');
    span.setAttribute('aria-hidden', 'true');
    el.append(span);
    return span;
  });
}

export function createJourney(section: HTMLElement): { destroy: () => void } {
  const stage = section.querySelector<HTMLElement>('[data-journey-stage]')!;
  const chapters = [...section.querySelectorAll<HTMLElement>('[data-chapter]')];
  const ticks = [...section.querySelectorAll<HTMLElement>('[data-journey-rail] li')];
  const lines = chapters.map((c) => c.querySelector<HTMLElement>('[data-chapter-line]')!);
  const words = lines.map(splitWords);
  const photos = chapters.map((c) => c.querySelector<HTMLElement>('[data-chapter-photo]'));
  const last = chapters.length - 1;
  const menubarHeight = () => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;

  let active = 0;
  const setActive = (i: number) => {
    if (i === active) return;
    active = i;
    ticks.forEach((t, n) => (n === i ? t.setAttribute('data-active', '') : t.removeAttribute('data-active')));
    chapters.forEach((c, n) => (c.style.pointerEvents = n === i ? 'auto' : 'none'));
  };

  const sizeSection = () => {
    section.style.height = `${stage.offsetHeight + last * SCREENS_PER_CHAPTER * window.innerHeight}px`;
  };
  sizeSection();
  ScrollTrigger.addEventListener('refreshInit', sizeSection);

  section.setAttribute('data-journey-live', '');
  const ctx = gsap.context(() => {
    gsap.set(chapters.slice(1), { opacity: 0, pointerEvents: 'none' });

    // Chapter 1 reveals as the section scrolls into place, before the pin takes over.
    const intro = gsap.timeline({
      scrollTrigger: { trigger: section, start: 'top 75%', end: 'top top+=40', scrub: SMOOTH },
    });
    intro.fromTo(words[0], { opacity: 0.12 }, { opacity: 1, stagger: 0.08, ease: 'none' }, 0);
    if (photos[0]) powerOn(intro, photos[0], 0.1, 1.4);

    // One unit of timeline per chapter. The stage is held in place by CSS position: sticky
    // (the section is made tall enough to scroll through), not by a GSAP pin: a pin flips the
    // stage to position: fixed, which Chrome counts as a layout shift.
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: section,
        start: () => `top top+=${menubarHeight()}`,
        end: () => `+=${last * SCREENS_PER_CHAPTER * window.innerHeight}`,
        scrub: SMOOTH,
        invalidateOnRefresh: true,
        onUpdate: (self) => setActive(Math.min(last, Math.floor(self.progress * last + 0.12))),
      },
    });

    for (let i = 1; i <= last; i++) {
      const at = i - 1; // chapter i arrives during unit i-1
      tl.to(chapters[i - 1], { opacity: 0, duration: 0.14 }, at + 0.74);
      tl.to(chapters[i], { opacity: 1, duration: 0.1 }, at + 0.88);
      tl.fromTo(words[i], { opacity: 0.12 }, { opacity: 1, duration: 0.2, stagger: 0.03 }, at + 0.9);
      const photo = photos[i];
      if (photo) powerOn(tl, photo, at + 0.86, 0.6);
    }
    // Hold the last chapter for the rest of its unit.
    tl.to({}, { duration: 0.01 }, last);
  }, section);

  // Tabbing to a link in a chapter that isn't showing scrolls the scene to that chapter.
  const onFocus = (e: FocusEvent) => {
    const i = chapters.findIndex((c) => c.contains(e.target as Node));
    const st = ScrollTrigger.getAll().find((t) => t.trigger === section && t.vars.onUpdate);
    if (i < 0 || i === active || !st) return;
    window.scrollTo({ top: st.start + ((st.end - st.start) * i) / last + 2 });
  };
  section.addEventListener('focusin', onFocus);

  // Anything that changes the page height above us (fonts, the work list opening) moves the pin.
  let refreshTimer = 0;
  const observer = new ResizeObserver(() => {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 150);
  });
  const work = document.getElementById('work');
  if (work) observer.observe(work);
  void document.fonts?.ready.then(() => ScrollTrigger.refresh());

  return {
    destroy() {
      window.clearTimeout(refreshTimer);
      observer.disconnect();
      section.removeEventListener('focusin', onFocus);
      ctx.revert();
      section.removeAttribute('data-journey-live');
      ScrollTrigger.removeEventListener('refreshInit', sizeSection);
      section.style.height = '';
      lines.forEach((line) => {
        line.textContent = line.dataset.text ?? '';
      });
      chapters.forEach((c) => (c.style.pointerEvents = ''));
      ticks.forEach((t, n) => (n === 0 ? t.setAttribute('data-active', '') : t.removeAttribute('data-active')));
      active = 0;
    },
  };
}
