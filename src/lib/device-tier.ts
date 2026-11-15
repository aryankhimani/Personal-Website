// Lite mode state.
//
// The first decision is made by the inline script in Base.astro, before paint, so the
// page never flashes the heavy version. It sets <html data-lite="true|false">, which is
// the single source of truth read here. Lite turns on automatically for reduced motion,
// data saver, low memory, few cores, or missing WebGL; the visitor can override it.

import { useSyncExternalStore } from 'react';
import { writeStored } from './storage';

export const LITE_STORAGE_KEY = 'aryan-os:lite';
const EVENT = 'aryan-os:lite-change';

export function isLite(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.dataset.lite === 'true';
}

export function setLite(on: boolean): void {
  document.documentElement.dataset.lite = String(on);
  writeStored(LITE_STORAGE_KEY, on ? 'on' : 'off');
  window.dispatchEvent(new Event(EVENT));
}

export function onLiteChange(listener: () => void): () => void {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

/** React hook. Renders `false` on the server and during hydration, then the real value. */
export function useLite(): boolean {
  return useSyncExternalStore(onLiteChange, isLite, () => false);
}
