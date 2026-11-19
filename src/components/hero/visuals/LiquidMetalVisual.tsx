import {
  defaultObjectSizing,
  getShaderColorFromString,
  LiquidMetalShapes,
  liquidMetalFragmentShader,
  ShaderFitOptions,
} from '@paper-design/shaders';
import { ShaderMount } from '@paper-design/shaders-react';
import { ember } from '../../../lib/palette';

// The AK logo already run through Paper's toProcessedLiquidMetal (R = edge gradient,
// G = mask), made by scripts/make-metal-texture.mjs. Paper's <LiquidMetal> component would
// redo that on every visit, a ~300 ms main-thread task on a mid-range phone.
const TEXTURE = '/hero/logo-metal.webp';

/**
 * The AK logo as polished chrome, tuned towards Apple's liquid glass: hard reflections
 * (low softness), strong refraction at the edges (contour), a chromatic fringe (red/blue
 * shift) and a faint ember tint. Rendered at the screen's full pixel ratio so it stays sharp.
 * Paper's shader pauses itself off-screen and in hidden tabs.
 */
export default function LiquidMetalVisual() {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  return (
    <ShaderMount
      fragmentShader={liquidMetalFragmentShader}
      mipmaps={['u_image']}
      speed={0.65}
      uniforms={{
        u_colorBack: getShaderColorFromString('#00000000'),
        u_colorTint: getShaderColorFromString(ember['50']),
        u_image: TEXTURE,
        u_contour: 0.6,
        u_distortion: 0.12,
        u_softness: 0.05,
        u_repetition: 3,
        u_shiftRed: 0.42,
        u_shiftBlue: 0.42,
        u_angle: 70,
        u_isImage: true,
        u_shape: Object.values(LiquidMetalShapes)[0],
        u_fit: ShaderFitOptions.contain,
        u_scale: 0.9,
        u_rotation: defaultObjectSizing.rotation,
        u_offsetX: defaultObjectSizing.offsetX,
        u_offsetY: defaultObjectSizing.offsetY,
        u_originX: defaultObjectSizing.originX,
        u_originY: defaultObjectSizing.originY,
        u_worldWidth: defaultObjectSizing.worldWidth,
        u_worldHeight: defaultObjectSizing.worldHeight,
      }}
      minPixelRatio={Math.max(2, dpr)}
      maxPixelCount={3840 * 2160}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
