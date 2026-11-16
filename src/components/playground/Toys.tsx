// Small things to play with under the canvas: a ticket to tear, a sticker to peel, a draft to
// refine and a picture to turn into ASCII.
// Both are React Bits (TearTicket, StickerPeel), restyled with props only. The sticker is
// WebGL, so Lite mode shows it as a still image instead.

import { lazy, Suspense } from 'react';
import { useLite } from '../../lib/device-tier';
import TearTicket from '../rb/TearTicket';
import AsciiDrop from './AsciiDrop';
import RefineToy from './RefineToy';
import { cream, ember, navy } from '../../lib/palette';

const StickerPeel = lazy(() => import('../rb/StickerPeel'));

const STICKER = '/sticker.svg';

export default function Toys() {
  const lite = useLite();
  return (
    <ul className="toys-row">
      <li className="toy">
        <div className="toy-stage toy-stage-ticket">
          <TearTicket
            width={340}
            height={170}
            stubSize={104}
            rotate={-3}
            background={cream['100']}
            color={navy['950']}
            stubBackground={ember['500']}
            borderColor="rgba(11,20,48,0.25)"
            holes={9}
            ariaLabel="Tear off the ticket stub"
            stub={
              <div className="ticket-stub">
                <span>admit</span>
                <strong>01</strong>
              </div>
            }
          >
            <div className="ticket-body">
              <span className="ticket-kicker">aryan os</span>
              <strong className="ticket-title">One visit</strong>
              <span className="ticket-meta">valid for every window</span>
            </div>
          </TearTicket>
        </div>
        <p className="toy-label">Tear the stub</p>
      </li>
      <li className="toy">
        <div className="toy-stage toy-stage-sticker">
          {lite ? (
            <img src={STICKER} alt="" width={150} height={150} className="toy-sticker-still" />
          ) : (
            <Suspense fallback={<img src={STICKER} alt="" width={150} height={150} className="toy-sticker-still" />}>
              <StickerPeel imageSrc={STICKER} width={150} rotate={-8} finish="holo" draggable intro />
            </Suspense>
          )}
        </div>
        <p className="toy-label">{lite ? 'A sticker (peel it with Lite mode off)' : 'Peel or drag the sticker'}</p>
      </li>
      <li className="toy">
        <div className="toy-stage">
          <RefineToy />
        </div>
        <p className="toy-label">Watch a rough draft get refined</p>
      </li>
      <li className="toy toy-wide">
        <div className="toy-stage toy-stage-ascii">
          <AsciiDrop />
        </div>
        <p className="toy-label">Turn any picture into ASCII</p>
      </li>
    </ul>
  );
}
