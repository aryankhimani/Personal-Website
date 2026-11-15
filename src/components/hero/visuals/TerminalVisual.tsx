import DecryptedText from '../../rb/DecryptedText';
import FaultyTerminal from '../../rb/FaultyTerminal';

const LINES = ['> whoami', 'aryan khimani', '> ls ~', 'research  ventures  code  programs  talks'];

/** A glitchy terminal behind the name, with a few lines that decode on arrival. */
export default function TerminalVisual() {
  return (
    <>
      <FaultyTerminal
        className="absolute inset-0"
        tint="#8a8d96"
        brightness={0.55}
        scanlineIntensity={0.4}
        glitchAmount={1}
        flickerAmount={0.6}
        curvature={0.12}
        mouseReact
        mouseStrength={0.3}
        pageLoadAnimation
      />
      <div className="hero-terminal-lines">
        {LINES.map((line, i) => (
          <p key={line} className={i % 2 ? 'text-chrome-4' : 'text-muted'}>
            <DecryptedText text={line} animateOn="view" sequential speed={28} revealDirection="start" />
          </p>
        ))}
      </div>
    </>
  );
}
