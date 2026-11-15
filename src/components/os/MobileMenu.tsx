import { useLite } from '../../lib/device-tier';
import { lockScroll, scrollToSection, unlockScroll } from '../../lib/scroll';
import { openWindow } from '../../lib/windows';
import StaggeredMenu, { type StaggeredMenuItem } from '../rb/StaggeredMenu';
import Clock from './Clock';
import LiteToggle from './LiteToggle';
import { RESUME_URL, SECTIONS } from './nav';

/** Phone menu bar: logo, a menu button, and a slide-in panel (React Bits' Staggered Menu). */
export default function MobileMenu({ brand }: { brand: React.ReactNode }) {
  const lite = useLite();

  const items: StaggeredMenuItem[] = [
    ...SECTIONS.map((s) => ({
      label: s.label,
      ariaLabel: `Go to ${s.label}`,
      link: `#${s.id}`,
      onSelect: () => scrollToSection(s.id),
    })),
    { label: 'Resume.pdf', ariaLabel: 'Resume.pdf (opens in a new tab)', link: RESUME_URL, external: true },
    {
      label: 'About this site',
      ariaLabel: 'About this site',
      link: '#about-this-site',
      onSelect: () => openWindow('about-this-site'),
    },
  ];

  return (
    <StaggeredMenu
      isFixed
      position="right"
      items={items}
      colors={['#1a2b55', '#ff4a2b']}
      displaySocials={false}
      displayItemNumbering={false}
      menuButtonColor="#d4d4d8"
      openMenuButtonColor="#d4d4d8"
      changeMenuColorOnOpen={false}
      accentColor="#ff4a2b"
      still={lite}
      logo={brand}
      onMenuOpen={lockScroll}
      onMenuClose={unlockScroll}
      footer={
        <div className="flex flex-col gap-4 border-t border-black/15 pt-5 text-sm">
          <LiteToggle className="os-switch-on-cream self-start" />
          <Clock className="os-clock-on-cream flex-wrap text-xs" />
        </div>
      }
    />
  );
}
