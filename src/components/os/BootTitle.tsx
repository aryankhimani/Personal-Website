// The boot screen's title and logo flash. lib/boot.ts runs the timeline and sets
// <html data-boot-phase>; this island follows it. It renders nothing unless the full boot is
// showing, and unmounts (freeing its WebGL context) the moment the boot ends.
import { lazy, Suspense, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cream, ember } from '../../lib/palette';
import SplitFlapText from '../rb/SplitFlapText';

const ElectricLogo = lazy(() => import('../rb/ElectricLogo'));

export type BootPhase = 'post' | 'title' | 'logo' | 'off';
const ORDER: BootPhase[] = ['post', 'title', 'logo', 'off'];
const reached = (now: BootPhase | undefined, p: BootPhase) => !!now && ORDER.indexOf(now) >= ORDER.indexOf(p);

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
    // Warm the logo shader early so the flash is on time.
    if (document.documentElement.dataset.boot === 'full') void import('../rb/ElectricLogo');
    window.addEventListener('aryan-os:boot-phase', sync);
    window.addEventListener('aryan-os:boot-done', done);
    return () => {
      window.removeEventListener('aryan-os:boot-phase', sync);
      window.removeEventListener('aryan-os:boot-done', done);
    };
  }, []);

  if (!live) return null;

  return (
    <>
      {reached(phase, 'title') && (
        <SplitFlapText
          className="boot-flap"
          text="ARYAN OS"
          padTo={8}
          loop={false}
          intro
          fontSize="clamp(28px, 7vw, 64px)"
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
      )}
      {reached(phase, 'logo') &&
        !reached(phase, 'off') &&
        document.getElementById('boot-logo') &&
        createPortal(
          <Suspense fallback={null}>
            <div className="boot-electric" aria-hidden="true">
              <ElectricLogo
                src="/logo.svg"
                color={cream['50']}
                glowColor={ember['500']}
                scale={0.82}
                intensity={1.7}
                fill={0.35}
                glow={1.5}
                strands={4}
                arcs={1}
                speed={3}
                interactive={false}
              />
            </div>
          </Suspense>,
          document.getElementById('boot-logo')!,
        )}
    </>
  );
}
