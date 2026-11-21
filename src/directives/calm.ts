// client:calm — like client:visible, but hydration waits for a pause in scrolling.
// When the island gets near the screen its code is fetched; it hydrates only once the page
// has stopped scrolling for a moment and the browser is idle. Hydrating a React island (and
// creating its canvas or WebGL context) can take 100+ ms, and doing that mid-scroll was the
// main cause of scroll hitches.
// Astro's client directive signature (kept local: the 'astro' type export moves between versions).
type ClientDirective = (load: () => Promise<() => Promise<void> | void>, opts: unknown, el: HTMLElement) => void;

const QUIET_MS = 220;

const calm: ClientDirective = (load, _opts, el) => {
  const idle = window.requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 1));
  let started = false;
  const io = new IntersectionObserver(
    (entries) => {
      if (started || !entries.some((e) => e.isIntersecting)) return;
      started = true;
      io.disconnect();
      const ready = load();
      let t = 0;
      const go = () => {
        window.removeEventListener('scroll', onScroll);
        idle(() => void ready.then((hydrate) => hydrate()), { timeout: 1500 });
      };
      const onScroll = () => {
        window.clearTimeout(t);
        t = window.setTimeout(go, QUIET_MS);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    },
    { rootMargin: '400px 0px' },
  );
  // The island element is display: contents, so watch what it renders.
  for (const child of Array.from(el.children)) io.observe(child);
  if (!el.children.length) io.observe(el);
};

export default calm;
