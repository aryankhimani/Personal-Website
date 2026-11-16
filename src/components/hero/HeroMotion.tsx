// The animated parts of the hero copy. Loaded after the page settles, and never in Lite mode,
// so the name and tagline are plain HTML first and the animation library stays off the first load.

import type { RefObject } from 'react';
import RotatingText from '../rb/RotatingText';
import VariableProximity from '../rb/VariableProximity';

export const ROLES = ['research gene editing', 'build AI tools', 'start ventures'];

/** Per-letter weight that swells near the cursor (Bricolage Grotesque runs 200 to 800). */
export function Name({ label, area }: { label: string; area: RefObject<HTMLElement | null> }) {
  return (
    <VariableProximity
      label={label}
      containerRef={area}
      fromFontVariationSettings="'wght' 300"
      toFontVariationSettings="'wght' 800"
      radius={220}
      falloff="gaussian"
    />
  );
}

export function Roles() {
  return (
    <RotatingText
      texts={ROLES}
      effect="slide"
      rotationInterval={2600}
      staggerDuration={0.012}
      splitBy="characters"
      mainClassName="hero-roles"
    />
  );
}
