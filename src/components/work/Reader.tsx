// Focus mode: the project reader. Clicking a project grows it out of the card you clicked
// into a big window (about 92vw × 90vh, text capped at a comfortable measure). It still has
// a title bar and traffic lights, but it reads like an article: big type, a photo gallery,
// links, and ← prev / next → between projects.
//
// Esc, the close light or the back button returns you to exactly where you were (the page
// doesn't move underneath). The address is #work/<slug>, so it can be shared.
// On phones it's a full-screen sheet that slides up. Lite mode: a plain fade.

import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { animate, motion, useMotionValue, usePresence } from 'motion/react';
import {
  closeWindow,
  focusWindow,
  minimizeWindow,
  openerRect,
  replaceWindow,
  type WindowState,
} from '../../lib/windows';
import { cream, ember, navy } from '../../lib/palette';
import GlGate from '../os/GlGate';
import { Icon } from '../os/Icon';
import type { WindowMeta } from '../os/window-list';
import { WORK_INDEX, workEntry } from '../os/window-list';
import { demoteHeadings, useDetail } from './WorkWindows';

type Props = { meta: WindowMeta; win: WindowState; mobile: boolean; lite: boolean };

const DitherVeil = lazy(() => import('../rb/DitherVeil'));

const EASE = [0.22, 1, 0.36, 1] as const;
const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, video[controls], [tabindex]:not([tabindex="-1"])';

export default function Reader({ meta, win, mobile, lite }: Props) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [isPresent, safeToRemove] = usePresence();
  const id = meta.id;
  const entry = workEntry(id);
  const { detail, failed } = useDetail(id);
  // The cover gets a dither veil (React Bits' Dither Veil) that your cursor wipes away.
  const [veilOk, setVeilOk] = useState(false);
  useEffect(() => setVeilOk(!lite && !mobile && window.matchMedia('(pointer: fine)').matches), [lite, mobile]);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useMotionValue(1);
  const sy = useMotionValue(1);
  const opacity = useMotionValue(0);
  const veil = useMotionValue(0);

  const index = WORK_INDEX.findIndex((p) => p.id === id);
  const prev = index > 0 ? WORK_INDEX[index - 1] : undefined;
  const next = index >= 0 && index < WORK_INDEX.length - 1 ? WORK_INDEX[index + 1] : undefined;

  // FLIP: start as the card that was clicked, grow to the reader's box.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stops: { stop: () => void }[] = [];
    if (lite) {
      stops.push(animate(opacity, 1, { duration: 0.15 }), animate(veil, 1, { duration: 0.15 }));
    } else if (mobile) {
      y.set(window.innerHeight);
      opacity.set(1);
      stops.push(animate(y, 0, { duration: 0.34, ease: EASE }), animate(veil, 1, { duration: 0.3 }));
    } else {
      const from = openerRect(id);
      const to = el.getBoundingClientRect();
      if (from) {
        x.set(from.left + from.width / 2 - (to.left + to.width / 2));
        y.set(from.top + from.height / 2 - (to.top + to.height / 2));
        sx.set(Math.max(0.05, from.width / to.width));
        sy.set(Math.max(0.05, from.height / to.height));
        opacity.set(0.4);
      } else {
        y.set(24);
        sx.set(0.97);
        sy.set(0.97);
      }
      const t = { duration: 0.46, ease: EASE };
      stops.push(
        animate(x, 0, t),
        animate(y, 0, t),
        animate(sx, 1, t),
        animate(sy, 1, t),
        animate(opacity, 1, { duration: 0.2 }),
        animate(veil, 1, { duration: 0.3 }),
      );
    }
    el.focus({ preventScroll: true });
    return () => stops.forEach((s) => s.stop());
    // Once per open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close: shrink back into the card (or slide down / fade).
  useEffect(() => {
    if (isPresent) return;
    const el = ref.current;
    if (lite || !el) {
      animate(veil, 0, { duration: 0.12 });
      animate(opacity, 0, { duration: 0.12 }).then(safeToRemove);
      return;
    }
    animate(veil, 0, { duration: 0.28 });
    if (mobile) {
      animate(y, window.innerHeight, { duration: 0.26, ease: 'easeIn' }).then(safeToRemove);
      return;
    }
    const to = openerRect(id);
    const box = el.getBoundingClientRect();
    const t = { duration: 0.32, ease: [0.5, 0, 0.75, 0] as const };
    if (to) {
      animate(x, to.left + to.width / 2 - (box.left + box.width / 2), t);
      animate(y, to.top + to.height / 2 - (box.top + box.height / 2), t);
      animate(sx, Math.max(0.05, to.width / box.width), t);
      animate(sy, Math.max(0.05, to.height / box.height), t);
      animate(opacity, 0, { duration: 0.3, ease: 'easeIn' }).then(safeToRemove);
    } else {
      animate(sy, 0.97, t);
      animate(sx, 0.97, t);
      animate(opacity, 0, { duration: 0.2 }).then(safeToRemove);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent]);

  // A new project in the same reader starts at the top.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [id]);

  // ← / → move between projects (unless you're in a form field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement).closest('input, textarea, select, video')) return;
      if (e.key === 'ArrowLeft' && prev) replaceWindow(id, prev.id);
      if (e.key === 'ArrowRight' && next) replaceWindow(id, next.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id, prev, next]);

  // It's modal: Tab stays inside.
  function trapTab(e: React.KeyboardEvent) {
    if (e.key !== 'Tab' || !ref.current) return;
    const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === ref.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const d = detail;
  const page = `/work/${id}/`;

  return (
    <>
      <motion.div
        className="reader-veil pointer-events-auto"
        style={{ opacity: veil, zIndex: win.z }}
        onClick={() => closeWindow(id)}
        aria-hidden="true"
      />
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-window={id}
        data-reader=""
        data-focused=""
        className={'os-window reader pointer-events-auto' + (mobile ? ' reader-sheet' : '')}
        style={{ x, y, scaleX: sx, scaleY: sy, opacity, zIndex: win.z + 1 }}
        onPointerDownCapture={() => focusWindow(id)}
        onKeyDown={trapTab}
      >
        <div className="reader-bar os-titlebar">
          <div className="os-lights flex items-center gap-2">
            <button
              type="button"
              aria-label={`Close ${meta.file}`}
              className="os-light os-light-close"
              onClick={() => closeWindow(id)}
            >
              <svg viewBox="0 0 12 12" aria-hidden="true">
                <path d="M3 3l6 6M9 3l-6 6" />
              </svg>
            </button>
            <button
              type="button"
              aria-label={`Minimize ${meta.file} to the dock`}
              className="os-light os-light-minimize"
              onClick={() => minimizeWindow(id)}
            >
              <svg viewBox="0 0 12 12" aria-hidden="true">
                <path d="M2.5 6h7" />
              </svg>
            </button>
            <a className="os-light os-light-zoom" href={page} aria-label={`Open ${meta.file} as a full page`}>
              <svg viewBox="0 0 12 12" aria-hidden="true">
                <path d="M6 2.5v7M2.5 6h7" />
              </svg>
            </a>
          </div>
          <p className="reader-file">
            ~/work/<strong>{meta.file}</strong>
          </p>
          <p className="reader-count" aria-hidden="true">
            {index + 1}/{WORK_INDEX.length}
          </p>
          {mobile && (
            <button type="button" className="reader-close-text" onClick={() => closeWindow(id)}>
              Close
            </button>
          )}
        </div>

        <div ref={scroller} className="reader-scroll" data-lenis-prevent>
          {failed ? (
            <div className="reader-col">
              <h2 id={titleId} className="reader-title">
                {entry?.title ?? id}
              </h2>
              <p className="reader-summary">
                This couldn&rsquo;t load. <a href={page}>Open the full page</a> instead.
              </p>
            </div>
          ) : !d ? (
            <div className="reader-col" role="status">
              <h2 id={titleId} className="reader-title">
                {entry?.title ?? id}
              </h2>
              <p className="pw-loading">
                <span>loading</span>
                <span className="pw-loading-dots" aria-hidden="true" />
              </p>
            </div>
          ) : (
            <article>
              {d.cover && (
                <div className={`reader-cover pw-cover-${d.cover.fit}`}>
                  {d.clip ? (
                    <video
                      src={d.clip}
                      poster={d.cover.src}
                      controls
                      muted
                      loop
                      playsInline
                      preload="none"
                      aria-label={d.cover.alt}
                    />
                  ) : (
                    <>
                    <img
                      src={d.cover.src}
                      srcSet={d.cover.srcset}
                      sizes="(max-width: 767px) 100vw, 1100px"
                      width={d.cover.width}
                      height={d.cover.height}
                      alt={d.cover.alt}
                      decoding="async"
                    />
                      {veilOk && (
                        <div className="reader-veil-fx" aria-hidden="true">
                          <GlGate priority>
                            <Suspense fallback={null}>
                              <DitherVeil
                                key={d.cover.src}
                                src={d.cover.src}
                                fit={d.cover.fit === 'contain' ? 'contain' : 'cover'}
                                inkColor={navy['950']}
                                paperColor={cream['100']}
                                rimColor={ember['500']}
                                rim={0.5}
                                revealRadius={180}
                                linger={1.4}
                                pixelSize={2}
                              />
                            </Suspense>
                          </GlGate>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              <div className="reader-col">
                <p className="pw-meta reader-meta">
                  <span className="work-folder">{d.folders[0]}/</span>
                  {d.when && <time>{d.when}</time>}
                </p>
                <h2 id={titleId} className="reader-title">
                  {d.title}
                </h2>
                <p className="reader-summary">{d.summary}</p>

                {(d.role || d.result) && (
                  <dl className="work-facts reader-facts">
                    {d.role && (
                      <div>
                        <dt>role</dt>
                        <dd>{d.role}</dd>
                      </div>
                    )}
                    {d.result && (
                      <div>
                        <dt>result</dt>
                        <dd>{d.result}</dd>
                      </div>
                    )}
                  </dl>
                )}

                <div className="reader-prose" dangerouslySetInnerHTML={{ __html: demoteHeadings(d.html) }} />
              </div>

              {d.photos.length > 0 && (
                <section aria-label="Photos" className="reader-photos">
                  <ul>
                    {d.photos.map((ph) => (
                      <li key={ph.src}>
                        <figure>
                          <img
                            src={ph.src}
                            srcSet={ph.srcset}
                            sizes="(max-width: 767px) 90vw, 520px"
                            width={ph.width}
                            height={ph.height}
                            alt={ph.alt}
                            loading="lazy"
                            decoding="async"
                          />
                          {ph.caption && <figcaption>{ph.caption}</figcaption>}
                        </figure>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <div className="reader-col">
                {d.links.length > 0 && (
                  <section aria-label="Links" className="work-links reader-links">
                    <h3>Links</h3>
                    <ul>
                      {d.links.map((l) => (
                        <li key={l.href}>
                          <a href={l.href} target="_blank" rel="noopener noreferrer">
                            {l.label}
                            <Icon name="external-link" className="text-sm" />
                            <span className="sr-only">(opens in a new tab)</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            </article>
          )}

          <nav className="reader-nav" aria-label="More projects">
            {prev ? (
              <button type="button" className="reader-step" onClick={() => replaceWindow(id, prev.id)}>
                <span className="reader-step-dir">← prev</span>
                <span className="reader-step-title">{prev.title}</span>
              </button>
            ) : (
              <span />
            )}
            {next ? (
              <button type="button" className="reader-step reader-step-next" onClick={() => replaceWindow(id, next.id)}>
                <span className="reader-step-dir">next →</span>
                <span className="reader-step-title">{next.title}</span>
              </button>
            ) : (
              <span />
            )}
          </nav>
        </div>
      </motion.div>
    </>
  );
}
