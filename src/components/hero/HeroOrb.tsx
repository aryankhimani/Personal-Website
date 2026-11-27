// The orb behind the liquid-metal AK (hero 1): navy glass with a cream rim light, a faint
// ember glow inside, a caustic shimmer on the rim and a ring of dust. All CSS (see
// .hero-orb in hero.css), so it costs no canvas; the metal AK stays the only WebGL context.
// Inspired by the orb at the top of motion.dev; built from scratch.
//
// The pointer tilts it gently: the body leans a few px towards the cursor and the highlight
// slides the other way, like light on curved glass. Updated once a frame, only while moving.

import { useEffect, useRef, type RefObject } from 'react';

type Props = { area: RefObject<HTMLElement | null>; live: boolean };

export default function HeroOrb({ area, live }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = area.current;
    const orb = ref.current;
    if (!live || !host || !orb || matchMedia('(pointer: coarse)').matches) return;
    let raf = 0;
    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    const tick = () => {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      orb.style.setProperty('--ox', x.toFixed(3));
      orb.style.setProperty('--oy', y.toFixed(3));
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.002 ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => {
      const r = orb.getBoundingClientRect();
      // -1..1 from the orb's centre, clamped so far-away pointers don't over-tilt.
      tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / r.width));
      ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / r.height));
      kick();
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
      kick();
    };
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerleave', onLeave);
    return () => {
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, [area, live]);

  return (
    <div ref={ref} className="hero-orb" data-live={live ? '' : undefined} aria-hidden="true">
      <i className="hero-orb-dust" />
      <div className="hero-orb-body">
        <i className="hero-orb-glow" />
        <i className="hero-orb-caustic" />
        <i className="hero-orb-spec" />
      </div>
    </div>
  );
}
