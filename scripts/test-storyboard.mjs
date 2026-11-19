// Storyboard scroll: the photo starts by the hero text, flies while scrolling and lands in
// me.md; phones get a fade instead. Usage: node scripts/test-storyboard.mjs [baseUrl] [shotsDir]
// (needs `npm run preview` running).
import puppeteer from 'puppeteer-core';

const base = process.argv[2] ?? 'http://localhost:4321/';
const shots = process.argv[3];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const errs = [];
const problems = [];
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  if (!ok) problems.push(name);
};

async function open(vp) {
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport(vp);
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.evaluateOnNewDocument(() => sessionStorage.setItem('aryan-os:booted', '1'));
  await p.goto(base, { waitUntil: 'networkidle0' });
  await sleep(800);
  return p;
}

const state = (p) =>
  p.evaluate(() => {
    const f = document.querySelector('.photo-fly');
    const slot = document.querySelector('[data-photo-slot]');
    const r = (e) => {
      const x = e.getBoundingClientRect();
      return { x: Math.round(x.left), y: Math.round(x.top), w: Math.round(x.width), h: Math.round(x.height) };
    };
    return {
      fly: f ? { ...r(f), shown: getComputedStyle(f).visibility === 'visible' } : null,
      slot: r(slot),
      slotImg: getComputedStyle(slot.querySelector('img')).visibility,
      copy: r(document.querySelector('.hero-copy')),
      y: Math.round(scrollY),
    };
  });

{
  const p = await open({ width: 1440, height: 900 });
  const s0 = await state(p);
  check('the photo starts beside the hero text', !!s0.fly?.shown && Math.abs(s0.fly.x + s0.fly.w - (s0.copy.x + s0.copy.w)) < 4 && s0.fly.y >= s0.copy.y + s0.copy.h && s0.fly.y < 900, JSON.stringify(s0.fly));
  check('the slot waits while the photo is away', s0.slotImg === 'hidden');

  await p.evaluate(() => {
    window.__f = [];
    let l = performance.now();
    const f = (n) => {
      window.__f.push(n - l);
      l = n;
      if (window.__f.length < 600) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
  await p.mouse.move(700, 450);
  for (let i = 0; i < 5; i++) {
    await p.mouse.wheel({ deltaY: 100 });
    await sleep(70);
  }
  await sleep(500);
  const mid = await state(p);
  if (shots) await p.screenshot({ path: `${shots}/story-mid.jpg`, type: 'jpeg', quality: 60 });
  check('mid-flight the photo is on screen and bigger', !!mid.fly?.shown && mid.fly.y > -mid.fly.h / 2 && mid.fly.y < 900 && mid.fly.w > s0.fly.w, JSON.stringify(mid.fly));

  for (let i = 0; i < 30; i++) {
    await p.mouse.wheel({ deltaY: 100 });
    await sleep(70);
  }
  await sleep(1500);
  const end = await state(p);
  if (shots) await p.screenshot({ path: `${shots}/story-end.jpg`, type: 'jpeg', quality: 60 });
  check('the photo lands in me.md', end.slotImg === 'visible' && !end.fly.shown, `scrollY=${end.y}`);
  const f = await p.evaluate(() => window.__f.slice(3).sort((a, b) => a - b));
  const p95 = f[Math.floor(f.length * 0.95)];
  check('scrolling stays smooth', p95 < 20 && f.filter((x) => x > 33).length < 6, `p95=${p95.toFixed(1)}ms`);

  // Back to the top: the photo flies back up.
  await p.evaluate(() => window.scrollTo(0, 0));
  await sleep(1500);
  const back = await state(p);
  check('scrolling back up returns the photo to the hero', !!back.fly?.shown && Math.abs(back.fly.y - s0.fly.y) < 6, JSON.stringify(back.fly));
}

{
  const p = await open({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  check('no flying photo on phones', (await p.$$('.photo-fly')).length === 0);
  await p.$eval('#about', (e) => e.scrollIntoView());
  await sleep(1200);
  check('phones fade the photo in', await p.$eval('[data-photo-slot]', (e) => e.classList.contains('is-in')));
}

check('no console errors', errs.length === 0, errs.join(' | '));
await b.close();
console.log(problems.length ? `\n${problems.length} failed.` : '\nAll checks passed.');
process.exit(problems.length ? 1 : 0);
