// Per-hero performance: fps while the mouse moves over the hero, the slowest input delay
// (Event Timing, an INP stand-in), scroll fps through the whole page, and first-load JS.
// Usage: node scripts/perf-hero.mjs [baseUrl] [cpuSlowdown] [hero,hero,...]
// Needs `npm run build && npm run preview` running. Real Chrome, 1440x900 at DPR 2.
import puppeteer from 'puppeteer-core';

const base = process.argv[2] ?? 'http://localhost:4321/';
const slow = Number(process.argv[3] ?? 1);
const heroes = (process.argv[4] ?? 'liquid-metal,ascii,terminal,astral,orbits').split(',');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'],
});

const stats = (frames) => {
  const f = frames.slice(5).sort((a, b) => a - b);
  const avg = f.reduce((a, b) => a + b, 0) / Math.max(1, f.length);
  return { fps: +(1000 / avg).toFixed(1), p95: +(f[Math.floor(f.length * 0.95)] ?? 0).toFixed(1), over25: f.filter((d) => d > 25).length };
};

async function run(hero) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.evaluateOnNewDocument(() => {
    sessionStorage.setItem('aryan-os:booted', '1');
    localStorage.setItem('aryan-os:lite', 'off');
    window.__p = { frames: [], events: [], long: [] };
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__p.events.push(Math.round(e.duration)))).observe({ type: 'event', durationThreshold: 16, buffered: true });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__p.long.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: true });
  });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  if (slow > 1) await page.emulateCPUThrottling(slow);
  await page.goto(`${base}?hero=${hero}`, { waitUntil: 'load' });
  // JS fetched by the load event (decoded, uncompressed size).
  const firstLoadJs = await page.evaluate(() =>
    performance.getEntriesByType('resource').filter((e) => /\.m?js(\?|$)/.test(e.name)).reduce((s, e) => s + e.decodedBodySize, 0),
  );
  await sleep(3500);
  const record = () => page.evaluate(() => {
    window.__p.frames = [];
    window.__p.stop = false;
    let last = performance.now();
    const f = (t) => { window.__p.frames.push(t - last); last = t; if (!window.__p.stop) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
  const stop = () => page.evaluate(() => { window.__p.stop = true; return window.__p.frames; });

  // 1. Mouse wandering over the hero for ~3 s.
  await record();
  for (let i = 0; i < 90; i++) {
    await page.mouse.move(300 + 900 * (0.5 + 0.5 * Math.sin(i / 9)), 200 + 500 * (0.5 + 0.5 * Math.cos(i / 13)));
    await sleep(33);
  }
  const hover = stats(await stop());
  // A few clicks on empty hero space for input delay.
  for (let i = 0; i < 4; i++) { await page.mouse.click(400 + i * 40, 700); await sleep(150); }

  // 2. Scroll the whole page.
  await record();
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let i = 0; i < 300; i++) {
    await page.mouse.wheel({ deltaY: 120 });
    await sleep(30);
    if ((await page.evaluate(() => scrollY + innerHeight)) >= height - 5) break;
  }
  await sleep(800);
  const scroll = stats(await stop());
  const p = await page.evaluate(() => window.__p);
  await ctx.close();
  return {
    hero,
    hoverFps: hover.fps, hoverP95: hover.p95,
    scrollFps: scroll.fps, scrollP95: scroll.p95, scrollJank: scroll.over25,
    worstInputMs: Math.max(0, ...p.events),
    longTasks: p.long.length,
    firstLoadJsKB: +(firstLoadJs / 1024).toFixed(1),
  };
}

const rows = [];
for (const h of heroes) rows.push(await run(h));
console.table(rows);
await browser.close();
