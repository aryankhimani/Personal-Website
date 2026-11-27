import AstralField from '../AstralField';
import HeroHud from '../HeroHud';

const UNITS: [string, string] = ['RA', 'DEC'];

/** A turning globe of connected stars, with red-orange signals and arcs, under a HUD. */
export default function AstralVisual() {
  return (
    <>
      <AstralField />
      <HeroHud sector="04" title="STAR MAP" units={UNITS} />
    </>
  );
}
