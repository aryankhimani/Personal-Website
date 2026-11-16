// Screenshots each homepage section at desktop size (one viewport per section).
// Usage: node scripts/shots-sections.mjs [prefix] [baseUrl] [ids...]   (needs `npm run preview`)
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const prefix = process.argv[2] ?? 'sec';
const base = process.argv[3] ?? 'http://localhost:4321/';
const ids = process.argv.slice(4).length ? process.argv.slice(4) : ['home', 'work', 'journey', 'memories', 'playground', 'writing', 'about', 'contact'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync('.shots', { recursive: true });
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => sessionStorage.setItem('aryan-os:booted', '1'));
await page.setViewport({ width: 1440, height: 900 });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto(base, { waitUntil: 'networkidle2' });
await sleep(3000);
for (const id of ids) {
  await page.evaluate((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 32, behavior: 'instant' });
  }, id);
  await sleep(1600);
  await page.screenshot({ path: `.shots/${prefix}-${id}.png` });
}
await browser.close();
