// "Discard draft": your message becomes a sheet of paper (React Bits' Paper Crumple, three.js).
// Hold it to crumple it; once it's a ball the form is cleared. Esc or Keep closes it.
// In Lite mode, or with reduced motion, the button just clears the form.
import { lazy, Suspense, useEffect, useState } from 'react';
import { useLite } from '../../lib/device-tier';
import { cream, ember, navy } from '../../lib/palette';

const PaperCrumple = lazy(() => import('../rb/PaperCrumple'));

function draftImage(subject: string, body: string): string {
  const W = 680;
  const H = 880;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  g.fillStyle = cream['50'];
  g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(11,20,48,0.08)';
  for (let y = 150; y < H - 40; y += 40) (g.beginPath(), g.moveTo(48, y + 0.5), g.lineTo(W - 48, y + 0.5), g.stroke());
  g.fillStyle = navy['700'];
  g.font = `24px 'Departure Mono', monospace`;
  g.fillText('new_message.eml', 48, 64);
  g.fillStyle = ember['700'];
  g.fillRect(48, 82, 56, 5);
  g.fillStyle = navy['950'];
  g.font = `600 34px 'Atkinson Hyperlegible Next Variable', sans-serif`;
  g.fillText((subject || '(no subject)').slice(0, 34), 48, 136);
  g.font = `28px 'Atkinson Hyperlegible Next Variable', sans-serif`;
  const words = (body || 'Hi Aryan,').split(/\s+/);
  let line = '';
  let y = 186;
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (g.measureText(next).width > W - 96) {
      g.fillText(line, 48, y);
      line = w;
      y += 40;
      if (y > H - 60) break;
    } else line = next;
  }
  if (y <= H - 60) g.fillText(line, 48, y);
  return c.toDataURL('image/png');
}

export default function DiscardDraft() {
  const lite = useLite();
  const [sheet, setSheet] = useState<string | null>(null);

  const form = () => document.querySelector<HTMLFormElement>('[data-compose]');
  const clear = () => {
    form()?.reset();
    setSheet(null);
    form()?.querySelector<HTMLInputElement>('input[name="subject"]')?.focus();
  };

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSheet(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet]);

  const open = () => {
    const f = form();
    if (!f) return;
    const data = new FormData(f);
    const subject = String(data.get('subject') ?? '').trim();
    const body = String(data.get('body') ?? '').trim();
    if (lite || window.matchMedia('(prefers-reduced-motion: reduce)').matches || (!subject && !body)) {
      clear();
      return;
    }
    setSheet(draftImage(subject, body));
  };

  return (
    <>
      <button type="button" className="compose-discard" onClick={open}>
        Discard draft
      </button>
      {sheet && (
        <div className="crumple-overlay" role="dialog" aria-modal="true" aria-label="Crumple your draft">
          <p className="crumple-say">Hold the page to crumple it. Let go and it&rsquo;s gone.</p>
          <div className="crumple-stage">
            <Suspense fallback={<p className="crumple-say">getting the paper...</p>}>
              <PaperCrumple
                src={sheet}
                alt="Your draft"
                width={340}
                height={440}
                sceneHeight={520}
                releaseBehavior="stay"
                paperColor={cream['50']}
                onStateChange={(s) => s === 'crumpled' && window.setTimeout(clear, 700)}
              />
            </Suspense>
          </div>
          <div className="crumple-actions">
            <button type="button" className="btn-quiet" onClick={() => setSheet(null)}>
              Keep it
            </button>
            <button type="button" className="btn-quiet" onClick={clear}>
              Just clear it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
