// Drives the OS shell in real Chrome and checks the things a person would try:
// open, drag, focus, close, minimize, back button, Lite mode, and the phone layout.
// Usage: node scripts/test-shell.mjs [baseUrl]   (needs `npm run preview` running)
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:4321/';
mkdirSync('.shots', { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const problems = [];
const check = (name, ok, detail = '') => {
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  if (!ok) problems.push(name);
};

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});

async function newPage(viewport) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport(viewport);
  // Skip the boot sequence: it has its own test.
  await page.evaluateOnNewDocument(() => sessionStorage.setItem('aryan-os:booted', '1'));
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
  page.on('console', (m) => m.type() === 'error' && problems.push('console: ' + m.text()));
  await page.goto(base, { waitUntil: 'networkidle2' });
  await sleep(2500); // hero visuals load after idle
  return page;
}
const has = (page, sel) => page.$(sel).then(Boolean);
const rectOf = (page, sel) =>
  page.$eval(sel, (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });

// ---------- Desktop ----------
{
  const page = await newPage({ width: 1440, height: 900 });
  check('lite is off by default on a capable desktop', (await page.$eval('html', (h) => h.dataset.lite)) === 'false');
  // The clock is on split-flap tiles; its text is in a screen-reader span.
  const clock = await page.$eval('.os-menubar .clock-flap .split-flap-text__sr, .os-menubar time', (t) => t.textContent.trim());
  check('clock shows a time', /^\d\d:\d\d$/.test(clock), clock);
  await page.screenshot({ path: '.shots/p1-desk.png' });

  await page.evaluate(() => [...document.querySelectorAll('.os-menubar [role="menuitem"]')].find((b) => b.textContent.trim() === 'File').click());
  await sleep(250);
  await page.evaluate(() => [...document.querySelectorAll('.os-menubar button, .os-menubar a')].find((b) => b.textContent.trim() === 'Open readme.md').click());
  await page.waitForSelector('[data-window="readme"]', { timeout: 4000 }).catch(() => {});
  await sleep(1200); // let the open animation finish before measuring
  check('File > Open readme.md opens its window', await has(page, '[data-window="readme"]'));
  check('URL gets the window hash', page.url().endsWith('#readme'), page.url());
  check('focus moved into the window', await page.evaluate(() => !!document.activeElement?.closest('[data-window="readme"]')));
  const before = await rectOf(page, '[data-window="readme"]');

  // Drag by the title bar.
  await page.mouse.move(before.x + before.w / 2, before.y + 16);
  await page.mouse.down();
  await page.mouse.move(before.x + before.w / 2 + 200, before.y + 16 + 90, { steps: 12 });
  await page.mouse.up();
  await sleep(200);
  const after = await rectOf(page, '[data-window="readme"]');
  check('dragging the title bar moves the window', Math.abs(after.x - before.x - 200) < 6 && Math.abs(after.y - before.y - 90) < 6, `dx=${Math.round(after.x - before.x)} dy=${Math.round(after.y - before.y)}`);

  // Drag far off-screen: it must stay on the desk.
  await page.mouse.move(after.x + after.w / 2, after.y + 16);
  await page.mouse.down();
  await page.mouse.move(-400, -400, { steps: 10 });
  await page.mouse.up();
  await sleep(200);
  const pinned = await rectOf(page, '[data-window="readme"]');
  check('window cannot be dragged off the desk', pinned.x >= 0 && pinned.y >= 31, `x=${pinned.x} y=${pinned.y}`);

  // Second window from the Help menu.
  await page.click('[data-menu-trigger="help"]');
  await sleep(100);
  check('Help menu opens', await has(page, '[data-menu="help"]'));
  await page.screenshot({ path: '.shots/p1-menu.png' });
  await page.click('[data-menu="help"] [role="menuitem"]');
  await sleep(600);
  check('About this site opens', await has(page, '[data-window="about-this-site"]'));
  const z = await page.evaluate(() => [...document.querySelectorAll('[data-window]')].map((w) => [w.dataset.window, +w.style.zIndex, w.hasAttribute('data-focused')]));
  check('newest window is in front and focused', z.find((w) => w[0] === 'about-this-site')?.[2] === true, JSON.stringify(z));
  await page.screenshot({ path: '.shots/p1-windows.png' });

  // Clicking the back window brings it forward.
  const rd = await rectOf(page, '[data-window="readme"]');
  await page.mouse.click(rd.x + 6, rd.y + rd.h - 6);
  await sleep(150);
  check('clicking a window brings it to front', await page.$eval('[data-window="readme"]', (w) => w.hasAttribute('data-focused')));

  await page.keyboard.press('Escape');
  await sleep(500);
  check('Esc closes the front window only', !(await has(page, '[data-window="readme"]')) && (await has(page, '[data-window="about-this-site"]')));

  await page.click('[data-window="about-this-site"] .os-light-minimize');
  await sleep(500);
  check('yellow light minimizes to the dock', !(await has(page, '[data-window="about-this-site"]')) && (await has(page, '.os-dock-minimized')));
  await page.click('.os-dock-minimized');
  await sleep(600);
  check('dock restores the minimized window', await has(page, '[data-window="about-this-site"]'));

  await page.click('[data-window="about-this-site"] .os-light-zoom');
  await sleep(400);
  const zoomed = await rectOf(page, '[data-window="about-this-site"]');
  check('green light fills the desk', zoomed.w === 1440 && zoomed.x === 0, JSON.stringify(zoomed));
  await page.click('[data-window="about-this-site"] .os-light-zoom');
  await sleep(300);

  check('URL hash follows the open window', page.url().endsWith('#about-this-site'), page.url());
  await page.goBack();
  await sleep(600);
  check('back button closes the window', !(await has(page, '[data-window="about-this-site"]')), page.url());

  // Deep link.
  await page.goto(base + '#readme', { waitUntil: 'networkidle2' });
  await sleep(1500);
  check('a shared link (#readme) opens the window on load', await has(page, '[data-window="readme"]'));
  await page.click('[data-window="readme"] .os-light-close');
  await sleep(400);
  check('red light closes', !(await has(page, '[data-window="readme"]')));
  check('hash is cleared after closing', !page.url().includes('#'), page.url());

  // Dock scroll.
  await page.click('.os-dock button[aria-label="Writing"]');
  await sleep(2600);
  const top = await page.$eval('#writing', (el) => Math.round(el.getBoundingClientRect().top));
  check('dock scrolls to a section', Math.abs(top - 32) < 8, `top=${top}`);

  // Lite mode.
  await page.click('.os-menubar .os-switch');
  await sleep(150);
  check('Lite switch turns Lite on', (await page.$eval('html', (h) => h.dataset.lite)) === 'true');
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(800);
  check('Lite choice survives a reload', (await page.$eval('html', (h) => h.dataset.lite)) === 'true');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => [...document.querySelectorAll('.os-menubar [role="menuitem"]')].find((b) => b.textContent.trim() === 'File').click());
  await sleep(250);
  await page.evaluate(() => [...document.querySelectorAll('.os-menubar button, .os-menubar a')].find((b) => b.textContent.trim() === 'Open readme.md').click());
  await sleep(500);
  check('windows still open in Lite', await has(page, '[data-window="readme"]'));
  await page.screenshot({ path: '.shots/p1-lite.png' });
  await page.close();
}

// ---------- Reduced motion ----------
{
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(base, { waitUntil: 'networkidle2' });
  check('reduced motion turns Lite on automatically', (await page.$eval('html', (h) => h.dataset.lite)) === 'true');
  await page.close();
}

// ---------- Phone ----------
{
  const page = await newPage({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.screenshot({ path: '.shots/p1-phone.png' });
  const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, window.innerWidth) - document.documentElement.clientWidth);
  check('no sideways scroll on phone', overflow <= 0, `overflow=${overflow}`);

  await page.evaluate(() => { location.hash = 'readme'; }); // the desktop icons are gone; deep links open windows
  await page.waitForSelector('[data-window="readme"]', { timeout: 4000 }).catch(() => {});
  await sleep(600);
  const sheet = await rectOf(page, '[data-window="readme"]');
  check('phone windows are full-screen sheets', sheet.w === 390 && sheet.h === 844 && sheet.x === 0 && Math.abs(sheet.y) < 1, JSON.stringify(sheet));
  await page.screenshot({ path: '.shots/p1-phone-sheet.png' });
  await page.tap('[data-window="readme"] button');
  await sleep(500);
  check('Close button closes the sheet', !(await has(page, '[data-window="readme"]')));

  await page.waitForSelector('.sm-toggle', { timeout: 5000 }).catch(() => {});
  check('phone menu button is present', await has(page, '.sm-toggle'));
  if (await has(page, '.sm-toggle')) {
    await page.tap('.sm-toggle');
    await sleep(1400);
    await page.screenshot({ path: '.shots/p1-phone-menu.png' });
    const panel = await rectOf(page, '.staggered-menu-panel');
    check('phone menu slides in', Math.abs(panel.x) < 2, JSON.stringify(panel));
    await page.keyboard.press('Escape');
    await sleep(600);
    const closed = await rectOf(page, '.staggered-menu-panel');
    check('Esc closes the phone menu', closed.x >= 389, JSON.stringify(closed));
  }
  await page.close();
}

await browser.close();
console.log(results.join('\n'));
if (problems.length) {
  console.log('\nProblems:\n' + problems.map((p) => ' - ' + p).join('\n'));
  process.exit(1);
}
console.log('\nAll checks passed.');
