// Lighthouse-style mobile load check without Lighthouse: 390x844 phone, 4x CPU, slow 4G
// (150 ms RTT, 1.6 Mbps down). Prints FCP, LCP (+ element), CLS, total blocking time,
// long tasks, and bytes by type loaded before the page settles.
// Usage: node scripts/perf-mobile.mjs [baseUrl] [--boot]   (--boot keeps the boot screen on)
import puppeteer from 'puppeteer-core';

const base = process.argv[2] ?? 'http://localhost:4321/';
const boot = process.argv.includes('--boot');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.evaluateOnNewDocument((boot) => {
  try { if (!boot) sessionStorage.setItem('aryan-os:booted', '1'); } catch {}
  window.__m = { lcp: 0, lcpEl: '', cls: 0, long: [] };
  new PerformanceObserver((l) => l.getEntries().forEach((e) => { window.__m.lcp = e.startTime; window.__m.lcpEl = e.element ? e.element.outerHTML.slice(0, 120) : e.url; })).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((l) => l.getEntries().forEach((e) => !e.hadRecentInput && (window.__m.cls += e.value))).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__m.long.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ type: 'longtask', buffered: true });
}, boot);
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await page.emulateCPUThrottling(4);
const cdp = await page.createCDPSession();
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
const bytes = {};
cdp.on('Network.loadingFinished', (e) => { bytes[e.requestId] = { ...(bytes[e.requestId] || {}), size: e.encodedDataLength }; });
cdp.on('Network.responseReceived', (e) => { bytes[e.requestId] = { ...(bytes[e.requestId] || {}), type: e.type, url: e.response.url }; });
const t0 = Date.now();
await page.goto(base, { waitUntil: 'load', timeout: 120000 });
const loadMs = Date.now() - t0;
await sleep(5000);
const m = await page.evaluate(() => ({ ...window.__m, fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0 }));
const tbt = m.long.reduce((s, [, d]) => s + Math.max(0, d - 50), 0);
const byType = {};
let total = 0;
const big = [];
for (const b of Object.values(bytes)) {
  if (!b.size) continue;
  byType[b.type] = (byType[b.type] || 0) + b.size;
  total += b.size;
  if (b.size > 60000) big.push(`${(b.size / 1024).toFixed(0)} KB ${new URL(b.url).pathname}`);
}
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
console.log(`load event ${loadMs} ms | FCP ${m.fcp.toFixed(0)} ms | LCP ${m.lcp.toFixed(0)} ms | CLS ${m.cls.toFixed(3)} | TBT ${tbt} ms`);
console.log(`LCP element: ${m.lcpEl}`);
console.log(`long tasks (start, ms): ${m.long.map((l) => l.join(':')).join(' ') || 'none'}`);
console.log(`bytes: total ${kb(total)} | ${Object.entries(byType).map(([k, v]) => `${k} ${kb(v)}`).join(' | ')}`);
console.log(big.length ? `over 60 KB:\n  ${big.join('\n  ')}` : 'nothing over 60 KB');
console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no console errors');
await browser.close();
