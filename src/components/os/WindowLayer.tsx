// The part of the window manager that needs Motion. Loaded on demand (see WindowManager)
// so the animation library stays out of the first page load.

import { AnimatePresence } from 'motion/react';
import type { WindowState } from '../../lib/windows';
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
  return (
    <AnimatePresence>
      {windows
        .filter((w) => !w.minimized)
        .map((win) => {
          const meta = windowMeta(win.id);
          const Content = WINDOW_CONTENT[win.id];
          if (!meta || !Content) return null;
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
              <Content />
            </Window>
          );
        })}
    </AnimatePresence>
  );
}
