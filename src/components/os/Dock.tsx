import { useEffect, useState } from 'react';
import { useLite } from '../../lib/device-tier';
import { scrollToSection } from '../../lib/scroll';
import { openWindow, useWindows } from '../../lib/windows';
import RbDock, { type DockItemData } from '../rb/Dock';
import { Icon } from './Icon';
import { RESUME_URL, SECTIONS } from './nav';
import { windowMeta } from './window-list';

// React Bits' Dock, re-skinned with the site tokens.
const SKIN = {
  '--dock-panel': 'rgba(26, 27, 31, 0.86)',
  '--dock-panel-edge': 'rgba(255, 255, 255, 0.09)',
  '--dock-panel-highlight': 'rgba(255, 255, 255, 0.06)',
  '--dock-panel-shadow': '0 1px 2px rgba(0, 0, 0, 0.4), 0 18px 36px -16px rgba(0, 0, 0, 0.7)',
  '--dock-tile': 'linear-gradient(180deg, #2b2c33 0%, #1d1e23 100%)',
  '--dock-tile-edge': 'rgba(255, 255, 255, 0.08)',
  '--dock-tile-highlight': 'rgba(255, 255, 255, 0.1)',
  '--dock-tile-shadow': '0 3px 8px -4px rgba(0, 0, 0, 0.7)',
  '--dock-ink': '#ece7dc',
  '--dock-label': '#ece7dc',
  '--dock-label-ink': '#16171a',
  '--dock-dot': '#ff4a2b',
  '--dock-separator': 'rgba(255, 255, 255, 0.14)',
} as React.CSSProperties;

export default function Dock() {
  const lite = useLite();
  const { windows } = useWindows();
  const [mobile, setMobile] = useState(false);
  const [active, setActive] = useState('home');

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
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
    <nav aria-label="Sections" className="os-dock pointer-events-none fixed inset-x-0 bottom-0 z-40 h-24 print:hidden">
      <RbDock
        items={items}
        className="pointer-events-auto"
        baseItemSize={base}
        magnification={still ? base : 62}
        panelHeight={base + 14}
        gap={mobile ? 6 : 8}
        roundness={0.36}
        bounce={!still}
        accentColor="#ff4a2b"
        style={SKIN}
      />
    </nav>
  );
}
