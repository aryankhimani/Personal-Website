// Sections are ready before they scroll into view: scrolls down with real wheel events (no
// pauses) and checks, the moment each section's top enters the screen, that
//   - Writing already shows cards (the static strip or the live carousel), with no empty gap
//   - the footer's pixel street canvas is already drawn
// Usage: node scripts/test-arrival.mjs [baseUrl]
import puppeteer from 'puppeteer-core';

const base = (process.argv[2] || 'http://localhost:4321/').replace(/\/?$/, '/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fail = 0;
const check = (name, ok, info = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? `  ${info}` : ''}`);
  if (!ok) fail++;
};
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });

for (const [w, h, label] of [[1440, 900, 'desktop'], [390, 844, 'phone']]) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, isMobile: w < 500, hasTouch: w < 500 });
  await page.evaluateOnNewDocument(() => {
    sessionStorage.setItem('aryan-os:booted', '1');
    localStorage.setItem('aryan-os:lite', 'off');
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base, { waitUntil: 'load' });
  await sleep(800);
  await page.mouse.move(w / 2, h / 2);

  const state = () =>
    page.evaluate(() => {
      const writing = document.getElementById('writing').querySelector('.writing-carousel');
      const wr = writing?.getBoundingClientRect();
      const cards = writing ? writing.querySelectorAll('.writing-strip-card img, canvas').length : 0;
      const loadedImgs = writing ? [...writing.querySelectorAll('.writing-strip-card img')].filter((i) => i.naturalWidth > 0).length : 0;
      const crowd = document.querySelector('.foot-crowd-canvas');
      let drawn = false;
      if (crowd && crowd.width > 1) {
        try {
          const c = document.createElement('canvas');
          c.width = 64;
          c.height = 16;
          const g = c.getContext('2d');
          g.drawImage(crowd, 0, 0, 64, 16);
          const d = g.getImageData(0, 0, 64, 16).data;
          for (let i = 3; i < d.length; i += 4) if (d[i] > 0) { drawn = true; break; }
        } catch {}
      }
      return { wTop: wr?.top ?? 1e9, wH: wr?.height ?? 0, cards, loadedImgs, cTop: crowd?.getBoundingClientRect().top ?? 1e9, drawn };
    });

  let writingAt = null;
  let footAt = null;
  for (let i = 0; i < 600 && !(writingAt && footAt); i++) {
    await page.mouse.wheel({ deltaY: w < 500 ? 140 : 180 });
    await sleep(30);
    const s = await state();
    if (!writingAt && s.wTop < h) writingAt = s;
    if (!footAt && s.cTop < h) footAt = s;
  }
  check(`${label}: Writing shows sized cards the moment it scrolls in (no gap)`, !!writingAt && writingAt.wH > 200 && writingAt.cards > 0, JSON.stringify(writingAt));
  check(`${label}: the footer's pixel street is already drawn when it scrolls in`, !!footAt && footAt.drawn, JSON.stringify(footAt));
  check(`${label}: no page errors`, errors.length === 0, errors.slice(0, 2).join(' | '));
  await page.close();
}

await browser.close();
console.log(fail ? `\n${fail} failed.` : '\nAll checks passed.');
process.exit(fail ? 1 : 0);
