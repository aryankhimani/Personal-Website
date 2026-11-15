// Window manager state, shared by every island (menu bar, dock, desktop icons, windows).
// A tiny external store: islands are separate React roots, so context can't span them.

import { useSyncExternalStore } from 'react';

export type Point = { x: number; y: number };

export type WindowState = {
  id: string;
  z: number;
  minimized: boolean;
  zoomed: boolean;
  /** Screen point the window grows from (centre of whatever opened it). */
  origin: Point | null;
};

type State = {
  windows: WindowState[];
  focused: string | null;
};

const EMPTY: State = { windows: [], focused: null };

let state: State = EMPTY;
let zCounter = 10;
const listeners = new Set<() => void>();
const openers = new Map<string, HTMLElement>();
let knownIds = new Set<string>();
/** The window id currently reflected in the URL hash by us, if any. */
let hashed: string | null = null;

function set(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

function topVisible(windows: WindowState[], except?: string): string | null {
  const visible = windows.filter((w) => !w.minimized && w.id !== except);
  if (!visible.length) return null;
  return visible.reduce((a, b) => (a.z > b.z ? a : b)).id;
}

function centreOf(el: Element | null | undefined): Point | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width && !r.height) return null;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function pushHash(id: string) {
  if (location.hash === `#${id}`) {
    hashed = id;
    return;
  }
  // Only one history entry is ever a window. Opening a second window replaces it, so the
  // back button always returns to the plain page instead of replaying old windows.
  if (history.state?.aryanOsWindow) {
    history.replaceState({ aryanOsWindow: id }, '', `#${id}`);
  } else {
    history.pushState({ aryanOsWindow: id }, '', `#${id}`);
  }
  hashed = id;
}

function clearHash(id: string) {
  if (hashed !== id) return;
  hashed = null;
  if (history.state?.aryanOsWindow === id) {
    // We added this entry, so going back removes it and keeps history tidy.
    history.back();
  } else {
    history.replaceState(null, '', location.pathname + location.search);
  }
}

export function openWindow(id: string, opener?: HTMLElement | null): void {
  if (opener) openers.set(id, opener);
  const origin = centreOf(opener);
  const existing = state.windows.find((w) => w.id === id);
  zCounter += 1;
  const windows = existing
    ? state.windows.map((w) => (w.id === id ? { ...w, z: zCounter, minimized: false, origin: origin ?? w.origin } : w))
    : [...state.windows, { id, z: zCounter, minimized: false, zoomed: false, origin }];
  set({ windows, focused: id });
  pushHash(id);
}

export function closeWindow(id: string): void {
  if (!state.windows.some((w) => w.id === id)) return;
  const windows = state.windows.filter((w) => w.id !== id);
  set({ windows, focused: state.focused === id ? topVisible(windows) : state.focused });
  clearHash(id);
  restoreFocus(id);
}

export function minimizeWindow(id: string): void {
  const windows = state.windows.map((w) => (w.id === id ? { ...w, minimized: true } : w));
  set({ windows, focused: state.focused === id ? topVisible(windows) : state.focused });
  clearHash(id);
  restoreFocus(id);
}

export function focusWindow(id: string): void {
  const win = state.windows.find((w) => w.id === id);
  if (!win || (state.focused === id && win.z === zCounter)) return;
  zCounter += 1;
  set({
    windows: state.windows.map((w) => (w.id === id ? { ...w, z: zCounter } : w)),
    focused: id,
  });
}

export function toggleZoom(id: string): void {
  set({ ...state, windows: state.windows.map((w) => (w.id === id ? { ...w, zoomed: !w.zoomed } : w)) });
}

/** Where a window should shrink to when it leaves: back to whatever opened it. */
export function exitPoint(id: string): Point | null {
  const opener = openers.get(id);
  return opener?.isConnected ? centreOf(opener) : null;
}

function restoreFocus(id: string) {
  const opener = openers.get(id);
  if (opener?.isConnected) opener.focus({ preventScroll: true });
}

function syncFromHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (knownIds.has(id)) {
    hashed = id;
    const existing = state.windows.find((w) => w.id === id);
    if (!existing || existing.minimized || state.focused !== id) {
      zCounter += 1;
      const windows = existing
        ? state.windows.map((w) => (w.id === id ? { ...w, z: zCounter, minimized: false } : w))
        : [...state.windows, { id, z: zCounter, minimized: false, zoomed: false, origin: null }];
      set({ windows, focused: id });
    }
  } else if (hashed) {
    // Back button left a window's URL: close that window.
    const closing = hashed;
    hashed = null;
    if (state.windows.some((w) => w.id === closing)) {
      const windows = state.windows.filter((w) => w.id !== closing);
      set({ windows, focused: state.focused === closing ? topVisible(windows) : state.focused });
      restoreFocus(closing);
    }
  }
}

let started = false;

/** Tells the store which ids are windows, so URL hashes like #readme can open them. */
export function registerWindowIds(ids: string[]): void {
  knownIds = new Set([...knownIds, ...ids]);
}

/** Called once when the WindowManager mounts: starts listening to the URL. */
export function startWindowManager(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.addEventListener('popstate', syncFromHash);
  window.addEventListener('hashchange', syncFromHash);
  syncFromHash();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useWindows(): State {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}
