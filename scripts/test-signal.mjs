// The scroll journey as one system: Signal line, HUD tracker, channel changes, lock-ons,
// sound (off by default, no AudioContext until turned on), the ⌘K palette and the ending.
// Usage: node scripts/test-signal.mjs [baseUrl]
import puppeteer from 'puppeteer-core';
const base = (process.argv[2] || 'http://localhost:4321/').replace(/\/?$/, '/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fail = 0;
const check = (name, ok, info = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? `  ${info}` : ''}`);
  if (!ok) fail++;
};
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });

async function open({ width = 1440, height = 900, motion = 'no-preference', touch = false } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, isMobile: touch, hasTouch: touch });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: motion }]);
  await page.evaluateOnNewDocument(() => {
    sessionStorage.setItem('aryan-os:booted', '1');
    window.__ac = 0;
    const AC = window.AudioContext;
    window.AudioContext = class extends AC { constructor(...a) { super(...a); window.__ac++; } };
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(base, { waitUntil: 'networkidle2' });
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 900) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
    scrollTo(0, 0);
  });
  await sleep(2500);
  return { page, errors };
}

// ---------- desktop ----------
{
  const { page, errors } = await open();
  const s = await page.evaluate(() => ({
    d: document.querySelector('.signal-core')?.getAttribute('d')?.length ?? 0,
    sub: (document.querySelector('.signal-core')?.getAttribute('d') ?? '').slice(1).search(/[Mmz]/),
    notches: document.querySelectorAll('.sig-hud-notch').length,
    sound: document.documentElement.dataset.sound,
    ac: window.__ac,
  }));
  check('the Signal is one continuous path (no sub-paths)', s.d > 1000 && s.sub === -1, `len ${s.d}`);
  check('HUD tracker has a notch per sector', s.notches === 7);
  check('sound is off by default and no AudioContext exists', s.sound === 'off' && s.ac === 0);

  const off0 = await page.$eval('.signal-core', (e) => parseFloat(e.style.strokeDashoffset));
  await page.evaluate(() => document.getElementById('journey').scrollIntoView());
  await sleep(1500);
  const after = await page.evaluate(() => ({
    off: parseFloat(document.querySelector('.signal-core').style.strokeDashoffset),
    num: document.querySelector('.sig-hud-num b').textContent,
    path: document.querySelector('.sig-hud-path').textContent,
    lock: !!document.querySelector('#journey .lock-box.on'),
  }));
  check('scrolling draws more of the line', after.off < off0, `${off0.toFixed(0)} -> ${after.off.toFixed(0)}`);
  check('the HUD ticks to the Journey sector', after.num === '04' && after.path === '~/journey', `${after.num} ${after.path}`);
  check('the Journey title locks on', after.lock);

  await page.click('.sig-hud-notch[aria-label^="Sector 03"]');
  await sleep(2600);
  const work = await page.evaluate(() => Math.abs(document.getElementById('work').getBoundingClientRect().top) < 120);
  check('clicking a HUD notch jumps to that sector', work);

  // Sound on: one click creates the context.
  await page.click('.os-sound');
  await sleep(300);
  const on = await page.evaluate(() => ({ s: document.documentElement.dataset.sound, ac: window.__ac, stored: localStorage.getItem('aryan-os:sound') }));
  check('the speaker turns sound on, remembered', on.s === 'on' && on.ac === 1 && on.stored === 'on', JSON.stringify(on));
  await page.click('.os-sound');

  // Palette.
  await page.keyboard.down('Control');
  await page.keyboard.press('k');
  await page.keyboard.up('Control');
  await sleep(700);
  check('Ctrl+K opens the command palette, input focused', await page.evaluate(() => document.activeElement?.classList.contains('palette-input')));
  await page.keyboard.type('journey');
  await sleep(150);
  const first = await page.$eval('.palette-item[aria-selected="true"] .palette-label', (e) => e.textContent);
  check('typing filters to the best match', first === 'Journey', first);
  await page.keyboard.press('Enter');
  await sleep(2600);
  const jumped = await page.evaluate(() => !document.querySelector('.palette') && document.getElementById('journey').getBoundingClientRect().top < 200);
  check('Enter runs it (jumps to Journey) and closes', jumped);
  await page.keyboard.down('Control');
  await page.keyboard.press('k');
  await page.keyboard.up('Control');
  await sleep(400);
  await page.keyboard.press('Escape');
  await sleep(200);
  check('Esc closes the palette', !(await page.$('.palette')));

  // The end.
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await sleep(4500);
  const end = await page.evaluate(() => ({
    off: parseFloat(document.querySelector('.signal-core').style.strokeDashoffset),
    text: document.querySelector('.signal-end').textContent,
  }));
  check('at the bottom the line finishes and the end line types', end.off < 3 && end.text.startsWith('> end of transmission'), JSON.stringify(end));
  const up = await page.$eval('.systray-up', (e) => e.textContent);
  check('menu bar shows uptime', /^uptime \d\d:\d\d/.test(up), up);
  check('no console errors (desktop)', errors.length === 0, errors.slice(0, 2).join(' | '));
  await page.close();
}

// ---------- reduced motion ----------
{
  const { page, errors } = await open({ motion: 'reduce' });
  const r = await page.evaluate(() => ({
    off: parseFloat(document.querySelector('.signal-core').style.strokeDashoffset),
    end: document.querySelector('.signal-end').textContent,
  }));
  check('reduced motion: the whole line is drawn, still', r.off === 0 && r.end.length > 10, JSON.stringify(r));
  await page.evaluate(() => document.getElementById('writing').scrollIntoView());
  await sleep(800);
  const styled = await page.evaluate(() => [...document.querySelectorAll('main > section')].some((s) => s.style.transform || s.style.clipPath));
  check('reduced motion: no channel-change transforms', !styled);
  check('no console errors (reduced motion)', errors.length === 0, errors.slice(0, 2).join(' | '));
  await page.close();
}

// ---------- phone ----------
{
  const { page, errors } = await open({ width: 390, height: 844, touch: true });
  const m = await page.evaluate(() => ({
    layer: document.querySelector('.signal-layer')?.hidden,
    trace: document.querySelector('.signal-trace')?.hidden,
    hud: getComputedStyle(document.querySelector('.sig-hud')).display,
    wide: document.documentElement.scrollWidth,
  }));
  check('phone: progress trace instead of the full line, no HUD, no sideways scroll', m.layer === true && m.trace === false && m.hud === 'none' && m.wide === 390, JSON.stringify(m));
  check('no console errors (phone)', errors.length === 0, errors.slice(0, 2).join(' | '));
  await page.close();
}

await browser.close();
console.log(fail ? `\n${fail} failed.` : '\nAll checks passed.');
process.exit(fail ? 1 : 0);
