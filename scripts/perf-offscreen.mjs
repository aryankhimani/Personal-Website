// Finds animation loops that keep running while their section is off-screen.
// Wraps requestAnimationFrame, parks the page at each section, and prints which source files
// still request frames there. Usage: node scripts/perf-offscreen.mjs [baseUrl] [width] [height]
import puppeteer from 'puppeteer-core';

const base = process.argv[2] ?? 'http://localhost:4321/';
const W = Number(process.argv[3] ?? 1440);
const H = Number(process.argv[4] ?? 900);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.evaluateOnNewDocument(() => {
  sessionStorage.setItem('aryan-os:booted', '1');
  localStorage.setItem('aryan-os:lite', 'off');
  const raf = window.requestAnimationFrame.bind(window);
  window.__raf = {};
  window.requestAnimationFrame = (cb) => {
    const lines = (new Error().stack || '').split('\n').slice(2);
    const hit = lines.map((l) => l.match(/\/(_astro|src|node_modules)\/([^?:)]+)/)).find(Boolean);
    const key = hit ? hit[2].replace(/\.[A-Za-z0-9_-]{8}\.js$/, '') : 'anon';
    window.__raf[key] = (window.__raf[key] || 0) + 1;
    return raf(cb);
  };
});
await page.setViewport({ width: W, height: H });
await page.goto(base, { waitUntil: 'load' });
await sleep(2500);
const ids = await page.evaluate(() => [...document.querySelectorAll('main > section[id], main > *[id], footer')].map((e) => e.id || e.tagName.toLowerCase()));
for (const id of ids) {
  await page.evaluate((id) => {
    const el = id === 'footer' ? document.querySelector('footer') : document.getElementById(id);
    const y = el.getBoundingClientRect().top + scrollY;
    (window.__lenis?.scrollTo?.(y, { immediate: true })) ?? scrollTo(0, y);
    scrollTo(0, y);
  }, id);
  await sleep(1500);
  await page.evaluate(() => (window.__raf = {}));
  await sleep(1000);
  const r = await page.evaluate(() => window.__raf);
  const list = Object.entries(r).filter(([, n]) => n > 5).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}:${n}`);
  console.log(`${id.padEnd(14)} ${list.join('  ') || '(idle)'}`);
}
console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no console errors');
await browser.close();
