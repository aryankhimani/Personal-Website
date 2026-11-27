// Which hero is showing. Shared by the hero itself, the menu bar and the H key.

import { useSyncExternalStore } from 'react';
import { readStored, writeStored } from './storage';

export const HEROES = [
  { id: 'liquid-metal', label: 'Liquid metal' },
  { id: 'orbits', label: 'Orbits' },
  { id: 'ascii', label: 'ASCII' },
  { id: 'astral', label: 'Astral' },
  { id: 'terminal', label: 'Terminal' },
] as const;

export type HeroId = (typeof HEROES)[number]['id'];

const KEY = 'aryan-os:hero';
const DEFAULT: HeroId = 'liquid-metal';
const listeners = new Set<() => void>();
let current: HeroId | null = null;

const isHero = (v: string | null): v is HeroId => HEROES.some((h) => h.id === v);

export function getHero(): HeroId {
  if (current) return current;
  // A ?hero= link wins over the saved choice, so a specific hero can be shared.
  const fromUrl = new URLSearchParams(location.search).get('hero');
  const saved = readStored(KEY);
  current = isHero(fromUrl) ? fromUrl : isHero(saved) ? saved : DEFAULT;
  return current;
}

export function setHero(id: HeroId): void {
  current = id;
  writeStored(KEY, id);
  listeners.forEach((l) => l());
}

export function nextHero(): void {
  const i = HEROES.findIndex((h) => h.id === getHero());
  setHero(HEROES[(i + 1) % HEROES.length].id);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Renders the default hero on the server and during hydration, then the chosen one. */
export function useHero(): HeroId {
  return useSyncExternalStore(subscribe, getHero, () => DEFAULT);
}
