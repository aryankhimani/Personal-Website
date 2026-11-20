// A folder opened as a full page (#work/<folder>): it grows out of the glass folder you
// clicked, lists every project in it (the top picks first), and each card opens the reader
// on top. Esc, the close light or back shrinks it back into the folder; the page behind
// never moves.

import { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { closeWindow, focusWindow, type WindowState } from '../../lib/windows';
import { loadProjectDetails } from '../../lib/work-data';
import { FOLDERS, topFirst, type FolderId, type ProjectDetail } from '../../lib/work';
import { WORK_INDEX } from '../os/window-list';
import { trapTab, useGrow } from './useGrow';

type Props = { folder: FolderId; win: WindowState; mobile: boolean; lite: boolean };

export default function FolderPage({ folder, win, mobile, lite }: Props) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const { x, y, sx, sy, opacity, veil } = useGrow(folder, ref, lite, mobile);
  const info = FOLDERS.find((f) => f.id === folder);
  const items = topFirst(
    folder,
    WORK_INDEX.filter((p) => p.folders.includes(folder)),
  );
  const top = new Set(info?.top ?? []);

  const [details, setDetails] = useState<Map<string, ProjectDetail>>(new Map());
  useEffect(() => {
    let live = true;
    loadProjectDetails()
      .then((all) => live && setDetails(new Map(all.map((d) => [d.id, d]))))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  return (
    <>
      <motion.div
        className="reader-veil pointer-events-auto"
        style={{ opacity: veil, zIndex: win.z }}
        onClick={() => closeWindow(folder)}
        aria-hidden="true"
      />
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-window={folder}
        data-folder-page=""
        className={'os-window reader folder-page pointer-events-auto' + (mobile ? ' reader-sheet' : '')}
        style={{ x, y, scaleX: sx, scaleY: sy, opacity, zIndex: win.z + 1 }}
        onPointerDownCapture={() => focusWindow(folder)}
        onKeyDown={(e) => trapTab(e, ref.current)}
      >
        <div className="reader-bar os-titlebar">
          <div className="os-lights flex items-center gap-2">
            <button
              type="button"
              aria-label={`Close ${folder}/`}
              className="os-light os-light-close"
              onClick={() => closeWindow(folder)}
            >
              <svg viewBox="0 0 12 12" aria-hidden="true">
                <path d="M3 3l6 6M9 3l-6 6" />
              </svg>
            </button>
          </div>
          <p className="reader-file">
            ~/work/<strong>{folder}/</strong>
          </p>
          <p className="reader-count" aria-hidden="true">
            {items.length} {items.length === 1 ? 'file' : 'files'}
          </p>
          {mobile && (
            <button type="button" className="reader-close-text" onClick={() => closeWindow(folder)}>
              Close
            </button>
          )}
        </div>

        <div className="reader-scroll" data-lenis-prevent>
          <header className="fp-head">
            <h2 id={titleId} className="fp-title">
              {folder}/
            </h2>
            {info?.note && <p className="fp-note">{info.note}</p>}
          </header>

          <ul className="fp-grid">
            {items.map((p) => {
              const d = details.get(p.id);
              return (
                <li key={p.id} className={top.has(p.id) ? 'fp-top' : undefined}>
                  <a href={`/work/${p.id}/`} data-open-window={p.id} className="fp-card" aria-haspopup="dialog">
                    <span className="fp-cover" aria-hidden="true" data-bp={d?.cover?.blueprint ? '' : undefined}>
                      {d?.cover ? (
                        <img
                          src={d.cover.src}
                          srcSet={d.cover.srcset}
                          sizes="(max-width: 767px) 90vw, 360px"
                          width={d.cover.width}
                          height={d.cover.height}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className={`fp-cover-${d.cover.fit}`}
                        />
                      ) : (
                        <span className="fp-cover-file">{p.id}.md</span>
                      )}
                    </span>
                    <span className="fp-text">
                      <span className="fp-meta">
                        {top.has(p.id) && <span className="fp-pin">top pick</span>}
                        {p.when && <time>{p.when}</time>}
                      </span>
                      <span className="fp-name">{p.title}</span>
                      {d?.summary && <span className="fp-summary">{d.summary}</span>}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </motion.div>
    </>
  );
}
