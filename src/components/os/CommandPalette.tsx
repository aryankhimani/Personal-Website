// ⌘K / Ctrl+K: the OS launcher. This shell only listens for the shortcut (and the Help menu
// entry); the dialog itself (PaletteDialog.tsx) loads the first time it opens.
import { lazy, Suspense, useEffect, useState } from 'react';

const PaletteDialog = lazy(() => import('./PaletteDialog'));

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const show = () => {
      setLoaded(true);
      setOpen(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setLoaded(true);
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('aryan-os:palette', show);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('aryan-os:palette', show);
    };
  }, []);

  if (!loaded) return null;
  return (
    <Suspense fallback={null}>
      <PaletteDialog open={open} onClose={() => setOpen(false)} />
    </Suspense>
  );
}
