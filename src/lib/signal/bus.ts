// The one place the scroll "journey" pieces talk to each other. When the visitor crosses
// into a new sector, `sector` fires once, and every piece reacts to the same moment:
//   - the Signal line flickers (line.ts)
//   - the HUD tracker flips to the new number (hud.ts)
//   - the section title locks on (arrive.ts)
//   - the channel click plays, if sound is on (sound.ts)

export type Sector = { id: string; path: string; label: string };

/** Homepage sectors, in page order. Small sections ride along with a neighbour. */
export const SECTORS: Sector[] = [
  { id: 'home', path: '~/', label: 'Home' },
  { id: 'about', path: '~/me.md', label: 'About' },
  { id: 'work', path: '~/work', label: 'Work' },
  { id: 'journey', path: '~/journey', label: 'Journey' },
  { id: 'playground', path: '~/playground.fig', label: 'Playground' },
  { id: 'writing', path: '~/writing', label: 'Writing' },
  { id: 'contact', path: 'new_message.eml', label: 'Contact' },
];

export type SectorEvent = { index: number; prev: number };

const bus = new EventTarget();

export function emitSector(e: SectorEvent): void {
  bus.dispatchEvent(new CustomEvent('sector', { detail: e }));
}

export function onSector(fn: (e: SectorEvent) => void): () => void {
  const h = (ev: Event) => fn((ev as CustomEvent<SectorEvent>).detail);
  bus.addEventListener('sector', h);
  return () => bus.removeEventListener('sector', h);
}

/** True when effects should be still: Lite mode or reduced motion. */
export const still = () =>
  document.documentElement.dataset.lite === 'true' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
