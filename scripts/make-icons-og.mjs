// Makes public/apple-touch-icon.png (180), public/favicon-32.png and public/og.jpg
// (1200x630 link preview: a shot of the hero). Needs the site running (npm run preview).
// Usage: node scripts/make-icons-og.mjs [url]
import puppeteer from 'puppeteer-core';
import { readFileSync, writeFileSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:4321/';
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const page = await browser.newPage();

const svg = readFileSync('public/favicon.svg', 'utf8');
for (const [size, out] of [
  [180, 'public/apple-touch-icon.png'],
  [32, 'public/favicon-32.png'],
]) {
  await page.setViewport({ width: size, height: size });
  // iOS rounds the corners itself, so the touch icon is a full square.
  const art = size === 180 ? svg.replace(/rx="\d+"/, 'rx="0"') : svg;
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${art}`);
  await page.screenshot({ path: out, omitBackground: true });
}

await page.setViewport({ width: 1200, height: 630 });
await page.evaluateOnNewDocument(() => sessionStorage.setItem('aryan-os:booted', '1'));
await page.goto(base, { waitUntil: 'networkidle2' });
// Long enough for the rotating line to come back round to "build AI tools and ship them".
await new Promise((r) => setTimeout(r, 9000));
// No dock or hero switch in the preview image.
await page.addStyleTag({ content: '.os-dock,.hero-switch,.conduit,.sig-hud{display:none!important}' });
writeFileSync('public/og.jpg', await page.screenshot({ type: 'jpeg', quality: 82 }));
await browser.close();
console.log('wrote apple-touch-icon.png, favicon-32.png, og.jpg');
