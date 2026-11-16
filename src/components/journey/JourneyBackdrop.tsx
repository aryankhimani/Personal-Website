// React Bits' Topography behind ~/journey: faint contour lines, cream on cream, drifting
// slowly like a map of the road so far. Pauses off-screen; not in Lite mode.
import { lazy, Suspense } from 'react';
import { useLite } from '../../lib/device-tier';
import GlGate from '../os/GlGate';
import { cream } from '../../lib/palette';

const Topography = lazy(() => import('../rb/Topography'));

export default function JourneyBackdrop() {
  const lite = useLite();
  if (lite) return null;
  return (
    <div className="journey-backdrop" aria-hidden="true">
      <GlGate>
        <Suspense fallback={null}>
          <Topography
            lightMode
            color={cream['500']}
            opacity={0.55}
            lineCount={22}
            lineWidth={1}
            majorLines
            speed={0.25}
            glow={0}
            fog={0.4}
            mouseInteraction
            mouseStrength={0.4}
            clickEffect="none"
            intro={false}
          />
        </Suspense>
      </GlGate>
    </div>
  );
}
