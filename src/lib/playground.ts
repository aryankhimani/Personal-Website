// ~/playground.fig: four cursors (four sides of me) build a small card on a design canvas,
// like a multiplayer Figma file. Idea from github.com/DhvanilPatel/swarm-cursors; this is a
// scripted version written for this site, using only the Web Animations API.
//
// The finished card is the page's default state, so without JavaScript, in Lite mode or with
// reduced motion, visitors see the end result with the cursors parked. The animation plays
// once when the canvas is mostly on screen, stops (and snaps to the end) if it scrolls away,
// and can be replayed.
//
// Pace: "normal" (default, about 1.7x the original timing) or "hyper speed" (about 3.5x, and
// it loops while on screen). Moves overshoot a little and parked cursors bob, so they feel
// alive. While the frame is dragged out it shows a live W x H badge (from the old swarm
// rebuild, which this replaces).

import { isLite, onLiteChange } from './device-tier';

type Box = { x: number; y: number; w: number; h: number };
type Who = 'designer' | 'researcher' | 'engineer' | 'founder';

const EASE = 'cubic-bezier(0.34, 1.32, 0.64, 1)'; // a small overshoot
export type Pace = 'normal' | 'hyper';
const SPEED: Record<Pace, number> = { normal: 1.7, hyper: 3.5 };

class Aborted extends Error {}

export function initPlayground(root: HTMLElement): { setPace: (p: Pace) => void } {
  const canvas = root.querySelector<HTMLElement>('[data-canvas]')!;
  const card = root.querySelector<HTMLElement>('[data-el="card"]')!;
  const heading = root.querySelector<HTMLElement>('[data-el="heading"]')!;
  const body = root.querySelector<HTMLElement>('[data-el="body"]')!;
  const button = root.querySelector<HTMLElement>('[data-el="button"]')!;
  const select = root.querySelector<HTMLElement>('[data-select]')!;
  const props = root.querySelector<HTMLElement>('[data-props]')!;
  const replay = root.querySelector<HTMLButtonElement>('[data-replay]')!;
  const layers = [...root.querySelectorAll<HTMLElement>('[data-layer]')];
  const cursors = Object.fromEntries(
    [...root.querySelectorAll<HTMLElement>('[data-cursor]')].map((c) => [c.dataset.cursor, c]),
  ) as Record<Who, HTMLElement>;

  const headingText = heading.textContent ?? '';
  const bodyText = body.textContent ?? '';
  const finalProps = props.innerHTML;

  let controller: AbortController | null = null;
  let played = false;
  let pace: Pace = 'normal';
  let onScreen = false;
  let loopTimer = 0;
  const T = (ms: number) => ms / SPEED[pace];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const badge = document.createElement('span');
  badge.className = 'fig-size';
  badge.hidden = true;
  canvas.append(badge);

  // ---------- helpers ----------

  const rel = (el: Element): Box => {
    const c = canvas.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height };
  };

  const check = (signal: AbortSignal) => {
    if (signal.aborted) throw new Aborted();
  };

  const wait = (ms: number, signal: AbortSignal) =>
    new Promise<void>((resolve, reject) => {
      const t = window.setTimeout(resolve, T(ms));
      signal.addEventListener('abort', () => (window.clearTimeout(t), reject(new Aborted())), { once: true });
    });

  /** Animate to a keyframe, then keep it as the element's own style. */
  async function to(el: HTMLElement, frame: Keyframe, ms: number, signal: AbortSignal, easing = EASE) {
    check(signal);
    const anim = el.animate([frame], { duration: T(ms), easing, fill: 'forwards' });
    signal.addEventListener('abort', () => anim.cancel(), { once: true });
    try {
      await anim.finished;
    } catch {
      throw new Aborted();
    }
    anim.commitStyles();
    anim.cancel();
  }

  const place = (who: Who, x: number, y: number) => (cursors[who].style.transform = `translate(${x}px, ${y}px)`);
  const moveTo = (who: Who, x: number, y: number, ms: number, signal: AbortSignal) =>
    to(cursors[who], { transform: `translate(${x}px, ${y}px)` }, ms, signal);

  function selectBox(b: Box | null, who?: Who) {
    if (!b) {
      select.hidden = true;
      return;
    }
    select.hidden = false;
    select.style.cssText = `left:${b.x - 3}px;top:${b.y - 3}px;width:${b.w + 6}px;height:${b.h + 6}px`;
    if (who) select.dataset.who = who;
  }

  function showProps(rows: [string, string][]) {
    props.innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  }

  const showLayer = (name: string) => layers.find((l) => l.dataset.layer === name)?.removeAttribute('hidden');

  async function type(el: HTMLElement, text: string, signal: AbortSignal, ms = 55) {
    el.textContent = '';
    el.dataset.typing = '';
    for (const ch of text) {
      check(signal);
      el.textContent += ch;
      await wait(ch === ' ' ? ms * 1.6 : ms, signal);
    }
    delete el.dataset.typing;
  }

  // ---------- states ----------

  /** Where each cursor rests beside the finished card, kept fully inside the canvas
   *  (on a phone the card nearly fills it). */
  function restingSpots(c: Box, h: Box, bd: Box, bt: Box): Record<Who, [number, number]> {
    const inside = (who: Who, x: number, y: number): [number, number] => [
      Math.min(x, canvas.clientWidth - cursors[who].offsetWidth - 6),
      y,
    ];
    return {
      designer: inside('designer', c.x + c.w - 14, c.y + c.h - 10),
      researcher: inside('researcher', h.x + h.w + 6, h.y + h.h * 0.5),
      engineer: inside('engineer', bd.x + bd.w * 0.7, bd.y + bd.h + 4),
      founder: inside('founder', bt.x + bt.w - 10, bt.y + bt.h - 6),
    };
  }

  function parkCursors() {
    const spots = restingSpots(rel(card), rel(heading), rel(body), rel(button));
    for (const who of Object.keys(spots) as Who[]) place(who, ...spots[who]);
  }

  /** The finished card: what everyone sees without the animation. */
  function finish() {
    window.clearTimeout(loopTimer);
    badge.hidden = true;
    controller?.abort();
    controller = null;
    root.removeAttribute('data-playing');
    card.style.clipPath = '';
    heading.textContent = headingText;
    body.textContent = bodyText;
    delete heading.dataset.typing;
    delete body.dataset.typing;
    for (const el of [heading, body, button]) {
      el.style.opacity = '';
      el.style.transform = '';
    }
    button.dataset.filled = '';
    layers.forEach((l) => l.removeAttribute('hidden'));
    props.innerHTML = finalProps;
    selectBox(null);
    for (const c of Object.values(cursors)) {
      c.getAnimations().forEach((a) => a.cancel());
      c.style.opacity = '';
    }
    parkCursors();
    replay.hidden = isLite();
  }

  function reset() {
    const c = canvas.getBoundingClientRect();
    card.style.clipPath = 'inset(0 100% 100% 0 round 10px)';
    heading.textContent = '';
    body.textContent = '';
    button.style.opacity = '0';
    button.style.transform = 'scale(0.6)';
    delete button.dataset.filled;
    layers.forEach((l) => l.setAttribute('hidden', ''));
    showProps([['Selection', 'None']]);
    selectBox(null);
    // Cursors wait just outside the canvas, one per edge.
    place('designer', -40, c.height * 0.2);
    place('researcher', c.width * 0.3, -40);
    place('engineer', c.width + 20, c.height * 0.55);
    place('founder', c.width * 0.65, c.height + 20);
  }

  async function play(signal: AbortSignal) {
    root.dataset.playing = '';
    replay.hidden = true;
    // Measure the finished layout first: once the text is cleared, the boxes shrink.
    const c = rel(card);
    const h = rel(heading);
    const bd = rel(body);
    const bt = rel(button);
    reset();
    await wait(250, signal);

    // Everyone arrives.
    await Promise.all([
      moveTo('designer', c.x - 18, c.y - 16, 700, signal),
      moveTo('researcher', c.x + c.w * 0.45, c.y - 46, 800, signal),
      moveTo('engineer', c.x + c.w + 30, c.y + c.h * 0.5, 750, signal),
      moveTo('founder', c.x + c.w * 0.7, c.y + c.h + 36, 850, signal),
    ]);
    await wait(150, signal);

    // designer drags out the frame.
    await moveTo('designer', c.x, c.y, 250, signal);
    showLayer('frame');
    const drag = 900;
    badge.hidden = false;
    const t0 = performance.now();
    let raf = requestAnimationFrame(function size() {
      const k = Math.min(1, (performance.now() - t0) / T(drag));
      const e = 1 - Math.pow(1 - k, 3);
      badge.textContent = `${Math.round(c.w * e)} × ${Math.round(c.h * e)}`;
      badge.style.transform = `translate(${c.x + c.w * e + 10}px, ${c.y + c.h * e + 10}px)`;
      if (k < 1) raf = requestAnimationFrame(size);
    });
    signal.addEventListener('abort', () => cancelAnimationFrame(raf), { once: true });
    await Promise.all([
      moveTo('designer', c.x + c.w, c.y + c.h, drag, signal),
      to(card, { clipPath: 'inset(0 0% 0% 0 round 10px)' }, drag, signal, 'cubic-bezier(0.22, 1, 0.36, 1)'),
    ]);
    badge.hidden = true;
    selectBox(c, 'designer');
    showProps([
      ['Frame', 'hi-card'],
      ['Size', `${Math.round(c.w)} × ${Math.round(c.h)}`],
      ['Fill', '#F2EBDD'],
      ['Radius', '10'],
    ]);
    await wait(300, signal);

    // researcher writes the heading.
    await moveTo('researcher', h.x + 4, h.y + h.h * 0.5, 450, signal);
    showLayer('heading');
    selectBox(h, 'researcher');
    showProps([
      ['Text', 'Heading'],
      ['Font', 'Bricolage Grotesque'],
      ['Weight', '400'],
    ]);
    await Promise.all([
      type(heading, headingText, signal),
      to(cursors.researcher, { transform: `translate(${h.x + h.w + 6}px, ${h.y + h.h * 0.5}px)` }, headingText.length * 62, signal, 'linear'),
    ]);
    await wait(200, signal);

    // engineer writes the body.
    await moveTo('engineer', bd.x + 2, bd.y + bd.h * 0.5, 450, signal);
    showLayer('body');
    selectBox(bd, 'engineer');
    showProps([
      ['Text', 'Body'],
      ['Font', 'Atkinson Hyperlegible'],
      ['Size', '15'],
    ]);
    await Promise.all([
      type(body, bodyText, signal, 32),
      to(cursors.engineer, { transform: `translate(${bd.x + bd.w * 0.7}px, ${bd.y + bd.h + 4}px)` }, bodyText.length * 36, signal, 'linear'),
    ]);
    await wait(200, signal);

    // founder drops in the button, then fills it.
    await moveTo('founder', bt.x + bt.w * 0.5, bt.y + bt.h * 0.5, 500, signal);
    showLayer('button');
    await to(button, { opacity: '1', transform: 'scale(1)' }, 280, signal, 'cubic-bezier(0.34, 1.56, 0.64, 1)');
    selectBox(bt, 'founder');
    showProps([
      ['Button', 'Say hi'],
      ['Fill', 'None'],
    ]);
    await wait(450, signal);
    button.dataset.filled = '';
    showProps([
      ['Button', 'Say hi'],
      ['Fill', '#FF4A2B'],
    ]);
    await wait(600, signal);

    // Done: deselect and step back.
    selectBox(null);
    showProps([['Selection', 'None']]);
    const spots = restingSpots(c, h, bd, bt);
    await Promise.all((Object.keys(spots) as Who[]).map((who) => moveTo(who, ...spots[who], 500, signal)));
    root.removeAttribute('data-playing');
    props.innerHTML = finalProps;
    replay.hidden = false;
    controller = null;
    // Hyper speed keeps going while it's on screen.
    if (pace === 'hyper' && onScreen) loopTimer = window.setTimeout(start, 900);
  }

  function start() {
    window.clearTimeout(loopTimer);
    if (isLite() || reduced.matches) return finish();
    controller?.abort();
    const c = new AbortController();
    controller = c;
    played = true;
    play(c.signal).catch((err) => {
      if (!(err instanceof Aborted)) throw err;
    });
  }

  // ---------- wiring ----------

  finish();

  new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.intersectionRatio >= 0.1;
      root.toggleAttribute('data-onscreen', onScreen);
      if (entry.intersectionRatio >= 0.55 && !played && !isLite() && !reduced.matches) start();
      // Scrolled away mid-build: stop and show the finished card, and build it again from the
      // start next time it's on screen (it never got to finish).
      else if (entry.intersectionRatio < 0.1 && controller) {
        finish();
        played = false;
      }
    },
    { threshold: [0, 0.1, 0.55] },
  ).observe(canvas);

  replay.addEventListener('click', start);
  onLiteChange(finish);
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => !controller && parkCursors(), 150);
  });

  return {
    setPace(p: Pace) {
      pace = p;
      root.dataset.pace = p;
      if (isLite() || reduced.matches) return;
      if (onScreen) start();
      else played = false;
    },
  };
}
