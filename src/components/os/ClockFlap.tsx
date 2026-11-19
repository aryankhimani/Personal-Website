// One time zone's hh:mm on tiny split-flap tiles (React Bits' Split Flap Text).
import { cream, navy } from '../../lib/palette';
import SplitFlapText from '../rb/SplitFlapText';

export default function ClockFlap({ text }: { text: string }) {
  return (
    <SplitFlapText
      className="clock-flap"
      text={text}
      padTo={5}
      loop={false}
      intro={false}
      fontSize={11}
      gap={1}
      tileRadius={2}
      tileColor={navy['800']}
      textColor={cream['50']}
      charset="0123456789:"
      // One calm flip per changed digit. Three random flips at 11px read as broken glyphs.
      flipsPerChar={0}
      flipDuration={0.16}
      stagger={0.06}
      depth={0.3}
      tileStyle="minimal"
    />
  );
}
