import { useEffect, useRef, useState } from 'react';
import { useLite } from '../../lib/device-tier';
import { pageHeight, scrollPos, scrollToSection, viewHeight } from '../../lib/scroll';
import { openWindow, useWindows } from '../../lib/windows';
import RbDock, { type DockItemData } from '../rb/Dock';
import { Icon } from './Icon';
import { RESUME_URL, SECTIONS } from './nav';
import { windowMeta } from './window-list';
import { cream, ember, navy } from '../../lib/palette';

// React Bits' Dock, re-skinned with the site tokens.
const SKIN = {
  // Liquid glass: a thin tinted pane, bright top edge, faint rim (see .glass in colour.css).
  '--dock-panel': 'linear-gradient(180deg, rgba(242, 235, 221, 0.12), rgba(242, 235, 221, 0.02) 45%), rgba(22, 34, 74, 0.45)',
  '--dock-panel-edge': 'rgba(255, 255, 255, 0.1)',
  '--dock-panel-highlight': 'rgba(255, 255, 255, 0.26)',
  '--dock-panel-shadow': '0 1px 2px rgba(5, 9, 26, 0.4), 0 18px 36px -16px rgba(5, 9, 26, 0.75)',
  '--dock-tile': `linear-gradient(180deg, ${navy['800']} 0%, ${navy['900']} 100%)`,
  '--dock-tile-edge': 'rgba(255, 255, 255, 0.08)',
  '--dock-tile-highlight': 'rgba(255, 255, 255, 0.14)',
  '--dock-tile-shadow': '0 3px 8px -4px rgba(5, 9, 26, 0.7)',
  '--dock-ink': cream['100'],
  '--dock-label': cream['100'],
  '--dock-label-ink': navy['950'],
  '--dock-dot': ember['500'],
  '--dock-separator': 'rgba(242, 235, 221, 0.16)',
} as React.CSSProperties;

export default function Dock() {
  const lite = useLite();
  const { windows } = useWindows();
  const [mobile, setMobile] = useState(false);
  const [active, setActive] = useState('home');
  // Hide/show is a plain attribute on the <nav> (CSS animates it), not React state: a state
  // change re-rendered the whole magnifying dock on every scroll-direction flip.
  const navRef = useRef<HTMLElement>(null);
  const showDock = useRef<() => void>(() => undefined);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Auto-hide: slide away while scrolling down, come back on scroll-up, when the mouse
  // nears the bottom edge, or near the end of the page.
  useEffect(() => {
    let lastY = scrollPos();
    let nearEdge = false;
    let raf = 0;
    let hid = false;
    const set = (h: boolean) => {
      if (h === hid) return;
      hid = h;
      navRef.current?.toggleAttribute('data-hidden', h);
    };
    showDock.current = () => set(false);
    const update = () => {
      raf = 0;
      // No layout reads here: window.scrollY / scrollHeight in a scroll frame forced a layout.
      const y = scrollPos();
      const atEnd = y + viewHeight() >= pageHeight() - 80;
      if (y < 120 || atEnd || nearEdge) set(false);
      else if (y > lastY + 4) set(true);
      else if (y < lastY - 4) set(false);
      if (Math.abs(y - lastY) > 4) lastY = y;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const near = e.clientY > window.innerHeight - 96;
      if (near !== nearEdge) {
        nearEdge = near;
        if (near) set(false);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Mark the section currently on screen.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const items: DockItemData[] = [
    ...SECTIONS.map((s) => ({
      label: s.label,
      icon: <Icon name={s.icon} />,
      active: active === s.id,
      onClick: () => scrollToSection(s.id),
    })),
    { separator: true },
    {
      label: 'Resume.pdf (opens in a new tab)',
      icon: <Icon name="file-text" />,
      onClick: () => window.open(RESUME_URL, '_blank', 'noopener,noreferrer'),
    },
  ];

  // Minimized windows wait in the dock.
  const minimized = windows.filter((w) => w.minimized);
  if (minimized.length) {
    items.push({ separator: true });
    for (const w of minimized) {
      const meta = windowMeta(w.id);
      if (!meta) continue;
      items.push({
        label: `Restore ${meta.file}`,
        icon: <Icon name={meta.icon} />,
        className: 'os-dock-minimized',
        onClick: () => openWindow(w.id, document.querySelector<HTMLElement>('.os-dock-minimized')),
      });
    }
  }

  const base = mobile ? 40 : 44;
  const still = lite || mobile;

  return (
    <nav
      ref={navRef}
      aria-label="Sections"
      onFocus={() => showDock.current()}
      className="os-dock pointer-events-none fixed inset-x-0 bottom-0 z-40 h-24 print:hidden"
    >
      <RbDock
        items={items}
        className="pointer-events-auto"
        baseItemSize={base}
        magnification={still ? base : 62}
        panelHeight={base + 14}
        gap={mobile ? 6 : 8}
        roundness={0.36}
        bounce={!still}
        accentColor={ember['500']}
        style={SKIN}
      />
    </nav>
  );
}
