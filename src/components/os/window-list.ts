// Every window that can exist, by id. Kept free of React so the menu bar, dock and desktop
// icons can all refer to windows without pulling in window contents.
//
// Three kinds: the fixed windows below, one Finder window per work folder (#research), and
// one window per project (#okamoto-lab). Projects come from the small JSON index that
// Base.astro puts on every page.

import type { IconName } from './Icon';
import { registerProjectIds, registerWindowIds } from '../../lib/windows';
import { FOLDERS, INDEX_ELEMENT_ID, isFolderId, type IndexEntry } from '../../lib/work';

export type WindowMeta = {
  id: string;
  /** File name shown in the title bar and on the desktop. */
  file: string;
  icon: IconName;
  width: number;
  height: number;
};

export const WINDOWS: WindowMeta[] = [
  { id: 'readme', file: 'readme.md', icon: 'file-text', width: 460, height: 400 },
  { id: 'about-this-site', file: 'about.txt', icon: 'info', width: 520, height: 470 },
];

function readIndex(): IndexEntry[] {
  if (typeof document === 'undefined') return [];
  try {
    return JSON.parse(document.getElementById(INDEX_ELEMENT_ID)?.textContent ?? '[]');
  } catch {
    return [];
  }
}

/** All projects, newest first. Empty while rendering on the server. */
export const WORK_INDEX: IndexEntry[] = readIndex();

export const workEntry = (id: string) => WORK_INDEX.find((p) => p.id === id);

export function windowMeta(id: string): WindowMeta | undefined {
  const fixed = WINDOWS.find((w) => w.id === id);
  if (fixed) return fixed;
  if (isFolderId(id)) return { id, file: `${id}/`, icon: 'folder', width: 560, height: 420 };
  if (workEntry(id)) return { id, file: `${id}.md`, icon: 'file-text', width: 720, height: 720 };
  return undefined;
}

registerWindowIds([...WINDOWS.map((w) => w.id), ...FOLDERS.map((f) => f.id), ...WORK_INDEX.map((p) => p.id)]);
registerProjectIds(WORK_INDEX.map((p) => p.id));
