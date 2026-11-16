// A round piece of "liquid glass" that follows the cursor over the hero and bends what's
// behind it. It's an SVG displacement filter used as a backdrop-filter, with the red, green
// and blue channels displaced by slightly different amounts for a chromatic edge. No WebGL.
//
// backdrop-filter: url() only works in Chromium browsers; elsewhere the lens is a frosted
// disc with the same highlights. Hidden on touch screens, in Lite mode and with reduced motion.

import { useEffect, useRef, useState } from 'react';

const SIZE = 168;
const STRENGTH = 36;

/** A normal map for a convex lens: no bend in the middle, most bend at the rim. */
function lensMap(size: number): string {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const img = g.createImageData(size, size);
  const R = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5 - R) / R;
      const dy = (y + 0.5 - R) / R;
      const r = Math.hypot(dx, dy);
      const i = (y * size + x) * 4;
      let ox = 0;
      let oy = 0;
      if (r < 1 && r > 0) {
        const k = Math.pow(r, 2.6); // flat centre, steep rim
        ox = (-dx / r) * k;
        oy = (-dy / r) * k;
      }
      img.data[i] = 128 + ox * 127;
      img.data[i + 1] = 128 + oy * 127;
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL();
}

const chromium = () =>
  typeof navigator !== 'undefined' &&
  ((navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } }).userAgentData?.brands.some((b) =>
    /Chromium/.test(b.brand),
  ) ??
    /Chrome\//.test(navigator.userAgent));

export default function GlassLens({ area }: { area: React.RefObject<HTMLElement | null> }) {
  const lens = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<string | null>(null);
  const [refracts] = useState(chromium);

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    setMap(lensMap(SIZE));
  }, []);

  useEffect(() => {
    const el = lens.current;
    const host = area.current;
    if (!map || !el || !host) return;
    const pos = { x: 0, y: 0, tx: 0, ty: 0 };
    let raf = 0;
    let shown = false;

    const tick = () => {
      raf = 0;
      pos.x += (pos.tx - pos.x) * 0.22;
      pos.y += (pos.ty - pos.y) * 0.22;
      el.style.transform = `translate3d(${pos.x - SIZE / 2}px, ${pos.y - SIZE / 2}px, 0)`;
      if (Math.abs(pos.tx - pos.x) > 0.2 || Math.abs(pos.ty - pos.y) > 0.2) raf = requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const r = host.getBoundingClientRect();
      pos.tx = e.clientX - r.left;
      pos.ty = e.clientY - r.top;
      // Step aside over links and buttons so the glass never hides what you're clicking.
      const overControl = !!(e.target as Element).closest('a, button');
      if (!shown) {
        pos.x = pos.tx;
        pos.y = pos.ty;
        shown = true;
      }
      el.dataset.on = overControl ? 'dim' : 'on';
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onLeave = () => {
      shown = false;
      delete el.dataset.on;
    };
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
    };
  }, [map, area]);

  if (!map) return null;

  const channel = (scale: number, keep: string, result: string) => (
    <>
      <feDisplacementMap in="SourceGraphic" in2="map" scale={scale} xChannelSelector="R" yChannelSelector="G" result={`${result}d`} />
      <feColorMatrix in={`${result}d`} type="matrix" values={keep} result={result} />
    </>
  );

  return (
    <>
      <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
        <filter id="glass-lens" x="0" y="0" width={SIZE} height={SIZE} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feImage href={map} x="0" y="0" width={SIZE} height={SIZE} result="map" preserveAspectRatio="none" />
          {channel(STRENGTH, '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0', 'r')}
          {channel(STRENGTH * 0.9, '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0', 'g')}
          {channel(STRENGTH * 0.8, '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0', 'b')}
          <feBlend in="r" in2="g" mode="screen" result="rg" />
          <feBlend in="rg" in2="b" mode="screen" />
        </filter>
      </svg>
      <div ref={lens} className={`glass-lens${refracts ? ' glass-lens-refract' : ''}`} aria-hidden="true" />
    </>
  );
}
