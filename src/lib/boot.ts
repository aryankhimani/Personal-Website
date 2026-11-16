// The boot sequence ("old BIOS meets new OS"). Base.astro's inline script decides whether it
// shows and removes it after 5s (0.5s in Lite) no matter what; this runs the timeline:
//
//   0.0s  CRT power-on: a white line opens into the screen (CSS)
//   0.45s POST log types fast, progress bar starts
//   2.2s  "ARYAN OS" flips in on split-flap tiles (BootTitle island)
//   3.3s  the logo flashes once with Electric Logo
//   4.15s the CRT clicks off into the desktop
//   4.5s  done
//
// Any key or click skips. In Lite / reduced motion it's a single 0.5s fade (CSS only).

type Phase = 'post' | 'title' | 'logo' | 'off';

const AT = { post: 450, title: 2200, logo: 3300, off: 4150, end: 4500 };

function lines(projects: string): [string, string][] {
  // [text, status]. A status is printed after a dot leader once the line has typed.
  return [
    ['ARYAN-OS v2.0  (c) 2026 Aryan Khimani', ''],
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

export function runBoot(): void {
  const root = document.documentElement;
  const boot = document.getElementById('boot');
  const mode = root.dataset.boot;
  if (!mode || !boot) return;

  let done = false;
  const timers: number[] = [];
  const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));

  const end = () => {
    if (!root.dataset.boot) return;
    delete root.dataset.boot;
    delete root.dataset.bootPhase;
    window.dispatchEvent(new Event('aryan-os:boot-done'));
  };

  const setPhase = (p: Phase) => {
    root.dataset.bootPhase = p;
    window.dispatchEvent(new Event('aryan-os:boot-phase'));
  };

  const finish = (skipped: boolean) => {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    window.removeEventListener('keydown', onKey);
    boot.removeEventListener('pointerdown', onClick);
    if (skipped) {
      boot.classList.add('boot-skip-out');
      window.setTimeout(end, 220);
    } else {
      end();
    }
  };
  const onKey = () => finish(true);
  const onClick = () => finish(true);
  window.addEventListener('keydown', onKey);
  boot.addEventListener('pointerdown', onClick);

  if (mode === 'lite') {
    at(500, () => finish(false));
    return;
  }

  const log = document.getElementById('boot-log');
  const bar = document.getElementById('boot-bar');
  const pct = document.getElementById('boot-pct');

  setPhase('post');

  // POST log: each line types in ~2 frames, then its status lands on a dot leader.
  if (log) {
    const rows = lines(log.dataset.projects ?? '');
    const shown: string[] = [];
    let t = AT.post;
    rows.forEach(([text, status], i) => {
      const step = text.length ? Math.max(3, Math.round(70 / text.length)) : 0;
      for (let c = 1; c <= text.length; c += 3) {
        const partial = text.slice(0, c);
        at(t + c * step, () => {
          shown[i] = partial;
          log.textContent = shown.join('\n');
        });
      }
      t += text.length * step + 20;
      const full = status ? `${text} ${'.'.repeat(Math.max(2, WIDTH - text.length))} ${status}` : text;
      at(t, () => {
        shown[i] = full;
        log.textContent = shown.join('\n');
      });
      t += status ? 70 : 30;
    });
  }

  // Progress bar: fills with a couple of stalls, like a real loader.
  if (bar && pct) {
    const start = AT.post;
    const span = AT.off - 150 - start;
    const ease = (x: number) => {
      // Piecewise: quick, stall, quick, stall, finish.
      if (x < 0.35) return (x / 0.35) * 0.48;
      if (x < 0.45) return 0.48 + ((x - 0.35) / 0.1) * 0.04;
      if (x < 0.75) return 0.52 + ((x - 0.45) / 0.3) * 0.36;
      if (x < 0.85) return 0.88 + ((x - 0.75) / 0.1) * 0.02;
      return 0.9 + ((x - 0.85) / 0.15) * 0.1;
    };
    const t0 = performance.now() + start;
    const tick = (now: number) => {
      if (done) return;
      const x = Math.min(1, Math.max(0, (now - t0) / span));
      const v = ease(x);
      bar.style.transform = `scaleX(${v.toFixed(3)})`;
      pct.textContent = `${Math.round(v * 100)}%`;
      if (x < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  at(AT.title, () => setPhase('title'));
  at(AT.logo, () => {
    setPhase('logo');
    boot.classList.add('boot-flash');
  });
  at(AT.off, () => {
    setPhase('off');
    boot.classList.add('boot-off');
  });
  at(AT.end, () => finish(false));
}
