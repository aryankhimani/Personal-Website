// Every window that can exist, by id. Kept free of React so the menu bar, dock and desktop
// icons can all refer to windows without pulling in window contents.

import type { IconName } from './Icon';
import { registerWindowIds } from '../../lib/windows';

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

export const windowMeta = (id: string) => WINDOWS.find((w) => w.id === id);

registerWindowIds(WINDOWS.map((w) => w.id));
