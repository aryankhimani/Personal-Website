// Every image on the site loads: opens the homepage (hero stills, me.md, Journey, Writing
// cards, footer), every folder page and every project reader (#work/<id>), plus each
// /work/<id>/ page, and fails on:
//   - an <img> that finished loading with naturalWidth 0 (broken), or never loads once on screen
//   - any image / CSS background / media request that returns 4xx/5xx or fails
//   - a URL whose path differs in letter case from the real file in dist/ (macOS serves
//     /Photo.JPG for photo.jpg; GitHub Pages does not)
// Run against BOTH servers:  node scripts/test-images.mjs http://localhost:4321/ [--dist]
// --dist turns on the case check against dist/ (use it with npm run preview).
import puppeteer from 'puppeteer-core';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const base = (process.argv[2] || 'http://localhost:4321/').replace(/\/?$/, '/');
const checkCase = process.argv.includes('--dist');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fail = 0;
const check = (name, ok, info = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? `  ${info}` : ''}`);
  if (!ok) fail++;
};

// Exact-case lookup in dist/.
const dirCache = new Map();
const caseOk = (urlPath) => {
  let dir = 'dist';
  const parts = decodeURIComponent(urlPath).split('/').filter(Boolean);
  for (const p of parts) {
    if (!dirCache.has(dir)) dirCache.set(dir, existsSync(dir) ? readdirSync(dir) : []);
    if (!dirCache.get(dir).includes(p)) return false;
    dir = join(dir, p);
  }
  return true;
};

const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const origin = new URL(base).origin;
const bad = new Map(); // url -> reason
const seen = new Set();

async function open(path, { width = 1440, height = 900 } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  await page.evaluateOnNewDocument(() => sessionStorage.setItem('aryan-os:booted', '1'));
  page.on('response', (r) => {
    const t = r.request().resourceType();
    const u = r.url();
    if (!['image', 'media', 'font', 'stylesheet'].includes(t) && !/\.(png|jpe?g|webp|avif|gif|svg|mp4|webm)(\?|$)/i.test(u)) return;
    if (u.startsWith('data:') || u.startsWith('blob:')) return;
    seen.add(u);
    if (r.status() >= 400) bad.set(u, `HTTP ${r.status()} (${path})`);
  });
  page.on('requestfailed', (r) => {
    const u = r.url();
    if (u.startsWith('data:') || u.startsWith('blob:')) return;
    if (/net::ERR_ABORTED/.test(r.failure()?.errorText ?? '') && r.resourceType() === 'media') return; // video preload cancelled
    if (['image', 'media'].includes(r.resourceType())) bad.set(u, `${r.failure()?.errorText} (${path})`);
  });
  await page.goto(base + path.replace(/^\//, ''), { waitUntil: 'networkidle2', timeout: 60000 });
  return page;
}

/** Scrolls the page (or a scroll box) through so lazy images load, then audits every <img>. */
async function audit(page, label, scope = 'document') {
  await page.evaluate(async (scope) => {
    const box = scope === 'document' ? document.scrollingElement : document.querySelector(scope);
    if (!box) return;
    for (let y = 0; y <= box.scrollHeight; y += 500) {
      box.scrollTop = y;
      if (scope === 'document') window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
  }, scope);
  await sleep(1200);
  const imgs = await page.evaluate(async (scope) => {
    const root = scope === 'document' ? document : document.querySelector(scope);
    if (!root) return [];
    const list = [...root.querySelectorAll('img')];
    // Give lazy images a moment to finish.
    await Promise.all(list.map((i) => (i.complete ? null : new Promise((r) => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); setTimeout(r, 4000); }))));
    const bg = [];
    for (const el of root.querySelectorAll('*')) {
      const b = getComputedStyle(el).backgroundImage;
      for (const m of b.matchAll(/url\("?([^")]+)"?\)/g)) if (!m[1].startsWith('data:')) bg.push(m[1]);
    }
    return {
      imgs: list.map((i) => ({ src: i.currentSrc || i.src, alt: i.alt, w: i.naturalWidth, complete: i.complete, lazy: i.loading === 'lazy', shown: i.getClientRects().length > 0 })),
      bg,
    };
  }, scope);
  const broken = imgs.imgs.filter((i) => i.src && i.complete && i.w === 0);
  const stuck = imgs.imgs.filter((i) => i.src && !i.complete && i.shown && !i.lazy);
  check(`${label}: ${imgs.imgs.length} images load`, !broken.length && !stuck.length, [...broken, ...stuck].map((i) => `${i.src.replace(origin, '')} [${i.alt.slice(0, 40)}]`).join(' | '));
  // Background images: request each once to be sure it exists.
  for (const u of new Set(imgs.bg)) {
    const abs = new URL(u, base).href;
    if (!abs.startsWith(origin) || seen.has(abs)) continue;
    seen.add(abs);
    const res = await fetch(abs).catch(() => null);
    if (!res || !res.ok) bad.set(abs, `background ${res?.status ?? 'failed'} (${label})`);
  }
  return imgs.imgs;
}

// ---------- homepage ----------
{
  const page = await open('/');
  const imgs = await audit(page, 'homepage (hero, me.md, journey, writing, footer)');
  check('homepage has images in me.md, Journey and Writing', imgs.length > 10, `${imgs.length}`);
  // Writing cards are drawn on a canvas from the article images: make sure each source loads.
  const writing = await page.evaluate(() => [...document.querySelectorAll('[data-writing] img, #writing img')].map((i) => i.naturalWidth));
  check('writing card images', writing.every((w) => w > 0), writing.join(','));
  await page.close();
}

// ---------- hero stills (Lite mode shows them) ----------
{
  const page = await open('/');
  await page.evaluate(() => localStorage.setItem('aryan-os:lite', 'on'));
  await page.reload({ waitUntil: 'networkidle2' });
  await audit(page, 'hero stills (Lite)');
  for (let i = 0; i < 5; i++) {
    const sw = await page.$('.hero-switch button, [data-hero-next]');
    if (!sw) break;
    await sw.click().catch(() => {});
    await sleep(500);
  }
  await audit(page, 'hero stills after switching');
  await page.evaluate(() => localStorage.removeItem('aryan-os:lite'));
  await page.close();
}

// ---------- folders + every project reader ----------
const index = await (await fetch(base + 'work/index.json')).json();
const folders = ['ai-ml', 'software', 'research', 'ventures', 'leadership'];
{
  const page = await open('/');
  for (const f of folders) {
    await page.evaluate((h) => (location.hash = h), `#work/${f}`);
    await page.waitForSelector('[role="dialog"] .reader-scroll', { timeout: 6000 }).catch(() => {});
    await sleep(500);
    await audit(page, `folder ${f}`, '[role="dialog"] .reader-scroll');
    await page.keyboard.press('Escape');
    await sleep(400);
  }
  for (const p of index) {
    await page.evaluate((h) => (location.hash = h), `#work/${p.id}`);
    await page.waitForSelector(`[data-window="${p.id}"] .reader-title`, { timeout: 6000 }).catch(() => {});
    await sleep(400);
    await audit(page, `reader ${p.id}`, `[data-window="${p.id}"] .reader-scroll`);
    await page.keyboard.press('Escape');
    await sleep(300);
  }
  check('opened all 21 project readers', index.length === 21, `${index.length}`);
  await page.close();
}

// ---------- each /work/<id>/ page (the no-JS / shared-link version) ----------
for (const p of index) {
  const page = await open(`/work/${p.id}/`);
  await audit(page, `/work/${p.id}/`);
  await page.close();
}

// ---------- 404 page ----------
{
  const page = await open('/this-page-does-not-exist/');
  await audit(page, '404 page');
  await page.close();
}

// ---------- network + letter case ----------
check('no image/media/font request failed', bad.size === 0, [...bad].slice(0, 8).map(([u, r]) => `${u.replace(origin, '')} -> ${r}`).join(' | '));
if (checkCase) {
  const wrong = [...seen].filter((u) => u.startsWith(origin)).map((u) => new URL(u).pathname).filter((p) => !caseOk(p));
  check(`every local file URL matches dist/ in letter case (${seen.size} checked)`, wrong.length === 0, wrong.slice(0, 8).join(' | '));
}

await browser.close();
console.log(fail ? `\n${fail} failed.` : '\nAll checks passed.');
process.exit(fail ? 1 : 0);
