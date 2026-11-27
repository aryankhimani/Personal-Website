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
  check('boot screen shows on first visit', await page.evaluate(() => document.documentElement.dataset.boot === 'full'));
  check('name is in the page behind the boot screen', (await page.$eval('h1', (h) => h.textContent)).includes('Aryan Khimani'));
  await page.waitForFunction(() => /MEM: \d+ projects/.test(document.getElementById('boot-log')?.textContent ?? ''), { timeout: 2500 }).catch(() => {});
  const log = await page.$eval('#boot-log', (l) => l.textContent);
  check('POST log is typing', log.includes('ARYAN-OS v4.0') && /MEM: \d+ projects/.test(log), JSON.stringify(log.slice(0, 60)));
  await sleep(1300);
  check('split-flap name is showing', (await page.$$eval('#boot .split-flap-text__tile', (t) => t.length)) >= 8);
  check('hero canvas waits for the boot to finish', (await page.$$eval('.hero-visual canvas', (c) => c.length)) === 0);
  await page.screenshot({ path: '.shots/p2-boot.png' });
  await page.waitForFunction(() => !document.documentElement.dataset.boot, { timeout: 7000 }).catch(() => {});
  const took = Date.now() - started;
  check('boot ends by itself within 5s', !(await page.evaluate(() => document.documentElement.dataset.boot)) && took < 5300, `${took}ms`);
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
  check('reduced motion gets the short fade, not the sequence', (await reduced.evaluate(() => document.documentElement.dataset.boot)) === 'lite');
  await sleep(700);
  check('short fade is gone by 0.7s', !(await reduced.evaluate(() => document.documentElement.dataset.boot)));
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

  // Order: liquid metal, orbits, ASCII, astral, terminal.
  const starsDrawn = () =>
    page.$eval('.hero-visual canvas', (c) => {
      const g = c.getContext('2d');
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let lit = 0;
      for (let i = 3; i < d.length; i += 4 * 97) if (d[i] > 40) lit++;
      return lit;
    });
  await page.click('.hero-switch');
  await sleep(2500);
  check('switch button moves to the orbits hero', (await heroOf(page)) === 'orbits');
  check('still only one canvas after switching', (await canvases(page)) === 1, `canvases=${await canvases(page)}`);
  for (const id of ['ascii', 'astral', 'terminal']) {
    await page.keyboard.press('h');
    await sleep(id === 'astral' ? 1500 : 2500);
    check(`H key moves to the ${id} hero`, (await heroOf(page)) === id);
    check(`one canvas in the ${id} hero`, (await canvases(page)) === 1, `canvases=${await canvases(page)}`);
    if (id === 'astral') {
      const drawn = await starsDrawn();
      check('astral hero draws stars', drawn > 50, `lit samples=${drawn}`);
    }
  }

  await page.click('[data-menu-trigger="view"]');
  await sleep(100);
  const radios = await page.$$eval('[data-menu="view"] [role="menuitemradio"]', (r) => r.map((x) => [x.innerText.trim(), x.getAttribute('aria-checked')]));
  check('View menu lists the heroes with the current one checked', radios.length === 5 && radios[4][1] === 'true', JSON.stringify(radios));
  await page.click('[data-menu="view"] [role="menuitemradio"]');
  await sleep(1500);
  check('View menu switches hero', (await heroOf(page)) === 'liquid-metal');

  await page.keyboard.press('h');
  await sleep(300);
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(1500);
  check('hero choice survives a reload', (await heroOf(page)) === 'orbits');

  // Typing H inside a window must not switch hero.
  await page.evaluate(() => [...document.querySelectorAll('.os-menubar [role="menuitem"]')].find((b) => b.textContent.trim() === 'File').click());
  await sleep(250);
  await page.evaluate(() => [...document.querySelectorAll('.os-menubar button, .os-menubar a')].find((b) => b.textContent.trim() === 'Open readme.md').click());
  await sleep(900);
  await page.keyboard.press('h');
  await sleep(300);
  check('H is ignored while a window has focus', (await heroOf(page)) === 'orbits');
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
  check('Lite swaps the canvas for a still image', lite.canvases === 0 && lite.img === '/hero/orbits.webp' && lite.loaded, JSON.stringify(lite));
  check('Lite shows the full tagline as plain text', lite.line === 'I build AI tools and ship them.', lite.line);
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
