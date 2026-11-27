import { useEffect, useId, useRef, type ReactNode } from 'react';
import { animate, motion, useDragControls, useMotionValue, usePresence } from 'motion/react';
import { closeWindow, exitPoint, focusWindow, minimizeWindow, toggleZoom, type WindowState } from '../../lib/windows';
import type { WindowMeta } from './window-list';

export type Bounds = { left: number; top: number; width: number; height: number };

type Props = {
  meta: WindowMeta;
  win: WindowState;
  focused: boolean;
  /** Position in the stack of open windows, used to cascade new ones. */
  order: number;
  bounds: Bounds;
  mobile: boolean;
  lite: boolean;
  children: ReactNode;
};

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function Window({ meta, win, focused, order, bounds, mobile, lite, children }: Props) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const [isPresent, safeToRemove] = usePresence();

  const width = mobile ? bounds.width : Math.min(meta.width, bounds.width - 24);
  const height = mobile ? bounds.height : Math.min(meta.height, bounds.height - 96);

  // Resting position on the desk: roughly centred, each new window stepped down and right.
  const rest = useRef({
    x: clamp((bounds.width - width) / 2 - 60 + order * 32, 12, bounds.width - width - 12),
    y: clamp((bounds.height - height) / 2 - 56 + order * 32, 12, bounds.height - height - 84),
  });

  const x = useMotionValue(mobile ? 0 : rest.current.x);
  const y = useMotionValue(mobile ? 0 : rest.current.y);
  const scale = useMotionValue(1);
  const opacity = useMotionValue(0);

  // Open: grow out of whatever was clicked (desktop), slide up (mobile), or fade (Lite).
  useEffect(() => {
    const controls: { stop: () => void }[] = [];
    if (lite) {
      controls.push(animate(opacity, 1, { duration: 0.15 }));
    } else if (mobile) {
      y.set(bounds.height);
      opacity.set(1);
      controls.push(animate(y, 0, { duration: 0.3, ease: EASE_OUT }));
    } else {
      if (win.origin) {
        x.set(win.origin.x - bounds.left - width / 2);
        y.set(win.origin.y - bounds.top - height / 2);
        scale.set(0.2);
      } else {
        scale.set(0.94);
      }
      const spring = { duration: 0.28, ease: EASE_OUT };
      controls.push(
        animate(x, rest.current.x, spring),
        animate(y, rest.current.y, spring),
        animate(scale, 1, spring),
        animate(opacity, 1, { duration: 0.16 }),
      );
    }
    ref.current?.focus({ preventScroll: true });
    return () => controls.forEach((c) => c.stop());
    // Runs once per open; later prop changes are handled by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close / minimize: shrink back towards the opener, then let AnimatePresence remove us.
  useEffect(() => {
    if (isPresent) return;
    if (lite) {
      animate(opacity, 0, { duration: 0.12 }).then(safeToRemove);
      return;
    }
    if (mobile) {
      animate(y, bounds.height, { duration: 0.22, ease: 'easeIn' }).then(safeToRemove);
      return;
    }
    const to = exitPoint(meta.id);
    const out = { duration: 0.2, ease: 'easeIn' } as const;
    if (to) {
      animate(x, to.x - bounds.left - width / 2, out);
      animate(y, to.y - bounds.top - height / 2, out);
      animate(scale, 0.2, out);
    } else {
      animate(scale, 0.94, out);
    }
    animate(opacity, 0, { duration: 0.18, ease: 'easeIn' }).then(safeToRemove);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent]);

  // Zoom (green light) fills the desk; un-zoom returns to where the window was.
  const zoomed = win.zoomed && !mobile;
  const firstZoomRun = useRef(true);
  useEffect(() => {
    if (firstZoomRun.current) {
      firstZoomRun.current = false;
      return;
    }
    if (mobile) return;
    const t = { duration: lite ? 0 : 0.2, ease: EASE_OUT };
    animate(x, zoomed ? 0 : rest.current.x, t);
    animate(y, zoomed ? 0 : rest.current.y, t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomed]);

  // Keep the window on the desk when the browser is resized.
  useEffect(() => {
    if (mobile || zoomed) return;
    rest.current = {
      x: clamp(rest.current.x, 0, bounds.width - width),
      y: clamp(rest.current.y, 0, bounds.height - 40),
    };
    if (x.get() > bounds.width - width || y.get() > bounds.height - 40) {
      x.set(rest.current.x);
      y.set(rest.current.y);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds.width, bounds.height]);

  // Bring keyboard focus into the window whenever it becomes the focused one.
  useEffect(() => {
    if (focused && ref.current && !ref.current.contains(document.activeElement)) {
      ref.current.focus({ preventScroll: true });
    }
  }, [focused]);

  // A mobile sheet covers the whole screen, so Tab stays inside it.
  function trapTab(e: React.KeyboardEvent) {
    if (!mobile || e.key !== 'Tab' || !ref.current) return;
    const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === ref.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const w = zoomed ? bounds.width : width;
  const h = zoomed ? bounds.height : height;

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-modal={mobile ? true : undefined}
      aria-labelledby={titleId}
      tabIndex={-1}
      data-window={meta.id}
      data-focused={focused || undefined}
      className={
        'os-window pointer-events-auto absolute left-0 top-0 flex flex-col overflow-hidden bg-window text-ink outline-none ' +
        (mobile ? '' : 'rounded-window border border-black/40 shadow-window') +
        (zoomed ? ' rounded-none' : '')
      }
      style={{ x, y, scale, opacity, width: w, height: h, zIndex: win.z }}
      drag={!mobile && !zoomed}
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={{ left: 0, top: 0, right: bounds.width - w, bottom: bounds.height - 40 }}
      onDragEnd={() => {
        rest.current = { x: x.get(), y: y.get() };
      }}
      onPointerDownCapture={() => focusWindow(meta.id)}
      onFocusCapture={() => focusWindow(meta.id)}
      onKeyDown={trapTab}
    >
      {mobile ? (
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-black/15 bg-titlebar pl-4">
          <h2 id={titleId} className="truncate text-sm">
            {meta.file}
          </h2>
          <button
            type="button"
            className="h-12 px-4 text-sm text-navy underline underline-offset-4"
            onClick={() => closeWindow(meta.id)}
          >
            Close
          </button>
        </div>
      ) : (
        <div
          className="os-titlebar relative flex h-9 shrink-0 cursor-grab touch-none items-center border-b border-black/20 px-3 select-none active:cursor-grabbing"
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest('button')) return;
            dragControls.start(e);
          }}
          onDoubleClick={() => toggleZoom(meta.id)}
        >
          <div className="os-lights group/lights flex items-center gap-2">
            <Light kind="close" label={`Close ${meta.file}`} onClick={() => closeWindow(meta.id)} />
            <Light kind="minimize" label={`Minimize ${meta.file} to the dock`} onClick={() => minimizeWindow(meta.id)} />
            <Light
              kind="zoom"
              label={zoomed ? `Shrink ${meta.file}` : `Fill the desk with ${meta.file}`}
              onClick={() => toggleZoom(meta.id)}
            />
          </div>
          <h2 id={titleId} className="pointer-events-none absolute inset-x-20 truncate text-center text-xs">
            {meta.file}
          </h2>
        </div>
      )}
      <div className="os-window-body min-h-0 flex-1 overflow-auto overscroll-contain" data-lenis-prevent>
        {children}
      </div>
    </motion.div>
  );
}

const GLYPHS = {
  close: 'M3 3l6 6M9 3l-6 6',
  minimize: 'M2.5 6h7',
  zoom: 'M6 2.5v7M2.5 6h7',
} as const;

function Light({ kind, label, onClick }: { kind: keyof typeof GLYPHS; label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} className={`os-light os-light-${kind}`} onClick={onClick}>
      <svg viewBox="0 0 12 12" aria-hidden="true">
        <path d={GLYPHS[kind]} />
      </svg>
    </button>
  );
}
