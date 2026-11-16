// React Bits' Target Cursor, only over project cards and folders: its container follows
// whichever card or folder is under the pointer, so it's never shown anywhere else.
// Desktop with a mouse only; never in Lite mode.
import { useEffect, useState } from 'react';

const TARGETS = '.fcard-cover, .folder-cell';
const nowhere = typeof document !== 'undefined' ? document.createElement('div') : null;
import { useLite } from '../../lib/device-tier';
import { ember } from '../../lib/palette';
import TargetCursor from '../rb/TargetCursor';

export default function WorkCursor() {
  const lite = useLite();
  const [fine, setFine] = useState(false);
  const [box, setBox] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setFine(window.matchMedia('(pointer: fine)').matches);
    const work = document.getElementById('work');
    const onOver = (e: PointerEvent) => setBox((e.target as Element).closest<HTMLElement>(TARGETS) ?? nowhere);
    const onLeave = () => setBox(nowhere);
    work?.addEventListener('pointerover', onOver);
    work?.addEventListener('pointerleave', onLeave);
    setBox(nowhere);
    return () => {
      work?.removeEventListener('pointerover', onOver);
      work?.removeEventListener('pointerleave', onLeave);
    };
  }, []);
  if (lite || !fine || !box) return null;
  return (
    <TargetCursor
      container={box}
      targetSelector={TARGETS}
      cursorColor={ember['500']}
      cursorColorOnTarget={ember['500']}
      hideDefaultCursor={false}
      parallaxOn
      showLabel={false}
      spinDuration={3}
    />
  );
}
