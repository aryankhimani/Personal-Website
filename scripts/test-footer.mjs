// Footer checks: CTA + links, crowd canvas draws, moves on screen, holds still in Lite,
// no sideways scroll on phone. Usage: node scripts/test-footer.mjs [url] [--shots dir]
import puppeteer from 'puppeteer-core';
const base = process.argv[2]?.startsWith('http') ? process.argv[2] : 'http://localhost:4321/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fail = 0;
const check = (name, ok, info = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? `  ${info}` : ''}`);
  if (!ok) fail++;
};
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const shotsAt = process.argv.indexOf('--shots');
const errors = [];

async function open(viewport, lite = false) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport(viewport);
  await page.evaluateOnNewDocument((lite) => {
    sessionStorage.setItem('aryan-os:booted', '1');
    if (lite) localStorage.setItem('aryan-os:lite', 'on');
  }, lite);
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(base, { waitUntil: 'networkidle2' });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await sleep(1500);
  await page.evaluate(() => document.querySelector('.foot-crowd')?.scrollIntoView({ block: 'center' }));
  await sleep(1200);
  return page;
}

// A cheap fingerprint of the canvas pixels.
const sample = (page) =>
  page.$eval('.foot-crowd-canvas', (c) => {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let sum = 0;
    let lit = 0;
    for (let i = 3; i < d.length; i += 4 * 7) {
      sum += d[i] * (i % 997);
      if (d[i]) lit++;
    }
    return { sum, lit };
  });

const desk = await open({ width: 1440, height: 900 });
check('"Let\'s build something." is there', (await desk.$eval('.foot-title', (h) => h.textContent)).includes('build something'));
check('four contact links', (await desk.$$('.foot-links a')).length === 4);
const a = await sample(desk);
check('crowd canvas draws', a.lit > 200, `lit=${a.lit}`);
await sleep(600);
const b = await sample(desk);
check('crowd moves', a.sum !== b.sum);
if (shotsAt > -1) await desk.screenshot({ path: `${process.argv[shotsAt + 1]}/footer-desktop.png` });

const lite = await open({ width: 1440, height: 900 }, true);
const c = await sample(lite);
await sleep(600);
const d = await sample(lite);
check('Lite draws a still frame', c.lit > 200 && c.sum === d.sum, `lit=${c.lit}`);

const phone = await open({ width: 390, height: 844, isMobile: true, hasTouch: true });
const over = await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check('no sideways scroll on phone', over <= 0, `overflow=${over}`);
if (shotsAt > -1) await phone.screenshot({ path: `${process.argv[shotsAt + 1]}/footer-phone.png` });

check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
console.log(fail ? `\n${fail} failed.` : '\nAll checks passed.');
process.exit(fail ? 1 : 0);
