import { LiquidMetal } from '@paper-design/shaders-react';
import { ember } from '../../../lib/palette';
import { LOGO_URL } from '../links';

/**
 * The AK logo as polished chrome, tuned towards Apple's liquid glass: hard reflections
 * (low softness), strong refraction at the edges (contour), a chromatic fringe (red/blue
 * shift) and a faint ember tint. Rendered at the screen's full pixel ratio so it stays sharp.
 * Paper's shader pauses itself off-screen and in hidden tabs.
 */
export default function LiquidMetalVisual() {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  return (
    <LiquidMetal
      image={LOGO_URL}
      colorBack="#00000000"
      colorTint={ember['50']}
      repetition={3}
      softness={0.05}
      shiftRed={0.42}
      shiftBlue={0.42}
      distortion={0.12}
      contour={0.6}
      angle={70}
      speed={0.65}
      scale={0.9}
      fit="contain"
      minPixelRatio={Math.max(2, dpr)}
      maxPixelCount={3840 * 2160}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
