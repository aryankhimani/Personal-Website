// The mission tracker: a thin HUD on the right edge. A vertical progress bar with one notch
// per sector (click to jump), and a readout, SECTOR 04/07 · ~/journey · 2023, that shows on
// hover/focus and for a moment after each sector change, so it never sits on top of text.
// The number flips like a split-flap when the sector changes. Hidden on phones (CSS).

import { SECTORS, onSector, still } from './bus';
import { sectorTarget } from './channel';
import { scrollToSection } from '../scroll';

const pad = (n: number) => String(n).padStart(2, '0');

export function initHud(): () => void {
  const n = SECTORS.length;
  const nav = document.createElement('nav');
  nav.className = 'sig-hud';
  nav.setAttribute('aria-label', 'Page progress');
  nav.innerHTML = `
    <p class="sig-hud-read" aria-hidden="true">
      <span class="sig-hud-k">SECTOR</span>
      <span class="sig-hud-num"><b>01</b>/${pad(n)}</span>
      <span class="sig-hud-path">~/</span>
      <span class="sig-hud-year"></span>
    </p>
    <div class="sig-hud-bar"><i class="sig-hud-fill"></i><ol></ol></div>`;
  const list = nav.querySelector('ol')!;
  const buttons = SECTORS.map((s, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sig-hud-notch';
    b.setAttribute('aria-label', `Sector ${pad(i + 1)}: ${s.label}`);
    b.addEventListener('click', () => scrollToSection(sectorTarget(i)));
    li.append(b);
    list.append(li);
    return b;
  });
  document.body.append(nav);

  const num = nav.querySelector<HTMLElement>('.sig-hud-num b')!;
  const path = nav.querySelector<HTMLElement>('.sig-hud-path')!;
  const year = nav.querySelector<HTMLElement>('.sig-hud-year')!;
  const fill = nav.querySelector<HTMLElement>('.sig-hud-fill')!;
  const rail = document.querySelector('[data-journey-rail]');
  let current = 0;
  let hideTimer = 0;
  let raf = 0;

  const place = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    SECTORS.forEach((s, i) => {
      const el = document.getElementById(sectorTarget(i));
      const y = el ? el.getBoundingClientRect().top + scrollY : 0;
      buttons[i].parentElement!.style.top = `${Math.min(100, (y / max) * 100)}%`;
    });
  };

  const frame = () => {
    raf = 0;
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    fill.style.transform = `scaleY(${Math.min(1, scrollY / max).toFixed(4)})`;
    if (SECTORS[current].id === 'journey') year.textContent = rail?.querySelector('[data-active]')?.textContent ?? '';
  };
  const tick = () => {
    if (!raf) raf = requestAnimationFrame(frame);
  };

  const off = onSector(({ index }) => {
    current = index;
    buttons.forEach((b, i) => (i === index ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
    path.textContent = SECTORS[index].path;
    year.textContent = '';
    if (num.textContent !== pad(index + 1)) {
      num.textContent = pad(index + 1);
      if (!still()) {
        num.classList.remove('flap');
        void num.offsetWidth;
        num.classList.add('flap');
      }
    }
    nav.dataset.show = '';
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => delete nav.dataset.show, 1800);
    tick();
  });

  let t = 0;
  const ro = new ResizeObserver(() => {
    window.clearTimeout(t);
    t = window.setTimeout(place, 250);
  });
  ro.observe(document.body);
  window.addEventListener('scroll', tick, { passive: true });
  place();
  tick();

  return () => {
    off();
    ro.disconnect();
    window.removeEventListener('scroll', tick);
    nav.remove();
  };
}
