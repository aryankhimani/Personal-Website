// Scroll-lag profiler. Scrolls the whole homepage with real wheel events (through Lenis) with
// the frame-rate cap lifted, so it measures real cost rather than the vsync limit, and prints:
//   - frame times (uncapped fps, p95, frames over 16.7 ms)
//   - long tasks (> 50 ms) and long animation frames (LoAF) with the scripts behind them
//   - main-thread time split into script / style / layout (CDP Performance.getMetrics)
//   - a CPU profile's top self-time by source file
// (A full Chrome trace of the whole page is too big for puppeteer to hold in memory.)
// Usage: node scripts/perf-trace.mjs [baseUrl] [cpuSlowdown]
import puppeteer from 'puppeteer-core';

const base = process.argv[2] ?? 'http://localhost:4321/';
const slow = Number(process.argv[3] ?? 1);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--disable-gpu-vsync', '--disable-frame-rate-limit'],
});
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => {
  sessionStorage.setItem('aryan-os:booted', '1');
  localStorage.setItem('aryan-os:lite', 'off');
  window.__p = { frames: [], long: [], loaf: [] };
});
await page.setViewport({ width: 1440, height: 900 });
await page.goto(base, { waitUntil: 'load', timeout: 90000 });
await sleep(3000);
const cdp = await page.createCDPSession();
await cdp.send('Performance.enable');
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
if (slow > 1) await page.emulateCPUThrottling(slow);
await page.mouse.move(720, 450);
await page.evaluate(() => {
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__p.long.push(Math.round(e.duration)))).observe({ type: 'longtask' });
  try {
    new PerformanceObserver((l) =>
      l.getEntries().forEach((e) =>
        window.__p.loaf.push({
          d: Math.round(e.duration),
          at: [...document.querySelectorAll('main > section[id], footer')].filter((x) => x.getBoundingClientRect().top < innerHeight).pop()?.id || 'footer',
          render: Math.round(e.startTime + e.duration - (e.renderStart || e.startTime + e.duration)),
          scripts: e.scripts.map((s) => `${Math.round(s.duration)}ms ${s.invoker} ${String(s.sourceURL).replace(/^.*\/_astro\//, '')}`),
        }),
      ),
    ).observe({ type: 'long-animation-frame' });
  } catch {}
  let last = performance.now();
  const f = (t) => { window.__p.frames.push(t - last); last = t; if (!window.__stop) requestAnimationFrame(f); };
  requestAnimationFrame(f);
});
const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
const m0 = await metrics();
await cdp.send('Profiler.start');
const height = await page.evaluate(() => document.documentElement.scrollHeight);
const t0 = Date.now();
for (let i = 0; i < 500; i++) {
  await page.mouse.wheel({ deltaY: 120 });
  await sleep(16);
  if ((await page.evaluate(() => scrollY + innerHeight)) >= height - 5) break;
}
await sleep(1000);
const secs = (Date.now() - t0) / 1000;
const { profile } = await cdp.send('Profiler.stop');
const m1 = await metrics();
const r = await page.evaluate(() => { window.__stop = true; return window.__p; });

// CPU profile: self time per source file.
const byUrl = new Map();
const byFn = new Map();
const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
const dt = profile.timeDeltas;
profile.samples.forEach((id, i) => {
  const n = nodes.get(id);
  const fn = n.callFrame.functionName;
  const url = n.callFrame.url.replace(/^.*\/_astro\//, '') || `(${fn || 'native'})`;
  byUrl.set(url, (byUrl.get(url) ?? 0) + (dt[i] ?? 0) / 1000);
  if (n.callFrame.url) byFn.set(`${fn || '(anon)'}@${url}:${n.callFrame.lineNumber}:${n.callFrame.columnNumber}`, (byFn.get(`${fn || '(anon)'}@${url}:${n.callFrame.lineNumber}:${n.callFrame.columnNumber}`) ?? 0) + (dt[i] ?? 0) / 1000);
});
const top = [...byUrl].filter(([u]) => u !== '(idle)' && u !== '(program)').sort((a, b) => b[1] - a[1]).slice(0, 10);

const f = r.frames.slice(5).sort((a, b) => a - b);
const avg = f.reduce((a, b) => a + b, 0) / f.length;
const d = (k) => Math.round((m1[k] - m0[k]) * 1000);
console.log(JSON.stringify({
  cpuSlowdown: slow,
  seconds: +secs.toFixed(1),
  uncappedFps: +(1000 / avg).toFixed(1),
  p95FrameMs: +f[Math.floor(f.length * 0.95)].toFixed(1),
  framesOver16ms: `${f.filter((x) => x > 16.7).length}/${f.length}`,
  longTasksOver50ms: r.long.length,
  longestTaskMs: Math.max(0, ...r.long),
  longAnimationFrames: r.loaf.length,
  mainMs: { task: d('TaskDuration'), script: d('ScriptDuration'), style: d('RecalcStyleDuration'), layout: d('LayoutDuration'), layouts: m1.LayoutCount - m0.LayoutCount },
}));
console.log('cpu self time by file:\n' + top.map(([u, ms]) => `${ms.toFixed(0).padStart(6)} ms  ${u}`).join('\n'));
if (process.argv.includes('--fns')) console.log('top functions:\n' + [...byFn].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([u, ms]) => `${ms.toFixed(0).padStart(6)} ms  ${u}`).join('\n'));
const worst = r.loaf.sort((a, b) => b.d - a.d).slice(0, 8);
if (worst.length) console.log('worst frames:\n' + worst.map((w) => `${w.d}ms @${w.at} (render ${w.render}ms) ${w.scripts.slice(0, 3).join(' | ')}`).join('\n'));
await browser.close();
