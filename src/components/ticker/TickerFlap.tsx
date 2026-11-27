// The split-flap board at the start of the ticker. Lite mode shows the first word, still.
import { useLite } from '../../lib/device-tier';
import { ember, navy } from '../../lib/palette';
import SplitFlapText from '../rb/SplitFlapText';

const WORDS = ['AI TOOLS', 'SOFTWARE', 'RESEARCH'];

export default function TickerFlap() {
  const lite = useLite();
  if (lite) return <span className="ticker-flap-still">{WORDS[0]}</span>;
  return (
    <SplitFlapText
      words={WORDS}
      padTo={8}
      fontSize={15}
      gap={2}
      tileRadius={3}
      tileColor={navy['950']}
      textColor={ember['300']}
      flipsPerChar={5}
      flipDuration={0.07}
      stagger={0.04}
      cycleDelay={2600}
      charset="alpha"
      depth={0.4}
      intro={false}
    />
  );
}
