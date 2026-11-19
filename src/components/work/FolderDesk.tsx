// ~/work's five folders as liquid glass, in one row (it scrolls sideways on phones).
// Each folder holds paper: the top three projects clearly in front, the rest behind them,
// blurred and faded. Hover (or focus) lifts the papers; the folder tilts towards the cursor.
// Clicking the folder opens it as a full page (#work/<folder>, FolderPage.tsx); clicking
// one of the front papers opens that project straight in the reader.
// Inspired by the folders on aswinpanengal.me and React Bits' Folder Float; written from scratch.

import { useRef, type CSSProperties, type PointerEvent } from 'react';
import { useLite } from '../../lib/device-tier';

type Folder = { id: string; note: string; items: { id: string; title: string }[]; top: number };

const BEHIND = 3; // how many of "the rest" show blurred behind the front papers
const FAN = [0, -1, 1];

export default function FolderDesk({ folders }: { folders: Folder[] }) {
  return (
    <ul className="gfolders">
      {folders.map((f) => (
        <GlassFolder key={f.id} folder={f} />
      ))}
    </ul>
  );
}

function GlassFolder({ folder }: { folder: Folder }) {
  const lite = useLite();
  const body = useRef<HTMLDivElement>(null);
  const front = folder.items.slice(0, folder.top);
  const rest = folder.items.slice(folder.top);

  // A gentle tilt towards the pointer (mouse only), written straight to CSS variables.
  const onMove = (e: PointerEvent) => {
    if (lite || e.pointerType !== 'mouse' || !body.current) return;
    const r = body.current.getBoundingClientRect();
    body.current.style.setProperty('--tx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
    body.current.style.setProperty('--ty', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
  };
  const onLeave = () => {
    body.current?.style.setProperty('--tx', '0');
    body.current?.style.setProperty('--ty', '0');
  };

  const count = `${folder.items.length} ${folder.items.length === 1 ? 'file' : 'files'}`;

  return (
    <li className="gf" data-folder={folder.id} onPointerMove={onMove} onPointerLeave={onLeave}>
      <div ref={body} className="gf-body">
        {/* The folder itself: back panel and glass front, one link to the whole folder. */}
        <a
          href={`#work/${folder.id}`}
          data-open-window={folder.id}
          className="gf-hit"
          aria-haspopup="dialog"
          aria-label={`Open ${folder.id}/, ${count}`}
        >
          <span className="gf-back" aria-hidden="true" />
          <span className="gf-front" aria-hidden="true">
            <span className="gf-name">{folder.id}/</span>
            <span className="gf-count">{count}</span>
            <span className="gf-arrow">
              <svg viewBox="0 0 16 16">
                <path d="M5 11 11 5M6 5h5v5" />
              </svg>
            </span>
          </span>
        </a>

        {rest.slice(0, BEHIND).map((p, i) => (
          <span key={p.id} className="gf-paper gf-paper-behind" style={{ '--i': i } as CSSProperties} aria-hidden="true">
            <span className="gf-paper-title">{p.title}</span>
          </span>
        ))}

        {front.map((p, i) => (
          <a
            key={p.id}
            href={`/work/${p.id}/`}
            data-open-window={p.id}
            className="gf-paper"
            // Best in the middle, second to the left, third to the right.
            style={{ '--o': FAN[i] ?? 0, '--d': i === 0 ? 0 : 1 } as CSSProperties}
            aria-haspopup="dialog"
          >
            <span className="gf-paper-file" aria-hidden="true">
              {p.id}.md
            </span>
            <span className="gf-paper-title">{p.title}</span>
          </a>
        ))}
      </div>
      <p className="gf-note">{folder.note}</p>
    </li>
  );
}
