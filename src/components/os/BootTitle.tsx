// The boot screen's name: "ARYAN OS" flipping in on split-flap tiles, the boot title from
// boot v2, now in the middle of the v3 HUD rings. lib/boot.ts runs the timeline and sets
// <html data-boot-phase>; this island follows it, renders nothing unless the full boot is
// showing, and unmounts when the boot ends.
import { useEffect, useState } from 'react';
import { cream } from '../../lib/palette';
import type { BootPhase } from '../../lib/boot';
import SplitFlapText from '../rb/SplitFlapText';

function readPhase(): BootPhase | undefined {
  const root = document.documentElement;
  return root.dataset.boot === 'full' ? ((root.dataset.bootPhase as BootPhase) ?? 'post') : undefined;
}

export default function BootTitle() {
  const [phase, setPhase] = useState<BootPhase | undefined>(undefined);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const sync = () => setPhase(readPhase());
    const done = () => setLive(false);
    sync();
    setLive(document.documentElement.dataset.boot === 'full');
    window.addEventListener('aryan-os:boot-phase', sync);
    window.addEventListener('aryan-os:boot-done', done);
    return () => {
      window.removeEventListener('aryan-os:boot-phase', sync);
      window.removeEventListener('aryan-os:boot-done', done);
    };
  }, []);

  if (!live || !phase || phase === 'post') return null;

  return (
    <SplitFlapText
      className="boot-flap"
      text="ARYAN OS"
      padTo={8}
      loop={false}
      intro
      fontSize="clamp(26px, 6.4vw, 64px)"
      gap={4}
      tileRadius={6}
      tileColor="#16224A"
      textColor={cream['50']}
      flipsPerChar={7}
      flipDuration={0.06}
      stagger={0.05}
      charset="alphanumeric"
      depth={0.7}
      glare={0.4}
    />
  );
}
