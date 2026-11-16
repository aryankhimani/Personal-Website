// Articles and newsletters as React Bits' Flex Carousel (a WebGL strip of cards that bends
// as you drag it). There are no cover images, so each card is drawn here as a typographic
// cover in the palette. Picking the card in focus opens the piece in a new tab.
// The Finder list below stays the accessible, complete version; this is the browsable one.
// Not shown in Lite mode.
import { lazy, Suspense, useEffect, useState } from 'react';
import { useLite } from '../../lib/device-tier';
import GlGate from '../os/GlGate';
import { cream, ember, navy } from '../../lib/palette';
import type { FlexCarouselItem } from '../rb/FlexCarousel';

const FlexCarousel = lazy(() => import('../rb/FlexCarousel'));

type Piece = { title: string; kind: 'article' | 'newsletter' | 'talk'; date: string; where: string; href: string };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const when = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;

function wrap(g: CanvasRenderingContext2D, text: string, max: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (g.measureText(next).width > max && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** A 600×800 cover: navy (articles) or cream (newsletters), the title set large, an ember rule. */
function cover(p: Piece, i: number): string {
  const W = 600;
  const H = 800;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const dark = p.kind === 'article';
  g.fillStyle = dark ? navy['900'] : cream['100'];
  g.fillRect(0, 0, W, H);
  // A blueprint grid, the site's motif.
  g.strokeStyle = dark ? 'rgba(242,235,221,0.07)' : 'rgba(11,20,48,0.07)';
  g.lineWidth = 1;
  for (let x = 0; x <= W; x += 30) (g.beginPath(), g.moveTo(x + 0.5, 0), g.lineTo(x + 0.5, H), g.stroke());
  for (let y = 0; y <= H; y += 30) (g.beginPath(), g.moveTo(0, y + 0.5), g.lineTo(W, y + 0.5), g.stroke());
  const ink = dark ? cream['50'] : navy['950'];
  const quiet = dark ? navy['300'] : navy['700'];
  g.fillStyle = quiet;
  g.font = `22px 'Departure Mono', monospace`;
  g.fillText(`${p.kind === 'article' ? 'article.md' : 'newsletter.txt'}  ·  ${String(i + 1).padStart(2, '0')}`, 44, 70);
  g.fillStyle = ember[dark ? '500' : '700'];
  g.fillRect(44, 98, 64, 6);
  g.fillStyle = ink;
  g.font = `400 54px 'Bricolage Grotesque Variable', sans-serif`;
  const lines = wrap(g, p.title, W - 88).slice(0, 7);
  lines.forEach((l, n) => g.fillText(l, 44, 190 + n * 60));
  g.fillStyle = quiet;
  g.font = `22px 'Departure Mono', monospace`;
  g.fillText(`${p.where}  ·  ${when(p.date)}`, 44, H - 56);
  return c.toDataURL('image/jpeg', 0.86);
}

export default function WritingCarousel({ pieces }: { pieces: Piece[] }) {
  const lite = useLite();
  const [items, setItems] = useState<(FlexCarouselItem & { href: string })[] | null>(null);

  useEffect(() => {
    if (lite) return;
    let alive = true;
    const make = () => {
      if (!alive) return;
      const list = pieces.filter((p) => p.kind !== 'talk');
      setItems(
        list.map((p, i) => ({
          src: cover(p, i),
          alt: p.title,
          title: p.title,
          subtitle: `${p.where} · ${when(p.date)}`,
          href: p.href,
        })),
      );
    };
    // Covers use the site fonts, so wait for them.
    void (document.fonts?.ready ?? Promise.resolve()).then(make);
    return () => {
      alive = false;
    };
  }, [lite, pieces]);

  if (lite) return null;
  // An empty box until the covers are drawn: client:visible needs something to watch.
  if (!items) return <div className="writing-carousel" />;
  return (
    <div className="writing-carousel">
      <GlGate>
        <Suspense fallback={null}>
          <FlexCarousel
            items={items}
            preset="liquid"
            intro="deal"
            fit="portrait"
            cardHeight={0.62}
            captions
            captureWheel={false}
            focusOnClick
            onSelect={(i) => window.open(items[i].href, '_blank', 'noopener,noreferrer')}
          />
        </Suspense>
      </GlGate>
      <p className="writing-carousel-hint">drag to browse · click the middle card to read it</p>
    </div>
  );
}
