// Checks the hero, the hero switcher and the boot sequence in real Chrome.
// Usage: node scripts/test-hero.mjs [baseUrl]   (needs `npm run preview` running)
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
async function open(url, { booted = true, viewport = { width: 1440, height: 900 }, media } = {}) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport(viewport);
  if (media) await page.emulateMediaFeatures(media);
  if (booted) await page.evaluateOnNewDocument(() => sessionStorage.setItem('aryan-os:booted', '1'));
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
  page.on('console', (m) => m.type() === 'error' && problems.push('console: ' + m.text()));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  return page;
}
const heroOf = (page) => page.$eval('.hero', (h) => h.dataset.hero);
const canvases = (page) => page.$$eval('.hero-visual canvas', (c) => c.length);

// ---------- Boot ----------
{
  const page = await open(base, { booted: false });
  const started = Date.now();
  check('boot screen shows on first visit', await page.evaluate(() => document.documentElement.dataset.boot === '1'));
  check('name is in the page behind the boot screen', (await page.$eval('h1', (h) => h.textContent)).includes('Aryan Khimani'));
  await sleep(900);
  const log = await page.$eval('#boot-log', (l) => l.textContent);
  check('boot lines are typing', log.includes('booting aryan.os'), JSON.stringify(log.slice(0, 40)));
  await page.screenshot({ path: '.shots/p2-boot.png' });
  await page.waitForFunction(() => !document.documentElement.dataset.boot, { timeout: 4000 }).catch(() => {});
  const took = Date.now() - started;
  check('boot ends by itself within 2.5s', !(await page.evaluate(() => document.documentElement.dataset.boot)) && took < 2700, `${took}ms`);
  await page.reload({ waitUntil: 'domcontentloaded' });
  check('boot is skipped on the next page load', !(await page.evaluate(() => document.documentElement.dataset.boot)));
  await page.close();

  const skip = await open(base, { booted: false });
  await sleep(300);
  await skip.keyboard.press('Space');
  await sleep(450);
  check('any key skips the boot screen', !(await skip.evaluate(() => document.documentElement.dataset.boot)));
  await skip.close();

  const reduced = await open(base, { booted: false, media: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  check('no boot screen with reduced motion', !(await reduced.evaluate(() => document.documentElement.dataset.boot)));
  await reduced.close();

  const deep = await open(base + '#readme', { booted: false });
  check('no boot screen on a shared window link', !(await deep.evaluate(() => document.documentElement.dataset.boot)));
  await deep.close();
}

// ---------- Hero and switcher ----------
{
  const page = await open(base);
  await page.waitForNetworkIdle({ idleTime: 500 }).catch(() => {});
  await sleep(2500);
  check('default hero is liquid metal', (await heroOf(page)) === 'liquid-metal');
  check('exactly one canvas runs in the hero', (await canvases(page)) === 1, `canvases=${await canvases(page)}`);
  const h1 = await page.$$eval('h1', (hs) => hs.map((h) => h.innerText.replace(/\s+/g, ' ').trim()));
  check('one h1 with the name', h1.length === 1 && h1[0].includes('Aryan Khimani'), JSON.stringify(h1));
  const line1 = await page.$eval('.hero-line', (p) => p.innerText.replace(/\s+/g, ' '));
  await sleep(3000);
  const line2 = await page.$eval('.hero-line', (p) => p.innerText.replace(/\s+/g, ' '));
  check('tagline rotates', line1 !== line2 && line2.startsWith('I '), `${line1} -> ${line2}`);

  await page.click('.hero-switch');
  await sleep(2500);
  check('switch button moves to the ASCII hero', (await heroOf(page)) === 'ascii');
  check('still only one canvas after switching', (await canvases(page)) === 1, `canvases=${await canvases(page)}`);
  await page.keyboard.press('h');
  await sleep(2500);
  check('H key moves to the terminal hero', (await heroOf(page)) === 'terminal');
  check('one canvas in the terminal hero', (await canvases(page)) === 1, `canvases=${await canvases(page)}`);

  await page.click('[data-menu-trigger="view"]');
  await sleep(100);
  const radios = await page.$$eval('[data-menu="view"] [role="menuitemradio"]', (r) => r.map((x) => [x.innerText.trim(), x.getAttribute('aria-checked')]));
  check('View menu lists the heroes with the current one checked', radios.length === 3 && radios[2][1] === 'true', JSON.stringify(radios));
  await page.click('[data-menu="view"] [role="menuitemradio"]');
  await sleep(1500);
  check('View menu switches hero', (await heroOf(page)) === 'liquid-metal');

  await page.keyboard.press('h');
  await sleep(300);
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(1500);
  check('hero choice survives a reload', (await heroOf(page)) === 'ascii');

  // Typing H inside a window must not switch hero.
  await page.click('.os-desktop-icon');
  await sleep(900);
  await page.keyboard.press('h');
  await sleep(300);
  check('H is ignored while a window has focus', (await heroOf(page)) === 'ascii');
  await page.keyboard.press('Escape');
  await sleep(400);

  // Open my work scrolls.
  await page.click('.hero-cta');
  await sleep(1800);
  const top = await page.$eval('#work', (el) => Math.round(el.getBoundingClientRect().top));
  check('"Open my work" scrolls to the work section', Math.abs(top - 32) < 8, `top=${top}`);

  // Lite: stills instead of canvases.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click('.os-menubar .os-switch');
  await sleep(800);
  const lite = await page.evaluate(() => ({
    canvases: document.querySelectorAll('.hero-visual canvas').length,
    img: document.querySelector('.hero-visual img')?.getAttribute('src'),
    loaded: document.querySelector('.hero-visual img')?.naturalWidth > 0,
    line: document.querySelector('.hero-line').innerText,
  }));
  check('Lite swaps the canvas for a still image', lite.canvases === 0 && lite.img === '/hero/ascii.webp' && lite.loaded, JSON.stringify(lite));
  check('Lite shows the full tagline as plain text', lite.line === 'I research gene editing, build AI tools and start ventures.', lite.line);
  await page.screenshot({ path: '.shots/p2-lite.png' });
  await page.close();
}

// ---------- Links ----------
{
  const page = await open(base);
  const links = await page.$$eval('.hero-actions a[target="_blank"]', (as) => as.map((a) => [a.href, a.rel]));
  check('external hero links use rel=noopener noreferrer', links.length === 3 && links.every((l) => l[1] === 'noopener noreferrer'), JSON.stringify(links.map((l) => l[0])));
  await page.close();
}

await browser.close();
console.log(results.join('\n'));
if (problems.length) {
  console.log('\nProblems:\n' + problems.map((p) => ' - ' + p).join('\n'));
  process.exit(1);
}
console.log('\nAll checks passed.');
