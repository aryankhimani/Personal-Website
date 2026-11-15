// Renders every SVG in public/logos side by side into .shots/logos.png for a quick look.
import puppeteer from 'puppeteer-core';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';

const dir = 'public/logos';
const files = readdirSync(dir).filter((f) => f.endsWith('.svg')).sort();
const tiles = files
  .map((f, i) => `<figure style="margin:0"><div style="background:${i % 2 ? '#111113;color:#ece7dc' : '#ece7dc'};padding:20px;border-radius:10px;width:220px;height:220px;box-sizing:content-box;border:1px solid #333">${readFileSync(`${dir}/${f}`, 'utf8').replace('fill="#000"', `fill="${i % 2 ? '#ece7dc' : '#000'}"`)}</div><figcaption style="font:13px monospace;color:#aaa;margin-top:8px">${i + 1}. ${f}</figcaption></figure>`)
  .join('');
mkdirSync('.shots', { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 48 + files.length * 286, height: 340 });
await page.setContent(`<body style="margin:0;background:#1a1b1f;display:flex;gap:24px;padding:24px">${tiles}</body>`);
await page.screenshot({ path: '.shots/logos.png' });
await browser.close();
