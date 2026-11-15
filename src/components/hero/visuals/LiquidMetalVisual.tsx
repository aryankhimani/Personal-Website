import { LiquidMetal } from '@paper-design/shaders-react';
import { DEFAULT_LOGO, LOGOS } from '../links';

function logoFromUrl(): string {
  const n = Number(new URLSearchParams(location.search).get('logo'));
  const index = Number.isInteger(n) && n >= 1 && n <= LOGOS.length ? n - 1 : DEFAULT_LOGO;
  return `/logos/${LOGOS[index]}.svg`;
}

/** The AK logo as moving chrome. Paper's shader pauses itself off-screen and in hidden tabs. */
export default function LiquidMetalVisual() {
  return (
    <LiquidMetal
      image={logoFromUrl()}
      colorBack="#00000000"
      colorTint="#ffffff"
      repetition={2.2}
      softness={0.12}
      shiftRed={0.25}
      shiftBlue={0.25}
      distortion={0.08}
      contour={0.5}
      angle={70}
      speed={0.7}
      scale={0.9}
      fit="contain"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
