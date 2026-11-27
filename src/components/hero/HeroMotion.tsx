// The animated parts of the hero copy. Loaded after the page settles, and never in Lite mode,
// so the name and tagline are plain HTML first and the animation library stays off the first load.

import type { RefObject } from 'react';
import RotatingText from '../rb/RotatingText';
import VariableProximity from '../rb/VariableProximity';

export const ROLES = ['build AI tools and ship them', 'fine-tune language models', 'build full-stack apps'];

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
      // "sync" rolls the new phrase in while the old one leaves (both stacked in one grid
      // cell, see .hero-roles), so the line never shrinks to a bare "I".
      animatePresenceMode="sync"
      mainClassName="hero-roles"
    />
  );
}
