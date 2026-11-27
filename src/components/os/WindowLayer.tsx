// The part of the window manager that needs Motion. Loaded on demand (see WindowManager)
// so the animation library stays out of the first page load.

import { AnimatePresence } from 'motion/react';
import type { WindowState } from '../../lib/windows';
import FolderPage from '../work/FolderPage';
import Reader from '../work/Reader';
import WorkWindow from '../work/WorkWindows';
import { isFolderPage, isProject } from '../../lib/windows';
import { isFolderId } from '../../lib/work';
import Window, { type Bounds } from './Window';
import { WINDOW_CONTENT } from './window-content';
import { windowMeta } from './window-list';

type Props = {
  windows: WindowState[];
  focused: string | null;
  bounds: Bounds;
  mobile: boolean;
  lite: boolean;
};

export default function WindowLayer({ windows, focused, bounds, mobile, lite }: Props) {
  const readers = windows.filter((w) => !w.minimized && isProject(w.id));
  const topReader = readers.length ? readers.reduce((a, b) => (a.z > b.z ? a : b)).id : null;
  return (
    <AnimatePresence>
      {windows
        .filter((w) => !w.minimized)
        .map((win) => {
          const meta = windowMeta(win.id);
          if (!meta) return null;
          // Fixed windows have their own content; everything else is a work folder or project.
          const Fixed = WINDOW_CONTENT[win.id];
          // Projects open in the reader (focus mode); everything else is a small window.
          // One reader at a time, kept mounted while it switches project (prev / next).
          // Folders open as a full page that lists the folder.
          if (!Fixed && isFolderPage(win.id) && isFolderId(win.id)) {
            return (
              <FolderPage key={`folder-${win.id}-${mobile ? 'sheet' : 'desk'}`} folder={win.id} win={win} mobile={mobile} lite={lite} />
            );
          }
          if (!Fixed && isProject(win.id)) {
            if (win.id !== topReader) return null;
            return <Reader key={`reader-${mobile ? 'sheet' : 'desk'}`} meta={meta} win={win} mobile={mobile} lite={lite} />;
          }
          return (
            <Window
              key={`${win.id}-${mobile ? 'sheet' : 'window'}`}
              meta={meta}
              win={win}
              focused={focused === win.id}
              order={windows.findIndex((w) => w.id === win.id)}
              bounds={bounds}
              mobile={mobile}
              lite={lite}
            >
              {Fixed ? <Fixed /> : <WorkWindow id={win.id} />}
            </Window>
          );
        })}
    </AnimatePresence>
  );
}
