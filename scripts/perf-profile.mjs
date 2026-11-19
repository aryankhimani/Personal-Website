// CPU-profiles a full-page scroll (and a hover over the hero) and prints the functions with the
// most self time, plus gzipped first-load JS from dist/.
// Usage: node scripts/perf-profile.mjs [baseUrl] [hero] [cpuSlowdown]
import puppeteer from 'puppeteer-core';
import { readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const base = process.argv[2] ?? 'http://localhost:4321/';
const hero = process.argv[3] ?? 'astral';
const slow = Number(process.argv[4] ?? 4);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => {
  sessionStorage.setItem('aryan-os:booted', '1');
  localStorage.setItem('aryan-os:lite', 'off');
});
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.emulateCPUThrottling(slow);
await page.goto(`${base}?hero=${hero}`, { waitUntil: 'load' });
const files = await page.evaluate(() =>
  performance.getEntriesByType('resource').filter((e) => /\.m?js(\?|$)/.test(e.name)).map((e) => new URL(e.name).pathname),
);
let gz = 0;
let raw = 0;
for (const f of files) {
  const p = `dist${f}`;
  if (!existsSync(p)) continue;
  const b = readFileSync(p);
  raw += b.length;
  gz += gzipSync(b).length;
}
console.log(`first-load JS: ${files.length} files, ${(raw / 1024).toFixed(1)} KB raw, ${(gz / 1024).toFixed(1)} KB gzip`);
await sleep(3500);
const cdp = await page.createCDPSession();
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
await cdp.send('Profiler.start');
await page.mouse.move(720, 450);
const height = await page.evaluate(() => document.documentElement.scrollHeight);
for (let i = 0; i < 300; i++) {
  await page.mouse.wheel({ deltaY: 120 });
  await sleep(30);
  if ((await page.evaluate(() => scrollY + innerHeight)) >= height - 5) break;
}
await sleep(800);
const { profile } = await cdp.send('Profiler.stop');
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map();
const dts = profile.timeDeltas;
profile.samples.forEach((id, i) => {
  const n = byId.get(id);
  const cf = n.callFrame;
  const key = `${cf.functionName || '(anon)'}  ${cf.url.split('/').pop()}:${cf.lineNumber}`;
  self.set(key, (self.get(key) ?? 0) + (dts[i] ?? 0));
});
const total = [...self.values()].reduce((a, b) => a + b, 0);
[...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([k, v]) => console.log(`${((v / total) * 100).toFixed(1).padStart(5)}%  ${(v / 1000).toFixed(0).padStart(6)}ms  ${k}`));
await browser.close();
