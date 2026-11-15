import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { setLite, useLite } from '../../lib/device-tier';
import { scrollToSection } from '../../lib/scroll';
import { openWindow } from '../../lib/windows';
import Clock from './Clock';
import { Icon } from './Icon';
import LiteToggle from './LiteToggle';
import { RESUME_URL } from './nav';

// The phone menu needs GSAP, so it only loads on phones.
const MobileMenu = lazy(() => import('./MobileMenu'));

type Entry = {
  label: string;
  onSelect?: (trigger: HTMLElement | null) => void;
  href?: string;
  checked?: boolean;
  disabled?: boolean;
};

type Menu = { id: string; label: string; entries: Entry[] };

function Brand() {
  return (
    <a
      href="#home"
      className="flex items-center gap-2 text-chrome-4"
      onClick={(e) => {
        e.preventDefault();
        scrollToSection('home');
      }}
    >
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="8" cy="8" r="2" fill="var(--color-accent)" />
      </svg>
      <span>Aryan OS</span>
    </a>
  );
}

export default function MenuBar() {
  const lite = useLite();
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
      entries: [{ label: 'Lite mode', checked: lite, onSelect: () => setLite(!lite) }],
    },
    {
      id: 'work',
      label: 'Work',
      entries: [{ label: 'No projects here yet', disabled: true }],
    },
    {
      id: 'help',
      label: 'Help',
      entries: [{ label: 'About this site', onSelect: (t) => openWindow('about-this-site', t) }],
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
    <div className="flex h-(--menubar-h) items-center justify-between border-b border-hairline bg-desk-2 pr-3 pl-3.5 text-[13px]">
      <Brand />
      <span className="px-1 text-chrome-3">Menu</span>
    </div>
  );

  return (
    <header className="os-menubar fixed inset-x-0 top-0 z-[45] text-xs print:hidden">
      {/* Desktop */}
      <div
        ref={barRef}
        className="hidden h-(--menubar-h) items-center gap-1 border-b border-hairline bg-desk-2 px-3 md:flex"
      >
        <div className="mr-3">
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
                  className="os-menu-trigger h-6 rounded px-2.5 text-chrome-3 aria-expanded:bg-navy aria-expanded:text-chrome-4"
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
                    className="os-menu absolute top-full left-0 mt-1 min-w-52 rounded-md border border-hairline bg-desk-2 p-1 shadow-window"
                    onKeyDown={(e) => onMenuKey(e, menu.id)}
                  >
                    {menu.entries.map((entry) => {
                      const role = entry.checked === undefined ? 'menuitem' : 'menuitemcheckbox';
                      const shared = {
                        role,
                        tabIndex: -1,
                        'aria-checked': entry.checked,
                        'aria-disabled': entry.disabled || undefined,
                        className: 'os-menu-item',
                      } as const;
                      return (
                        <li key={entry.label} role="none">
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
