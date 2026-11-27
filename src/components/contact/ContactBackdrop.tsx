// React Bits' Flux Lines behind the ember Contact section: flowing lines in the ember family
// with a little navy, multiplied onto the red-orange so it stays one colour. Not in Lite mode.
import { lazy, Suspense } from 'react';
import { useLite } from '../../lib/device-tier';
import GlGate from '../os/GlGate';
import { ember, navy } from '../../lib/palette';

const FluxLines = lazy(() => import('../rb/FluxLines'));

export default function ContactBackdrop() {
  const lite = useLite();
  if (lite) return null;
  return (
    <div className="contact-backdrop" aria-hidden="true">
      <GlGate>
        <Suspense fallback={null}>
          <FluxLines
            colors={[ember['700'], ember['800'], navy['900']]}
            transparent
            opacity={0.32}
            speed={0.5}
            lineWidth={1}
            glow={0.2}
            mouseInteraction
            mouseStrength={0.6}
            clickSwirl={false}
            intro
            mixBlendMode="multiply"
          />
        </Suspense>
      </GlGate>
    </div>
  );
}
