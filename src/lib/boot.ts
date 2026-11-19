// The boot sequence, v4: a CRT terminal boots under an HUD, "ARYAN OS" flips in on split-flap
// tiles in the middle of the rings (BootTitle island), then the tube clicks off into the
// desktop. Base.astro's inline script decides whether it shows and removes it after 5s
// (0.5s in Lite) no matter what; this runs the timeline:
//
//   0.0s  CRT power-on: a white line opens into the screen (CSS)
//   0.3s  HUD rings, ticks and readouts draw in around the AK logo (CSS)
//   0.45s POST log types fast, progress bar starts
//   1.15s the logo gives way and "ARYAN OS" flips in (phase 'title')
//   2.4s  a scan line sweeps the title, "scroll to enter" shows (phase 'ready')
//   3.4s  the CRT clicks off (phase 'off'); scrolling or swiping does this sooner
//   ~3.8s done
//
// Any key or a tap/click skips. In Lite / reduced motion it's a single 0.5s fade (CSS only).

import { lockScroll, unlockScroll } from './scroll';

export type BootPhase = 'post' | 'title' | 'ready' | 'off';

const AT = { post: 450, title: 1150, ready: 2400, off: 3400 };
const OFF_FOR = 380; // ms, the CRT-off animation
const ENTER_MIN = 1500; // ms: a scroll can't cut the boot shorter than this
const QUIET = 250; // ms without wheel/touch before the page scrolls again
const QUIET_MAX = 1200;

function lines(projects: string): [string, string][] {
  // [text, status]. A status is printed after a dot leader once the line has typed.
  return [
    ['ARYAN-OS v4.0  (c) 2026 Aryan Khimani', ''],
    ['', ''],
    ['CPU: curiosity @ 100%', 'OK'],
    [`MEM: ${projects} projects`, 'OK'],
    ['GPU: one canvas at a time', 'OK'],
    ['/research', 'mounted'],
    ['/ventures', 'mounted'],
    ['/code', 'mounted'],
    ['/programs', 'mounted'],
    ['/talks', 'mounted'],
    ['', ''],
    ['starting desktop', '...'],
  ];
}

const WIDTH = 34; // dot leader column
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

export function runBoot(): void {
  const root = document.documentElement;
  const boot = document.getElementById('boot');
  const mode = root.dataset.boot;
  if (!mode || !boot) return;

  let done = false;
  let leaving = false;
  let locked = false;
  let raf = 0;
  const timers: number[] = [];
  const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
  const t0 = performance.now();

  const setPhase = (p: BootPhase) => {
    root.dataset.bootPhase = p;
    window.dispatchEvent(new Event('aryan-os:boot-phase'));
  };

  const end = () => {
    if (!root.dataset.boot) return;
    delete root.dataset.boot;
    delete root.dataset.bootPhase;
    window.dispatchEvent(new Event('aryan-os:boot-done'));
  };

  // Lets go of scrolling. After a scroll-to-enter, the rest of that gesture (trackpad
  // momentum) is swallowed until it goes quiet, so the visitor lands on the hero.
  let lastGesture = 0;
  const release = () => {
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove', onTouchMove);
    if (locked) unlockScroll();
    locked = false;
  };
  const releaseWhenQuiet = (since: number) => {
    const now = performance.now();
    if (now - lastGesture > QUIET || now - since > QUIET_MAX) release();
    else window.setTimeout(() => releaseWhenQuiet(since), QUIET / 2);
  };
  const cleanup = () => {
    timers.forEach(clearTimeout);
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey);
    boot.removeEventListener('pointerdown', onDown);
    boot.removeEventListener('pointerup', onUp);
    releaseWhenQuiet(performance.now());
  };

  const finish = (skipped: boolean) => {
    if (done) return;
    done = true;
    cleanup();
    if (skipped) {
      boot.classList.add('boot-skip-out');
      window.setTimeout(end, 220);
    } else {
      end();
    }
  };

  // The CRT clicks off, then the boot ends.
  const leave = () => {
    if (leaving || done) return;
    leaving = true;
    setPhase('off');
    boot.classList.add('boot-off');
    window.setTimeout(() => finish(false), OFF_FOR);
  };
  // Scrolling enters the desktop (once the title has had a moment), the page stays put.
  const enter = () => {
    const t = performance.now() - t0;
    if (t >= ENTER_MIN) leave();
    else at(ENTER_MIN - t, leave);
  };

  let touchY = 0;
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    lastGesture = performance.now();
    if (e.deltaY > 0) enter();
  };
  const onTouchStart = (e: TouchEvent) => (touchY = e.touches[0]?.clientY ?? 0);
  const onTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    lastGesture = performance.now();
    if (touchY - (e.touches[0]?.clientY ?? touchY) > 30) enter();
  };
  // Any key skips; so does a click or a tap, but not a touch that turns into a swipe.
  let down: { x: number; y: number } | null = null;
  const onKey = () => finish(true);
  const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
  const onUp = (e: PointerEvent) => {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 10) finish(true);
    down = null;
  };
  window.addEventListener('keydown', onKey);
  boot.addEventListener('pointerdown', onDown);
  boot.addEventListener('pointerup', onUp);

  if (mode === 'lite') {
    at(500, () => finish(false));
    return;
  }

  lockScroll();
  locked = true;
  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: false });

  const log = document.getElementById('boot-log');
  const bar = document.getElementById('boot-bar');
  const pct = document.getElementById('boot-pct');
  const clock = document.getElementById('boot-clock');

  setPhase('post');
  at(AT.title, () => setPhase('title'));
  at(AT.ready, () => setPhase('ready'));
  at(AT.off, leave);

  // POST log: each line types in ~2 frames, then its status lands on a dot leader.
  if (log) {
    const rows = lines(log.dataset.projects ?? '');
    const shown: string[] = [];
    let t = AT.post;
    rows.forEach(([text, status], i) => {
      const step = text.length ? Math.max(3, Math.round(60 / text.length)) : 0;
      for (let c = 1; c <= text.length; c += 3) {
        const partial = text.slice(0, c);
        at(t + c * step, () => {
          shown[i] = partial;
          log.textContent = shown.join('\n');
        });
      }
      t += text.length * step + 15;
      const full = status ? `${text} ${'.'.repeat(Math.max(2, WIDTH - text.length))} ${status}` : text;
      at(t, () => {
        shown[i] = full;
        log.textContent = shown.join('\n');
      });
      t += status ? 55 : 25;
    });
  }

  // Progress bar (quick, stall, quick, stall, finish) and the T+ readout.
  const frame = (now: number) => {
    raf = 0;
    if (done) return;
    const t = now - t0;
    const x = leaving ? 1 : clamp01((t - AT.post) / (AT.off - 150 - AT.post));
    const v = x < 0.35 ? (x / 0.35) * 0.48 : x < 0.45 ? 0.48 + (x - 0.35) * 0.4 : x < 0.8 ? 0.52 + ((x - 0.45) / 0.35) * 0.4 : 0.92 + ((x - 0.8) / 0.2) * 0.08;
    if (bar) bar.style.transform = `scaleX(${v.toFixed(3)})`;
    if (pct) pct.textContent = `${Math.round(v * 100)}%`;
    if (clock) clock.textContent = `T+${(t / 1000).toFixed(2)}`;
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
}
