// The scroll journey as one system: Signal conduit, HUD tracker, channel changes, lock-ons,
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
  const s = await page.evaluate(() => {
    const cv = document.querySelector('.conduit-cv')?.getBoundingClientRect();
    const workLeft = Math.min(...[...document.querySelectorAll('#work .gf-body, #work h2, #about .me-window')].map((e) => e.getBoundingClientRect().left));
    return {
      mode: document.querySelector('.conduit')?.dataset.mode,
      right: cv?.right ?? 999,
      workLeft,
      old: document.querySelectorAll('.signal-layer, .signal-trace').length,
      notches: document.querySelectorAll('.sig-hud-notch').length,
      sound: document.documentElement.dataset.sound,
      ac: window.__ac,
    };
  });
  check('the conduit lives in the left gutter only (never over cards or text)', s.mode === 'wide' && s.right <= s.workLeft && s.old === 0, JSON.stringify(s));
  check('HUD tracker has a notch per sector', s.notches === 7);
  check('sound is off by default and no AudioContext exists', s.sound === 'off' && s.ac === 0);

  const next0 = await page.$eval('.sig-next-p', (e) => e.textContent);
  await page.evaluate(() => document.getElementById('journey').scrollIntoView());
  await sleep(250);
  const spark = await page.evaluate(() => !document.querySelector('.conduit-spark').hidden);
  await sleep(1300);
  const after = await page.evaluate(() => ({
    next: document.querySelector('.sig-next-p').textContent,
    num: document.querySelector('.sig-hud-num b').textContent,
    path: document.querySelector('.sig-hud-path').textContent,
    lock: !!document.querySelector('#journey .lock-box.on'),
    opacity: getComputedStyle(document.querySelector('.conduit')).opacity,
  }));
  check('the NEXT label updates per sector', next0 === '~/me.md' && after.next === '~/playground.fig', `${next0} -> ${after.next}`);
  check('a spark arcs into the arriving title', spark);
  check('the conduit stays visible through channel changes', after.opacity === '1', after.opacity);
  check('the HUD ticks to the Journey sector', after.num === '04' && after.path === '~/journey', `${after.num} ${after.path}`);
  check('the Journey title locks on', after.lock);

  // Overlays: the conduit hides under any open folder page or reader.
  for (const hash of ['#work/ventures', '#work/jobby']) {
    await page.evaluate((h) => (location.hash = h), hash);
    await sleep(1200);
    const hid = await page.evaluate(() => ({
      dialog: !!document.querySelector('[role="dialog"]'),
      vis: getComputedStyle(document.querySelector('.conduit')).visibility,
    }));
    check(`${hash}: no conduit over the overlay`, hid.dialog && hid.vis === 'hidden', JSON.stringify(hid));
    await page.keyboard.press('Escape');
    await sleep(600);
  }
  await page.evaluate(() => history.replaceState(null, '', location.pathname));
  await page.keyboard.press('Escape');
  await sleep(600);
  check('the conduit comes back when the overlay closes', await page.$eval('.conduit', (e) => getComputedStyle(e).visibility === 'visible'));

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
    off: parseFloat(document.querySelector('.signal-sig .signal-core').style.strokeDashoffset),
    text: document.querySelector('.signal-end').textContent,
  }));
  check('at the bottom it signs Aryan and the end line types', end.off < 3 && end.text.startsWith('> end of transmission'), JSON.stringify(end));
  const up = await page.$eval('.systray-up', (e) => e.textContent);
  check('menu bar shows uptime', /^uptime \d\d:\d\d/.test(up), up);
  check('no console errors (desktop)', errors.length === 0, errors.slice(0, 2).join(' | '));
  await page.close();
}

// ---------- reduced motion ----------
{
  const { page, errors } = await open({ motion: 'reduce' });
  const r = await page.evaluate(() => ({
    off: parseFloat(document.querySelector('.signal-sig .signal-core').style.strokeDashoffset),
    end: document.querySelector('.signal-end').textContent,
    spark: getComputedStyle(document.querySelector('.conduit-spark')).display,
  }));
  check('reduced motion: signature drawn, still, no sparks', r.off === 0 && r.end.length > 10 && r.spark === 'none', JSON.stringify(r));
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
    mode: document.querySelector('.conduit')?.dataset.mode,
    w: document.querySelector('.conduit-cv').getBoundingClientRect().width,
    label: document.querySelector('.sig-next').hidden,
    hud: getComputedStyle(document.querySelector('.sig-hud')).display,
    wide: document.documentElement.scrollWidth,
  }));
  check('phone: thin progress conduit on the left edge, no label, no HUD, no sideways scroll', m.mode === 'thin' && m.w <= 14 && m.label && m.hud === 'none' && m.wide === 390, JSON.stringify(m));
  check('no console errors (phone)', errors.length === 0, errors.slice(0, 2).join(' | '));
  await page.close();
}

await browser.close();
console.log(fail ? `\n${fail} failed.` : '\nAll checks passed.');
process.exit(fail ? 1 : 0);
