// A featured card's picture, as React Bits' Flip Card: click (or drag) it and it turns over
// to show quick facts. Both faces are server-rendered HTML passed in as slots.
import type { ReactNode } from 'react';
import { useLite } from '../../lib/device-tier';
import { cream, navy } from '../../lib/palette';
import FlipCard from '../rb/FlipCard';

export default function FlipCover({ front, back, title }: { front?: ReactNode; back?: ReactNode; title: string }) {
  const lite = useLite();
  return (
    <FlipCard
      className="fcard-flip"
      front={front}
      back={back}
      tilt={!lite}
      glare={!lite}
      tiltMax={6}
      hoverScale={1}
      radius={0}
      shadow={false}
      background={navy['900']}
      color={cream['100']}
      ariaLabel={`Flip the ${title} card for quick facts`}
    />
  );
}
