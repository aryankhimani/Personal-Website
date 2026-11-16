// A section label (~/work, ~/journey...) drawn with React Bits' Tech Text: dashed letter
// outlines and measuring guides that type in when the section arrives, and react to the
// cursor. Plain text until then, and always in Lite mode.
import { lazy, Suspense, useEffect, useState } from 'react';
import { useLite } from '../../lib/device-tier';
import { ember, navy } from '../../lib/palette';

const ACCENT = { navy: ember['700'], cream: ember['500'], ember: navy['950'] };

const TechText = lazy(() => import('../rb/TechText'));

export default function TechLabel({ text, tone = 'cream' }: { text: string; tone?: 'navy' | 'cream' | 'ember' }) {
  const lite = useLite();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(!window.matchMedia('(prefers-reduced-motion: reduce)').matches), []);
  const plain = <span className="os-path">{text}</span>;
  if (lite || !ready) return plain;
  return (
    <span className={`tech-label tech-label-${tone}`} style={{ width: `${text.length * 0.62 + 0.6}em` }}>
      <Suspense fallback={plain}>
        <TechText
          text={text}
          fontFamily="'Departure Mono', ui-monospace, monospace"
          fontWeight={400}
          fontSize={30}
          letterSpacing={0}
          color="currentColor"
          accentColor={ACCENT[tone]}
          align="left"
          reach={120}
          dashLength={3}
          dashGap={2}
          strokeWidth={1}
          reveal="area"
          specks={6}
          selection={false}
          labels={false}
          draggable={false}
          sweep
          clickKick={false}
          intro="type"
          introDuration={1.2}
          guides
        />
      </Suspense>
    </span>
  );
}
