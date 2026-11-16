import { LiquidMetal } from '@paper-design/shaders-react';
import { LOGO_URL } from '../links';

/** The AK logo as moving chrome. Paper's shader pauses itself off-screen and in hidden tabs. */
export default function LiquidMetalVisual() {
  return (
    <LiquidMetal
      image={LOGO_URL}
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
