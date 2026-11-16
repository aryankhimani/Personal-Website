// After the rebuild finishes, a swarm of tiny particles (React Bits' Swarm Cursor) follows
// your pointer around the panel, the way Swarm's cursors flock to you at the end. It sleeps
// while the rebuild runs, and never runs in Lite mode.
import { lazy, Suspense, useEffect, useState } from 'react';
import { useLite } from '../../lib/device-tier';
import { cream, ember } from '../../lib/palette';
import GlGate from '../os/GlGate';

const SwarmCursor = lazy(() => import('../rb/SwarmCursor'));

export default function SwarmFinale() {
  const lite = useLite();
  const [on, setOn] = useState(false);
  useEffect(() => {
    const start = () => setOn(false);
    const done = () => setOn(true);
    window.addEventListener('aryan-os:rebuild-start', start);
    window.addEventListener('aryan-os:rebuild-done', done);
    return () => {
      window.removeEventListener('aryan-os:rebuild-start', start);
      window.removeEventListener('aryan-os:rebuild-done', done);
    };
  }, []);
  if (lite) return null;
  // Always render the box, so client:visible has something to watch.
  return (
    <div className="swarm-finale" aria-hidden="true">
      {on && (
        <GlGate>
          <Suspense fallback={null}>
            <SwarmCursor
              count={260}
              size={2.2}
              shape="streak"
              color={cream['100']}
              accentColor={ember['500']}
              spread={70}
              targets="[data-rebuild-run]"
              idle="gather"
              clickEffect="pulse"
              intro
              className="swarm-finale-fx"
            />
          </Suspense>
        </GlGate>
      )}
    </div>
  );
}
