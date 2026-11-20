// Articles and newsletters as React Bits' Flex Carousel (a WebGL strip of cards that bends
// as you drag it). Each card is drawn here: the piece's image on top (photos as a navy/cream
// duotone with a grid, blueprints as they are), then the title in the palette. Picking the card in focus opens the piece in a new tab.
// The Finder list below stays the accessible, complete version; this is the browsable one.
// Not shown in Lite mode.
import { lazy, Suspense, useEffect, useState } from 'react';
import { useLite } from '../../lib/device-tier';
import GlGate from '../os/GlGate';
import { cream, ember, navy } from '../../lib/palette';
import type { FlexCarouselItem } from '../rb/FlexCarousel';

const FlexCarousel = lazy(() => import('../rb/FlexCarousel'));

type Piece = { title: string; kind: 'article' | 'newsletter' | 'talk'; date: string; where: string; href: string; img: string; bp: boolean };

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

const load = (src: string) =>
  new Promise<HTMLImageElement | null>((res) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/** A 600×800 cover: the image on top (cropped to fill), then the title, an ember rule and the source. */
function cover(p: Piece, i: number, im: HTMLImageElement | null): string {
  const W = 600;
  const H = 800;
  const IH = 400;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.fillStyle = navy['900'];
  g.fillRect(0, 0, W, H);
  if (im) {
    const s = Math.max(W / im.naturalWidth, IH / im.naturalHeight);
    const sw = W / s;
    const sh = IH / s;
    g.drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) / 2, sw, sh, 0, 0, W, IH);
    if (!p.bp) {
      // Duotone: luminance mapped from navy-900 to cream-100.
      const [a, b] = [hex(navy['900']), hex(cream['100'])];
      const d = g.getImageData(0, 0, W, IH);
      const px = d.data;
      for (let k = 0; k < px.length; k += 4) {
        const l = Math.min(1, ((0.2126 * px[k] + 0.7152 * px[k + 1] + 0.0722 * px[k + 2]) / 255) * 1.08);
        px[k] = a[0] + (b[0] - a[0]) * l;
        px[k + 1] = a[1] + (b[1] - a[1]) * l;
        px[k + 2] = a[2] + (b[2] - a[2]) * l;
      }
      g.putImageData(d, 0, 0);
      g.strokeStyle = 'rgba(242,235,221,0.1)';
      g.lineWidth = 1;
      for (let x = 0; x <= W; x += 24) (g.beginPath(), g.moveTo(x + 0.5, 0), g.lineTo(x + 0.5, IH), g.stroke());
      for (let y = 0; y <= IH; y += 24) (g.beginPath(), g.moveTo(0, y + 0.5), g.lineTo(W, y + 0.5), g.stroke());
    }
  }
  g.fillStyle = 'rgba(242,235,221,0.35)';
  g.fillRect(0, IH, W, 1);
  g.fillStyle = navy['300'];
  g.font = `20px 'Departure Mono', monospace`;
  g.fillText(`${p.kind === 'article' ? 'article.md' : 'newsletter.txt'}  ·  ${String(i + 1).padStart(2, '0')}`, 40, IH + 52);
  g.fillStyle = ember['500'];
  g.fillRect(40, IH + 70, 56, 5);
  g.fillStyle = cream['50'];
  g.font = `400 42px 'Bricolage Grotesque Variable', sans-serif`;
  const lines = wrap(g, p.title, W - 80).slice(0, 4);
  lines.forEach((l, n) => g.fillText(l, 40, IH + 130 + n * 48));
  g.fillStyle = navy['300'];
  g.font = `20px 'Departure Mono', monospace`;
  g.fillText(`${p.where}  ·  ${when(p.date)}`, 40, H - 40);
  return c.toDataURL('image/jpeg', 0.86);
}

export default function WritingCarousel({ pieces }: { pieces: Piece[] }) {
  const lite = useLite();
  const [items, setItems] = useState<(FlexCarouselItem & { href: string })[] | null>(null);

  useEffect(() => {
    if (lite) return;
    let alive = true;
    const make = async () => {
      if (!alive) return;
      const list = pieces.filter((p) => p.kind !== 'talk');
      const imgs = await Promise.all(list.map((p) => load(p.img)));
      if (!alive) return;
      setItems(
        list.map((p, i) => ({
          src: cover(p, i, imgs[i]),
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
