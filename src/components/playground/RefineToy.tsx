// "Refine": React Bits' Refine Frame turns a rough, blocky draft of this site's hero into the
// finished design, stage by stage (queued → generating → refining → complete). Press the
// button to run it again.
import { useEffect, useRef, useState } from 'react';
import { useLite } from '../../lib/device-tier';
import { cream, navy } from '../../lib/palette';
import RefineFrame, { type RefineFrameStatus } from '../rb/RefineFrame';

const STEPS: [RefineFrameStatus, number][] = [
  ['queued', 500],
  ['generating', 1300],
  ['refining', 1500],
  ['complete', 0],
];

export default function RefineToy() {
  const lite = useLite();
  const [status, setStatus] = useState<RefineFrameStatus>(lite ? 'complete' : 'queued');
  const timers = useRef<number[]>([]);

  const run = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    let at = 0;
    for (const [s, ms] of STEPS) {
      timers.current.push(window.setTimeout(() => setStatus(s), at));
      at += ms;
    }
  };

  useEffect(() => {
    if (!lite) run();
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="refine-toy">
      <RefineFrame
        status={status}
        width={300}
        aspectRatio="16 / 10"
        radius={10}
        background={navy['900']}
        color={cream['100']}
        labels={{ queued: 'rough draft', generating: 'blocking it out', refining: 'refining', complete: 'shipped' }}
      >
        <img src="/playground/hero-design.jpg" alt="This site's hero: the AK logo in chrome beside Aryan's name" width={960} height={600} loading="lazy" decoding="async" />
      </RefineFrame>
      <button type="button" className="toy-button" onClick={run} disabled={status !== 'complete'}>
        Refine again
      </button>
    </div>
  );
}
