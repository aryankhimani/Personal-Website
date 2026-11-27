import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useLite } from '../../lib/device-tier';
import { HEROES, nextHero, useHero, type HeroId } from '../../lib/hero';
import { scrollToSection } from '../../lib/scroll';
import { Icon } from '../os/Icon';
import { RESUME_URL } from '../os/nav';
import HeroOrb from './HeroOrb';
import { GITHUB_URL, LINKEDIN_URL } from './links';

const NAME = 'Aryan Khimani';

// Each visual is its own chunk and only downloads when its hero is chosen.
const VISUALS: Record<HeroId, React.LazyExoticComponent<() => React.ReactNode>> = {
  'liquid-metal': lazy(() => import('./visuals/LiquidMetalVisual')),
  ascii: lazy(() => import('./visuals/AsciiVisual')),
  terminal: lazy(() => import('./visuals/TerminalVisual')),
  astral: lazy(() => import('./visuals/AstralVisual')),
  orbits: lazy(() => import('./visuals/OrbitsVisual')),
};

const GlassLens = lazy(() => import('./GlassLens'));

const loadMotion = () => import('./HeroMotion');
const Name = lazy(() => loadMotion().then((m) => ({ default: m.Name })));
const Roles = lazy(() => loadMotion().then((m) => ({ default: m.Roles })));

export default function Hero() {
  const hero = useHero();
  const lite = useLite();
  const ref = useRef<HTMLDivElement>(null);
  // Animated extras wait until the browser is idle, so text paints first.
  const [settled, setSettled] = useState(false);

  // The hero's canvas also waits for the boot screen to finish, so only one WebGL context
  // (the boot logo's) runs at a time.
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 600));
    const go = () => idle(() => setSettled(true));
    if (!document.documentElement.dataset.boot) {
      go();
      return;
    }
    window.addEventListener('aryan-os:boot-done', go, { once: true });
    return () => window.removeEventListener('aryan-os:boot-done', go);
  }, []);

  // H switches hero, unless the visitor is typing somewhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'h' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;
      nextHero();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const animated = settled && !lite;
  const Visual = VISUALS[hero];
  const index = HEROES.findIndex((h) => h.id === hero);
  const staticName = <span className="hero-name-static">{NAME}</span>;

  return (
    <div ref={ref} className="hero" data-hero={hero}>
      <div className="hero-visual" data-hero-visual aria-hidden="true">
        {hero === 'liquid-metal' && <HeroOrb area={ref} live={animated} />}
        {lite ? (
          <img key={hero} src={`/hero/${hero}.webp`} alt="" decoding="async" />
        ) : (
          settled && (
            <Suspense fallback={null}>
              <Visual key={hero} />
            </Suspense>
          )
        )}
      </div>

      <div className="hero-copy">
        <h1 className="hero-name">
          {animated ? (
            <Suspense fallback={staticName}>
              <Name label={NAME} area={ref} />
            </Suspense>
          ) : (
            staticName
          )}
        </h1>

        {animated ? (
          <p className="hero-line">
            I{' '}
            <Suspense fallback={<span>build AI tools and ship them</span>}>
              <Roles />
            </Suspense>
          </p>
        ) : (
          <p className="hero-line">I build AI tools and ship them.</p>
        )}

        {/* TODO: confirm roles and term. */}
        <p className="hero-sub">CS + Ivey HBA at Western University. Looking for Summer 2027 internships in software and AI.</p>

        <div className="hero-actions">
          <a
            href="#work"
            className="hero-cta"
            onPointerMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
              e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
            }}
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('work');
            }}
          >
            Open my work
          </a>
          <a href={RESUME_URL} target="_blank" rel="noopener noreferrer" className="hero-link">
            resume.pdf
            <Icon name="external-link" className="text-base" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
          <span className="hero-socials">
            <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn (opens in a new tab)">
              <Icon name="linkedin" />
            </a>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" aria-label="GitHub (opens in a new tab)">
              <Icon name="github" />
            </a>
          </span>
        </div>
      </div>

      {animated && hero === 'liquid-metal' && (
        <Suspense fallback={null}>
          <GlassLens area={ref} />
        </Suspense>
      )}

      <button
        type="button"
        className="hero-switch"
        onClick={nextHero}
        aria-label={`Switch hero. Showing ${HEROES[index].label}, ${index + 1} of ${HEROES.length}`}
        title="Switch hero (H)"
      >
        <span>
          hero {index + 1}/{HEROES.length}
        </span>
        <Icon name="reload" className="text-sm" />
      </button>
    </div>
  );
}
