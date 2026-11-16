// The desk under me.md:
//   - an ID badge on a lanyard (React Bits' Lanyard, three.js): "ARYAN OS · USER 001" with
//     my photo. Desktop with a mouse only; a flat badge everywhere else.
//   - photos.zip: a stack of photos that swap (React Bits' Card Swap)
//   - now.txt: what I'm working on now, as React Bits' Thought Line
//   - resume.pdf as a glass bill you can grab and fold (Bencho's Folding Bill), plus a link
// The two three.js pieces sit behind the WebGL gate, so only one of them runs at a time.
// Facts only: the "now" lines come from the About copy.
import { lazy, Suspense, useEffect, useState } from 'react';
import { useLite } from '../../lib/device-tier';
import { cream, ember, navy } from '../../lib/palette';
import GlGate from '../os/GlGate';
import { Icon } from '../os/Icon';
import { RESUME_URL } from '../os/nav';
import CardSwap from '../rb/CardSwap';
import ThoughtLine from '../rb/ThoughtLine';
import '../bencho/FoldingBill.css';

const Lanyard = lazy(() => import('../rb/Lanyard'));
const FoldingBill = lazy(() => import('../bencho/FoldingBill').then((m) => ({ default: m.FoldingBill })));

type Photo = { src: string; alt: string; title: string };

const NOW = [
  'Building TruthLens with Western AI',
  'Running events for the Western Founders Network',
  'Computer Science + Ivey HBA at Western',
];

/** Draws the ID badge (600×900) so it can be a texture on the 3D card, or a flat image. */
function useBadge(portrait: string): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.onload = async () => {
      await document.fonts?.ready;
      if (!alive) return;
      const W = 600;
      const H = 900;
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const g = c.getContext('2d')!;
      g.fillStyle = navy['900'];
      g.fillRect(0, 0, W, H);
      g.fillStyle = ember['500'];
      g.fillRect(0, 0, W, 120);
      g.fillStyle = navy['950'];
      g.font = `30px 'Departure Mono', monospace`;
      g.fillText('ARYAN OS', 48, 76);
      g.textAlign = 'right';
      g.fillText('USER 001', W - 48, 76);
      g.textAlign = 'left';
      // Photo, cropped to a square-ish window.
      const box = { x: 48, y: 168, w: W - 96, h: 430 };
      const s = Math.max(box.w / img.width, box.h / img.height);
      const sw = box.w / s;
      const sh = box.h / s;
      g.drawImage(img, (img.width - sw) / 2, (img.height - sh) * 0.2, sw, sh, box.x, box.y, box.w, box.h);
      g.strokeStyle = 'rgba(242,235,221,0.25)';
      g.strokeRect(box.x + 0.5, box.y + 0.5, box.w - 1, box.h - 1);
      g.fillStyle = cream['50'];
      g.font = `400 56px 'Bricolage Grotesque Variable', sans-serif`;
      g.fillText('Aryan Khimani', 48, 680);
      g.fillStyle = navy['300'];
      g.font = `24px 'Departure Mono', monospace`;
      g.fillText('CS + Ivey HBA · Western', 48, 728);
      g.fillText('researcher · builder', 48, 764);
      // A barcode, because every badge has one.
      g.fillStyle = cream['100'];
      let x = 48;
      let seed = 7;
      while (x < W - 48) {
        seed = (seed * 9301 + 49297) % 233280;
        const w = 2 + (seed % 5);
        g.fillRect(x, 812, w, 48);
        x += w + 2 + (seed % 3);
      }
      setUrl(c.toDataURL('image/png'));
    };
    img.src = portrait;
    return () => {
      alive = false;
    };
  }, [portrait]);
  return url;
}

export default function AboutDesk({ portrait, photos }: { portrait: string; photos: Photo[] }) {
  const lite = useLite();
  const badge = useBadge(portrait);
  const [desk3d, setDesk3d] = useState(false);
  useEffect(() => setDesk3d(window.matchMedia('(min-width: 1024px) and (pointer: fine)').matches), []);

  const flatBadge = badge ? <img className="badge-flat" src={badge} alt="" width={300} height={450} /> : null;
  const flatBill = (
    <div className="bill-flat" aria-hidden="true">
      <span>resume.pdf</span>
    </div>
  );

  return (
    <div className="about-desk">
      <figure className="desk-item desk-badge">
        <div className="badge-stage">
          {desk3d && !lite && badge ? (
            <GlGate fallback={flatBadge}>
              <Suspense fallback={flatBadge}>
                <Lanyard
                  frontImage={badge}
                  backImage={badge}
                  cardColor={navy['900']}
                  strapColor={ember['500']}
                  finish="glossy"
                  metal="silver"
                  size={0.62}
                  strapLength={0.45}
                  anchor="center"
                  intro
                />
              </Suspense>
            </GlGate>
          ) : (
            flatBadge
          )}
        </div>
        <figcaption>{desk3d && !lite ? 'badge.png: grab it and swing it' : 'badge.png'}</figcaption>
      </figure>

      <figure className="desk-item desk-photos">
        <div className="photos-stage">
          <CardSwap
            items={photos.map((p) => ({ image: p.src, alt: p.alt, title: p.title }))}
            width={300}
            height={220}
            cardDistance={34}
            verticalDistance={40}
            visibleCards={4}
            delay={4200}
            autoplay={!lite}
            pauseOnHover
            cardRadius={10}
            intro={!lite}
            theme="dark"
          />
        </div>
        <figcaption>photos.zip: {photos.length} photos, drag the top one away</figcaption>
      </figure>

      <div className="desk-item desk-now">
        <p className="desk-label">now.txt</p>
        <ThoughtLine
          label="What I'm working on"
          doneLabel="What I'm working on"
          steps={NOW}
          glyph="dot"
          color={cream['100']}
          glyphColor={ember['500']}
          fontSize={15}
          working={!lite}
          settleAfter={lite ? 0 : 3.2}
          showTimer={false}
          collapseOnSettle={false}
        />

        <p className="desk-label desk-label-resume">resume.pdf</p>
        <div className="bill-stage">
          {lite ? (
            flatBill
          ) : (
            <GlGate fallback={flatBill}>
              <Suspense fallback={flatBill}>
                <FoldingBill print="Plain" stiffness={35} settle={40} />
              </Suspense>
            </GlGate>
          )}
        </div>
        <a className="btn-ink desk-resume" href={RESUME_URL} target="_blank" rel="noopener noreferrer">
          <Icon name="file-text" className="text-sm" />
          Open resume.pdf
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>
    </div>
  );
}
