// The hero's CRT overlay (scanlines + vignette) can be switched off from View → CRT effect.
// <html data-crt="off"> hides it; the choice is remembered.
import { useSyncExternalStore } from 'react';
import { readStored, writeStored } from './storage';

const KEY = 'aryan-os:crt';
const EVENT = 'aryan-os:crt-change';

export const crtOn = () => typeof document !== 'undefined' && document.documentElement.dataset.crt !== 'off';

export function setCrt(on: boolean): void {
  document.documentElement.dataset.crt = on ? 'on' : 'off';
  writeStored(KEY, on ? 'on' : 'off');
  window.dispatchEvent(new Event(EVENT));
}

export function initCrt(): void {
  if (readStored(KEY) === 'off') document.documentElement.dataset.crt = 'off';
}

export function useCrt(): boolean {
  return useSyncExternalStore(
    (l) => (window.addEventListener(EVENT, l), () => window.removeEventListener(EVENT, l)),
    crtOn,
    () => true,
  );
}
