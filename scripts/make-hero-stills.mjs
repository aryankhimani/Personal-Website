// Captures a still of each hero's visual into public/hero/<id>.webp. Lite mode shows these
// instead of running the live effect. Re-run after changing a hero or the logo:
//   npm run build && npm run preview   (in another terminal)
//   node scripts/make-hero-stills.mjs
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:4321/';
const heroes = { 'liquid-metal': 2, ascii: 2, terminal: 1, astral: 2, orbits: 2 }; // id -> pixel density
mkdirSync('public/hero', { recursive: true });

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
for (const [id, density] of Object.entries(heroes)) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: density });
  await page.evaluateOnNewDocument(() => {
    sessionStorage.setItem('aryan-os:booted', '1');
    localStorage.setItem('aryan-os:lite', 'off');
  });
  await page.goto(`${base}?hero=${id}`, { waitUntil: 'networkidle2' });
  // The terminal's dark overlay is added by CSS in Lite mode too, so leave it out of the still.
  await page.addStyleTag({ content: '.hero-visual::after{display:none!important}' });
  // Full-bleed heroes sit under the copy: hide everything but the visual itself.
  if (id === 'astral' || id === 'orbits')
    await page.addStyleTag({ content: 'body *{visibility:hidden!important}[data-hero-visual],[data-hero-visual] *{visibility:visible!important}' });
  await new Promise((r) => setTimeout(r, 5000));
  const visual = await page.$('[data-hero-visual]');
  await visual.screenshot({ path: `public/hero/${id}.webp`, type: 'webp', quality: 72, omitBackground: true });
  console.log('wrote', `public/hero/${id}.webp`);
  await page.close();
}
await browser.close();
