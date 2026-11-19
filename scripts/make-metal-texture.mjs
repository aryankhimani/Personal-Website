// Pre-processes the AK logo for Paper's liquid-metal shader once, so visitors' phones skip
// Paper's ~300 ms image processing (LiquidMetalVisual feeds the result straight to the shader).
// Rerun only if public/logo.svg changes. Steps: create src/pages/lm-process.astro with
//   <html><body><script>
//     import { toProcessedLiquidMetal } from '@paper-design/shaders';
//     toProcessedLiquidMetal('/logo.svg').then(async ({ pngBlob }) => {
//       const img = await createImageBitmap(pngBlob), c = document.createElement('canvas');
//       c.width = c.height = 1024; c.getContext('2d').drawImage(img, 0, 0, 1024, 1024);
//       (window as any).__out = { src: `${img.width}x${img.height}`, url: c.toDataURL('image/png') };
//     });
//   </script></body></html>
// run `npm run dev`, then `node scripts/make-metal-texture.mjs`, then delete the page.
// Writes public/hero/logo-metal.webp (lossless: the R/G channels are data, not colour).
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
const base = process.argv[2] ?? 'http://localhost:4321/';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage();
page.on('console', (m) => console.log('page:', m.text()));
page.on('pageerror', (e) => console.log('page error:', String(e)));
await page.goto(`${base}lm-process`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__out, { timeout: 20000 });
const { src, url } = await page.evaluate(() => window.__out);
await sharp(Buffer.from(url.split(',')[1], 'base64')).webp({ lossless: true }).toFile('public/hero/logo-metal.webp');
console.log(`processed ${src} -> public/hero/logo-metal.webp`);
await browser.close();
