import OrbitSystem from '../OrbitSystem';
import HeroHud from '../HeroHud';

const UNITS: [string, string] = ['AZ', 'EL'];

/** A tilted two-armed spiral galaxy that the pointer bends, under a HUD. */
export default function OrbitsVisual() {
  return (
    <>
      <OrbitSystem />
      <HeroHud sector="05" title="ORBITS" units={UNITS} />
    </>
  );
}
