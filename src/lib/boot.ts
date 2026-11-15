// The boot sequence. Base.astro's inline script decides whether it shows (and removes it
// after 2.5s no matter what); this types the lines and ends it early when it's done.

const LINES = ['> booting aryan.os', '> mounting /research', '> mounting /ventures', '> loading curiosity... ok', '> ready.'];
const CHAR_MS = 11;
const LINE_PAUSE_MS = 70;

export function runBoot(): void {
  const root = document.documentElement;
  const boot = document.getElementById('boot');
  const log = document.getElementById('boot-log');
  const ascii = document.getElementById('boot-ascii');
  if (!root.dataset.boot || !boot || !log || !ascii) return;

  let done = false;
  const timers: number[] = [];

  const finish = () => {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    window.removeEventListener('keydown', finish);
    boot.removeEventListener('pointerdown', finish);
    boot.classList.add('boot-out');
    window.setTimeout(() => delete root.dataset.boot, 280);
  };

  window.addEventListener('keydown', finish);
  boot.addEventListener('pointerdown', finish);

  let at = 0;
  LINES.forEach((line, i) => {
    for (let c = 1; c <= line.length; c++) {
      at += CHAR_MS;
      const text = LINES.slice(0, i).join('\n') + (i ? '\n' : '') + line.slice(0, c);
      timers.push(window.setTimeout(() => (log.textContent = text), at));
    }
    at += LINE_PAUSE_MS;
  });
  timers.push(window.setTimeout(() => (ascii.hidden = false), at + 60));
  timers.push(window.setTimeout(finish, at + 520));
}
