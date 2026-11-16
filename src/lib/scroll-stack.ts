// Cards pinned with position: sticky stack on top of each other as you scroll; the ones
// underneath shrink and dim a little. Adapted from React Bits' Scroll Stack
// (https://reactbits.dev/components/scroll-stack, MIT + Commons Clause): the same depth
// maths, without its own wheel smoothing (Lenis already does that) and without React,
// so the cards stay plain HTML. Off in Lite mode: the cards still stack, just without scaling.

import { isLite, onLiteChange } from './device-tier';

const ITEM_SCALE = 0.045; // how much each covering card shrinks the ones below
const BASE_SCALE = 0.86; // never smaller than this
const DIM = 0.16; // darkening per card on top

export function initScrollStack(root: HTMLElement): void {
  const slots = [...root.querySelectorAll<HTMLElement>('[data-stack-slot]')];
  const cards = slots.map((s) => s.firstElementChild as HTMLElement);
  if (slots.length < 2) return;

  let frame = 0;
  let visible = false;

  const reset = () =>
    cards.forEach((c) => {
      c.style.transform = '';
      c.style.setProperty('--stack-dim', '0');
    });

  const update = () => {
    frame = 0;
    if (isLite()) return reset();
    const heights = slots.map((s) => s.offsetHeight);
    const tops = slots.map((s) => s.getBoundingClientRect().top);
    const pins = slots.map((s) => parseFloat(getComputedStyle(s).top) || 0);

    // depth[i] = how many cards (fractionally) currently cover card i.
    const depth = slots.map(() => 0);
    for (let j = 1; j < slots.length; j++) {
      const start = pins[j - 1] + heights[j - 1];
      const span = Math.max(1, start - pins[j]);
      const cover = Math.min(1, Math.max(0, (start - tops[j]) / span));
      for (let i = 0; i < j; i++) depth[i] += cover;
    }

    cards.forEach((card, i) => {
      const d = depth[i];
      card.style.transform = d < 0.0005 ? '' : `scale(${Math.max(BASE_SCALE, 1 - d * ITEM_SCALE).toFixed(4)})`;
      card.style.setProperty('--stack-dim', (1 - Math.pow(1 - DIM, d)).toFixed(3));
    });
  };

  const schedule = () => {
    if (visible && !frame) frame = requestAnimationFrame(update);
  };

  // Only do the work while the stack is near the screen.
  new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      schedule();
    },
    { rootMargin: '200px 0px' },
  ).observe(root);

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  onLiteChange(() => (isLite() ? reset() : schedule()));
}
