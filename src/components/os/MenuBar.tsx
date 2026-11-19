import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { setLite, useLite } from '../../lib/device-tier';
import { HEROES, setHero, useHero } from '../../lib/hero';
import { setCrt, useCrt } from '../../lib/crt';
import { scrollToSection } from '../../lib/scroll';
import { openWindow } from '../../lib/windows';
import Clock from './Clock';
import SysTray from './SysTray';
import { Icon } from './Icon';
import LiteToggle from './LiteToggle';
import { RESUME_URL } from './nav';
import { WORK_INDEX } from './window-list';
import { FOLDERS } from '../../lib/work';

// The phone menu needs GSAP, so it only loads on phones.
const MobileMenu = lazy(() => import('./MobileMenu'));

type Entry = {
  label: string;
  onSelect?: (trigger: HTMLElement | null) => void;
  href?: string;
  checked?: boolean;
  /** One of a group where exactly one is checked. */
  radio?: boolean;
  disabled?: boolean;
  /** Draw a line above this entry. */
  divider?: boolean;
};

type Menu = { id: string; label: string; entries: Entry[] };

// Aryan's AK mark (same paths as public/logo.svg).
const AK_PATH =
  'M112 44h28v152h-28zM18 196 98 44h28L48 196zM76 140h36v22H66zM140 110l48-66h36l-56 76 58 76h-36l-38-50-12 16z';

function Brand() {
  // Brand renders twice (desktop + phone bar), so each copy needs its own gradient id.
  const grad = `ak-chrome-${useId().replace(/:/g, '')}`;
  return (
    <a
      href="#home"
      className="os-brand"
      onClick={(e) => {
        e.preventDefault();
        scrollToSection('home');
      }}
    >
      <span className="os-brand-mark" aria-hidden="true">
        <svg viewBox="0 0 240 240">
          <defs>
            <linearGradient id={grad} x1="0" y1="0" x2="0.35" y2="1">
              <stop offset="0" stopColor="#fbf7ef" />
              <stop offset="0.45" stopColor="#c9c3b6" />
              <stop offset="0.55" stopColor="#8d8a84" />
              <stop offset="1" stopColor="#efe8da" />
            </linearGradient>
          </defs>
          <path fill={`url(#${grad})`} d={AK_PATH} />
        </svg>
      </span>
      <span className="os-brand-name">Aryan OS</span>
    </a>
  );
}

export default function MenuBar() {
  const lite = useLite();
  const hero = useHero();
  const crt = useCrt();
  const [open, setOpen] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  const menus: Menu[] = [
    {
      id: 'file',
      label: 'File',
      entries: [
        { label: 'Open readme.md', onSelect: (t) => openWindow('readme', t) },
        { label: 'Open Resume.pdf', href: RESUME_URL },
      ],
    },
    {
      id: 'view',
      label: 'View',
      entries: [
        ...HEROES.map((h) => ({
          label: `Hero: ${h.label}`,
          checked: hero === h.id,
          radio: true,
          onSelect: () => setHero(h.id),
        })),
        { label: 'CRT effect', checked: crt, divider: true, onSelect: () => setCrt(!crt) },
        { label: 'Lite mode', checked: lite, onSelect: () => setLite(!lite) },
      ],
    },
    {
      id: 'work',
      label: 'Work',
      entries: [
        ...FOLDERS.map((f) => ({ label: `${f.id}/`, onSelect: (t: HTMLElement | null) => openWindow(f.id, t) })),
        ...WORK_INDEX.filter((p) => p.featured)
          .sort((a, b) => (a.featured ?? 0) - (b.featured ?? 0))
          .map((p, i) => ({ label: p.title, divider: i === 0, onSelect: (t: HTMLElement | null) => openWindow(p.id, t) })),
      ],
    },
    {
      id: 'help',
      label: 'Help',
      entries: [
        { label: 'About Aryan OS', onSelect: (t) => openWindow('about-this-site', t) },
        { label: 'Read me', onSelect: (t) => openWindow('readme', t) },
      ],
    },
  ];

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Clicking anywhere else closes the open menu.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const trigger = (id: string) => barRef.current?.querySelector<HTMLElement>(`[data-menu-trigger="${id}"]`) ?? null;
  const itemsOf = (id: string) => [
    ...(barRef.current?.querySelectorAll<HTMLElement>(`[data-menu="${id}"] [role^="menuitem"]:not([aria-disabled])`) ?? []),
  ];

  function openMenu(id: string, focus: 'first' | 'last' | 'none' = 'none') {
    setOpen(id);
    if (focus === 'none') return;
    requestAnimationFrame(() => {
      const items = itemsOf(id);
      (focus === 'first' ? items[0] : items[items.length - 1])?.focus();
    });
  }

  function step(from: string, dir: 1 | -1) {
    const i = menus.findIndex((m) => m.id === from);
    const next = menus[(i + dir + menus.length) % menus.length].id;
    openMenu(next, 'first');
  }

  function onTriggerKey(e: React.KeyboardEvent, id: string) {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openMenu(id, 'first');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      openMenu(id, 'last');
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const i = menus.findIndex((m) => m.id === id);
      const next = menus[(i + (e.key === 'ArrowRight' ? 1 : -1) + menus.length) % menus.length].id;
      trigger(next)?.focus();
      if (open) setOpen(next);
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      setOpen(null);
    }
  }

  function onMenuKey(e: React.KeyboardEvent, id: string) {
    const items = itemsOf(id);
    const i = items.indexOf(document.activeElement as HTMLElement);
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        items[(i + 1) % items.length]?.focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        items[(i - 1 + items.length) % items.length]?.focus();
        break;
      case 'Home':
        e.preventDefault();
        items[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        items[items.length - 1]?.focus();
        break;
      case 'ArrowRight':
        e.preventDefault();
        step(id, 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        step(id, -1);
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(null);
        trigger(id)?.focus();
        break;
      case 'Tab':
        setOpen(null);
        break;
    }
  }

  function choose(entry: Entry, id: string) {
    if (entry.disabled) return;
    const t = trigger(id);
    setOpen(null);
    entry.onSelect?.(t);
  }

  const mobileBar = (
    <div className="os-bar flex h-(--menubar-h) items-center justify-between glass pr-3 pl-3.5 text-[13px]">
      <Brand />
      <span className="px-1 text-chrome-3">Menu</span>
    </div>
  );

  return (
    <header className="os-menubar fixed inset-x-0 top-0 z-[45] text-xs print:hidden">
      {/* Desktop */}
      <div
        ref={barRef}
        className="os-bar hidden h-(--menubar-h) items-center gap-1 glass px-3 md:flex"
      >
        <div className="mr-4">
          <Brand />
        </div>
        <nav aria-label="Menu bar">
          <ul role="menubar" className="flex items-center">
            {menus.map((menu) => (
              <li key={menu.id} role="none" className="relative">
                <button
                  type="button"
                  role="menuitem"
                  aria-haspopup="menu"
                  aria-expanded={open === menu.id}
                  data-menu-trigger={menu.id}
                  className="os-menu-trigger"
                  onClick={() => (open === menu.id ? setOpen(null) : openMenu(menu.id))}
                  onPointerEnter={() => open && open !== menu.id && setOpen(menu.id)}
                  onKeyDown={(e) => onTriggerKey(e, menu.id)}
                >
                  {menu.label}
                </button>
                {open === menu.id && (
                  <ul
                    role="menu"
                    aria-label={menu.label}
                    data-menu={menu.id}
                    className="os-menu absolute top-full left-0 mt-1 min-w-52 os-menu-glass rounded-lg p-1"
                    onKeyDown={(e) => onMenuKey(e, menu.id)}
                  >
                    {menu.entries.map((entry) => {
                      const role = entry.radio ? 'menuitemradio' : entry.checked === undefined ? 'menuitem' : 'menuitemcheckbox';
                      const shared = {
                        role,
                        tabIndex: -1,
                        'aria-checked': entry.checked,
                        'aria-disabled': entry.disabled || undefined,
                        className: 'os-menu-item',
                      } as const;
                      return (
                        <li key={entry.label} role="none" className={entry.divider ? 'os-menu-divider' : undefined}>
                          {entry.href ? (
                            <a
                              {...shared}
                              href={entry.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => setOpen(null)}
                            >
                              <span className="w-4" />
                              <span className="flex-1">{entry.label}</span>
                              <Icon name="external-link" className="text-sm opacity-70" />
                              <span className="sr-only">(opens in a new tab)</span>
                            </a>
                          ) : (
                            <button {...shared} type="button" onClick={() => choose(entry, menu.id)}>
                              <span className="w-4">{entry.checked ? <Icon name="check" className="text-sm" /> : null}</span>
                              <span className="flex-1 text-left">{entry.label}</span>
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-5">
          <SysTray />
          <Clock className="text-chrome-3" />
          <LiteToggle />
        </div>
      </div>

      {/* Phone */}
      <div className="md:hidden">
        {mobile ? (
          <Suspense fallback={mobileBar}>
            <MobileMenu brand={<Brand />} />
          </Suspense>
        ) : (
          mobileBar
        )}
      </div>
    </header>
  );
}
