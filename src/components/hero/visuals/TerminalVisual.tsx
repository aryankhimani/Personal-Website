import DecryptedText from '../../rb/DecryptedText';
import FaultyTerminal from '../../rb/FaultyTerminal';
import { navy } from '../../../lib/palette';

const LINES = ['> whoami', 'aryan khimani', '> ls ~', 'ai-ml  software  research  ventures  leadership'];

/** A glitchy terminal behind the name, with a few lines that decode on arrival. */
export default function TerminalVisual() {
  return (
    <>
      <FaultyTerminal
        className="absolute inset-0"
        tint={navy['300']}
        brightness={0.55}
        scanlineIntensity={0.4}
        glitchAmount={1}
        flickerAmount={0.6}
        curvature={0.12}
        mouseReact
        mouseStrength={0.3}
        pageLoadAnimation
        dpr={1}
      />
      <div className="hero-terminal-lines">
        {LINES.map((line, i) => (
          <p key={line} className={i % 2 ? 'text-chrome-4' : 'text-accent'}>
            <DecryptedText text={line} animateOn="view" sequential speed={28} revealDirection="start" />
          </p>
        ))}
      </div>
    </>
  );
}
