import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useLite } from '../../lib/device-tier';
import { lockScroll, unlockScroll } from '../../lib/scroll';
import { closeWindow, isFolderPage, isProject, startWindowManager, useWindows } from '../../lib/windows';
import type { Bounds } from './Window';
import './window-list'; // registers window ids, so shared links like /#tks open on load

const loadLayer = () => import('./WindowLayer');
const WindowLayer = lazy(loadLayer);

const MOBILE_QUERY = '(max-width: 767px)';

export default function WindowManager() {
  const { windows, focused } = useWindows();
  const lite = useLite();
  const layerRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [mobile, setMobile] = useState(false);
  // Once shown, the layer stays mounted so the last window can animate out.
  const [layerNeeded, setLayerNeeded] = useState(false);
  if (windows.length > 0 && !layerNeeded) setLayerNeeded(true);

  useEffect(() => {
    startWindowManager();

    // Fetch the window code once the page is settled, so the first open is instant.
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    idle(() => void loadLayer());

    const mq = window.matchMedia(MOBILE_QUERY);
    const measure = () => {
      const r = layerRef.current?.getBoundingClientRect();
      if (r) setBounds({ left: r.left, top: r.top, width: r.width, height: r.height });
      setMobile(mq.matches);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // The layer changes size when it switches between desk and full-screen sheet.
  useEffect(() => {
    const r = layerRef.current?.getBoundingClientRect();
    if (r) setBounds({ left: r.left, top: r.top, width: r.width, height: r.height });
  }, [mobile]);

  // Esc closes the window in front.
  useEffect(() => {
    if (!focused) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) closeWindow(focused);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focused]);

  // On phones a window is a full-screen sheet, so the page behind it shouldn't scroll.
  // The reader is modal everywhere, so it locks the page too (and keeps your place in it).
  const sheetOpen = windows.some((w) => !w.minimized && (mobile || isProject(w.id) || isFolderPage(w.id)));
  useEffect(() => {
    if (!sheetOpen) return;
    lockScroll();
    return unlockScroll;
  }, [sheetOpen]);

  return (
    <div
      ref={layerRef}
      className={
        'pointer-events-none fixed inset-x-0 bottom-0 ' + (mobile ? 'top-0 z-50' : 'top-(--menubar-h) z-30')
      }
    >
      {bounds && layerNeeded && (
        <Suspense fallback={null}>
          <WindowLayer windows={windows} focused={focused} bounds={bounds} mobile={mobile} lite={lite} />
        </Suspense>
      )}
    </div>
  );
}
