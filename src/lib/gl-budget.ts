// "One WebGL canvas at a time" for the section effects. Each gated effect registers its box;
// whichever one covers the most of the screen gets to run, the rest show their still
// fallback (and free their WebGL context). The hero isn't gated: it's alone at the top and
// pauses itself off-screen.

type Entry = { el: Element; area: number; notify: () => void; priority: boolean };

const entries = new Set<Entry>();
let winner: Entry | null = null;
let io: IntersectionObserver | null = null;
const byEl = new Map<Element, Entry>();

function pick() {
  let best: Entry | null = null;
  // A priority entry (the reader, which sits on top of everything) wins whenever it's open.
  for (const e of entries) if (e.priority && e.area > 0) best = e;
  if (best) {
    if (best === winner) return;
    const old = winner;
    winner = best;
    old?.notify();
    best.notify();
    return;
  }
  for (const e of entries) if (e.area > 0 && (!best || e.area > best.area)) best = e;
  // Hysteresis: keep the current one unless the new one is clearly bigger.
  if (winner && best && best !== winner && winner.area > 0 && best.area < winner.area * 1.25) return;
  if (best === winner) return;
  const old = winner;
  winner = best;
  old?.notify();
  best?.notify();
}

function observer() {
  io ??= new IntersectionObserver(
    (list) => {
      for (const r of list) {
        const e = byEl.get(r.target);
        if (e) e.area = r.isIntersecting ? r.intersectionRect.width * r.intersectionRect.height : 0;
      }
      pick();
    },
    { threshold: Array.from({ length: 11 }, (_, i) => i / 10) },
  );
  return io;
}

export function joinGlBudget(
  el: Element,
  notify: () => void,
  priority = false,
): { active: () => boolean; leave: () => void } {
  const entry: Entry = { el, area: 0, notify, priority };
  entries.add(entry);
  byEl.set(el, entry);
  observer().observe(el);
  return {
    active: () => winner === entry,
    leave: () => {
      entries.delete(entry);
      byEl.delete(el);
      io?.unobserve(el);
      if (winner === entry) {
        winner = null;
        pick();
      }
    },
  };
}
