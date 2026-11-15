// Screenshots a page at desktop and mobile sizes and reports console errors.
// Usage: node scripts/shots.mjs [url] [name]   (expects `npm run preview` or `npm run dev` to be running)
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:4321/';
const name = process.argv[3] ?? 'home';
const sizes = { desktop: [1440, 900], mobile: [390, 844] };

mkdirSync('.shots', { recursive: true });
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
let errors = 0;
for (const [label, [width, height]] of Object.entries(sizes)) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: label === 'mobile' ? 2 : 1, isMobile: label === 'mobile' });
  const log = (kind, text) => { errors++; console.log(`[${label}] ${kind}: ${text}`); };
  page.on('pageerror', (e) => log('pageerror', e.message));
  page.on('console', (m) => m.type() === 'error' && log('console', m.text()));
  page.on('response', (r) => r.status() >= 400 && log('http ' + r.status(), r.url()));
  await page.goto(url, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: `.shots/${name}-${label}.png` });
  await page.close();
}
await browser.close();
console.log(errors ? `${errors} error(s)` : 'no console errors');
process.exit(errors ? 1 : 0);
