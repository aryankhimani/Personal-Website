// Records the ~/rebuild swarm into public/media/rebuild.mp4 (the Lite / reduced-motion version).
// Needs `npm run preview` running and ffmpeg installed. Usage: node scripts/record-rebuild.mjs
import puppeteer from 'puppeteer-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:4321/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync('.shots', { recursive: true });
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => {
  sessionStorage.setItem('aryan-os:booted', '1');
  localStorage.setItem('aryan-os:lite', 'off');
});
await page.setViewport({ width: 1440, height: 900 });
await page.goto(base, { waitUntil: 'networkidle2' });
// Let the page settle (Journey sets its height when it loads), then park the panel on screen
// without triggering its auto-run, and record a run started by the button.
await page.evaluate(() => document.getElementById('journey').scrollIntoView());
await sleep(2500);
const clip = await page.evaluate(() => {
  const el = document.querySelector('[data-rebuild-canvas]');
  window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 60);
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
});
await page.waitForFunction(() => !document.querySelector('[data-rebuild-run]').disabled, { timeout: 30000 });
await sleep(800);
const raw = '.shots/rebuild-raw.webm';
const recorder = await page.screencast({ path: raw, crop: clip });
await page.click('[data-rebuild-run]');
await sleep(400);
await page.waitForFunction(() => !document.querySelector('[data-rebuild-run]').disabled, { timeout: 30000 });
await sleep(500);
await recorder.stop();
await browser.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-vf', 'scale=1100:-2,fps=30', '-c:v', 'libx264', '-preset', 'slow', '-crf', '30', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', 'public/media/rebuild.mp4']);
rmSync(raw);
console.log('wrote public/media/rebuild.mp4');
