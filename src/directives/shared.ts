// Shared bits for the client directives (calm.ts, near.ts, later.ts).

/** Astro's client directive signature (kept local: the 'astro' type export moves between versions). */
export type ClientDirective = (load: () => Promise<() => Promise<void> | void>, opts: unknown, el: HTMLElement) => void;

/** Runs after the page's load event, so nothing competes with the first screen. */
export function afterLoad(fn: () => void): void {
  if (document.readyState === 'complete') fn();
  else window.addEventListener('load', fn, { once: true });
}

export const idle = (fn: () => void, timeout: number): void => {
  if (window.requestIdleCallback) window.requestIdleCallback(fn, { timeout });
  else window.setTimeout(fn, 1);
};

/** How far ahead of the screen islands start loading: about two screens. */
export const AHEAD = '200% 0px';

/** Calls fn once the island (display: contents, so its children) is within `margin`. */
export function whenNear(el: HTMLElement, fn: () => void, margin = AHEAD): void {
  let done = false;
  const io = new IntersectionObserver(
    (entries) => {
      if (done || !entries.some((e) => e.isIntersecting)) return;
      done = true;
      io.disconnect();
      fn();
    },
    { rootMargin: margin },
  );
  for (const child of Array.from(el.children)) io.observe(child);
  if (!el.children.length) io.observe(el);
}
