// Shared by the project reader and the folder page: open by growing out of whatever was
// clicked (FLIP), close by shrinking back into it. Phones slide a sheet up; Lite fades.

import { useEffect, type RefObject } from 'react';
import { animate, useMotionValue, usePresence } from 'motion/react';
import { openerRect } from '../../lib/windows';

const EASE = [0.22, 1, 0.36, 1] as const;

export function useGrow(id: string, ref: RefObject<HTMLElement | null>, lite: boolean, mobile: boolean) {
  const [isPresent, safeToRemove] = usePresence();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useMotionValue(1);
  const sy = useMotionValue(1);
  const opacity = useMotionValue(0);
  const veil = useMotionValue(0);

  // Open: start as the thing that was clicked, grow to the full box.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stops: { stop: () => void }[] = [];
    if (lite) {
      stops.push(animate(opacity, 1, { duration: 0.15 }), animate(veil, 1, { duration: 0.15 }));
    } else if (mobile) {
      y.set(window.innerHeight);
      opacity.set(1);
      stops.push(animate(y, 0, { duration: 0.34, ease: EASE }), animate(veil, 1, { duration: 0.3 }));
    } else {
      const from = openerRect(id);
      const to = el.getBoundingClientRect();
      if (from) {
        x.set(from.left + from.width / 2 - (to.left + to.width / 2));
        y.set(from.top + from.height / 2 - (to.top + to.height / 2));
        sx.set(Math.max(0.05, from.width / to.width));
        sy.set(Math.max(0.05, from.height / to.height));
        opacity.set(0.4);
      } else {
        y.set(24);
        sx.set(0.97);
        sy.set(0.97);
      }
      const t = { duration: 0.46, ease: EASE };
      stops.push(
        animate(x, 0, t),
        animate(y, 0, t),
        animate(sx, 1, t),
        animate(sy, 1, t),
        animate(opacity, 1, { duration: 0.2 }),
        animate(veil, 1, { duration: 0.3 }),
      );
    }
    el.focus({ preventScroll: true });
    return () => stops.forEach((s) => s.stop());
    // Once per open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close: shrink back into the opener (or slide down / fade).
  useEffect(() => {
    if (isPresent) return;
    const el = ref.current;
    if (lite || !el) {
      animate(veil, 0, { duration: 0.12 });
      animate(opacity, 0, { duration: 0.12 }).then(safeToRemove);
      return;
    }
    animate(veil, 0, { duration: 0.28 });
    if (mobile) {
      animate(y, window.innerHeight, { duration: 0.26, ease: 'easeIn' }).then(safeToRemove);
      return;
    }
    const to = openerRect(id);
    const box = el.getBoundingClientRect();
    const t = { duration: 0.32, ease: [0.5, 0, 0.75, 0] as const };
    if (to) {
      animate(x, to.left + to.width / 2 - (box.left + box.width / 2), t);
      animate(y, to.top + to.height / 2 - (box.top + box.height / 2), t);
      animate(sx, Math.max(0.05, to.width / box.width), t);
      animate(sy, Math.max(0.05, to.height / box.height), t);
      animate(opacity, 0, { duration: 0.3, ease: 'easeIn' }).then(safeToRemove);
    } else {
      animate(sy, 0.97, t);
      animate(sx, 0.97, t);
      animate(opacity, 0, { duration: 0.2 }).then(safeToRemove);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent]);

  return { x, y, sx, sy, opacity, veil };
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, video[controls], [tabindex]:not([tabindex="-1"])';

/** Keeps Tab inside a modal. */
export function trapTab(e: React.KeyboardEvent, root: HTMLElement | null) {
  if (e.key !== 'Tab' || !root) return;
  const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)];
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (e.shiftKey && (active === first || active === root)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}
