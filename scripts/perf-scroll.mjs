// Scrolls the homepage top to bottom with real wheel events (through Lenis) and reports
// frame times, long tasks and layout shift. Usage: node scripts/perf-scroll.mjs [baseUrl] [cpuSlowdown]
import puppeteer from 'puppeteer-core';

const base = process.argv[2] ?? 'http://localhost:4321/';
const slow = Number(process.argv[3] ?? 1);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => {
  sessionStorage.setItem('aryan-os:booted', '1');
  localStorage.setItem('aryan-os:lite', 'off');
  window.__perf = { frames: [], long: [], cls: 0 };
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__perf.long.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: true });
  new PerformanceObserver((l) => l.getEntries().forEach((e) => !e.hadRecentInput && (window.__perf.cls += e.value))).observe({ type: 'layout-shift', buffered: true });
});
await page.setViewport({ width: 1440, height: 900 });
if (slow > 1) await page.emulateCPUThrottling(slow);
await page.goto(base, { waitUntil: 'networkidle2' });
await sleep(3000);
await page.evaluate(() => {
  window.__perf.long = [];
  let last = performance.now();
  const f = (t) => { window.__perf.frames.push(t - last); last = t; if (!window.__perf.stop) requestAnimationFrame(f); };
  requestAnimationFrame(f);
});
await page.mouse.move(720, 450);
const height = await page.evaluate(() => document.documentElement.scrollHeight);
for (let i = 0; i < 400; i++) {
  await page.mouse.wheel({ deltaY: 120 });
  await sleep(30);
  if ((await page.evaluate(() => scrollY + innerHeight)) >= height - 5) break;
}
await sleep(1200);
const r = await page.evaluate(() => { window.__perf.stop = true; return window.__perf; });
const f = r.frames.slice(5).sort((a, b) => a - b);
const avg = f.reduce((a, b) => a + b, 0) / f.length;
const p95 = f[Math.floor(f.length * 0.95)];
const dropped = f.filter((d) => d > 25).length;
console.log(JSON.stringify({
  cpuSlowdown: slow,
  frames: f.length,
  avgFps: +(1000 / avg).toFixed(1),
  p95FrameMs: +p95.toFixed(1),
  framesOver25ms: dropped,
  longTasks: r.long.length,
  longestTaskMs: Math.max(0, ...r.long),
  cls: +r.cls.toFixed(4),
}));
await browser.close();
