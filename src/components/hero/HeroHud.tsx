// The text half of the Astral / Orbits HUD: a label, live readouts that follow the pointer
// (and name the star the canvas reticle has locked on to), and a small glass status panel.
// Real text, so it stays crisp; it only updates on pointer moves, at most once a frame.

import { useEffect, useRef, useState } from 'react';
import { hudState } from './hud';

type Props = { sector: string; title: string; units: [string, string] };

const fmt = (n: number) => (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(3);

export default function HeroHud({ sector, title, units }: Props) {
  const xy = useRef<HTMLSpanElement>(null);
  const ang = useRef<HTMLSpanElement>(null);
  const trk = useRef<HTMLSpanElement>(null);
  const [projects, setProjects] = useState<string | null>(null);

  useEffect(() => {
    setProjects(document.getElementById('boot-log')?.dataset.projects ?? null);
    const hero = document.querySelector<HTMLElement>('.hero');
    if (!hero) return;
    let raf = 0;
    let ex = 0;
    let ey = 0;
    const paint = () => {
      raf = 0;
      if (xy.current) xy.current.textContent = `X ${fmt(ex)}  Y ${fmt(-ey)}`;
      if (ang.current)
        ang.current.textContent = `${units[0]} ${((ex + 1) * 180).toFixed(1)}°  ${units[1]} ${(-ey * 90).toFixed(1)}°`;
      if (trk.current)
        trk.current.textContent = hudState.lock >= 0 ? `TRK STAR ${String(hudState.lock).padStart(4, '0')}` : 'TRK ——';
      if (trk.current) trk.current.dataset.on = hudState.lock >= 0 ? 'on' : '';
    };
    const onMove = (e: PointerEvent) => {
      const r = hero.getBoundingClientRect();
      ex = ((e.clientX - r.left) / r.width) * 2 - 1;
      ey = ((e.clientY - r.top) / r.height) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const onLeave = () => {
      ex = ey = 0;
      hudState.lock = -1;
      if (!raf) raf = requestAnimationFrame(paint);
    };
    hero.addEventListener('pointermove', onMove);
    hero.addEventListener('pointerleave', onLeave);
    paint();
    return () => {
      cancelAnimationFrame(raf);
      hero.removeEventListener('pointermove', onMove);
      hero.removeEventListener('pointerleave', onLeave);
    };
  }, [units]);

  return (
    <div className="hud" aria-hidden="true">
      <div className="hud-title">
        <span className="hud-dim">AK/OS</span> {title}
      </div>
      <div className="hud-read">
        <span ref={xy} />
        <span ref={ang} />
        <span ref={trk} className="hud-trk" />
      </div>
      <div className="hud-ruler" />
      <div className="hud-panel">
        <span>SECTOR {sector}</span>
        <span className="hud-sep">·</span>
        <span>{projects ?? '—'} PROJECTS</span>
        <span className="hud-sep">·</span>
        <span>
          SIGNAL <span className="hud-ok">OK</span>
        </span>
      </div>
    </div>
  );
}
