// Boot v4: the split-flap name shows, a scroll clicks the CRT off early, the page stays put underneath, a tap skips on phones,
// and frame times stay smooth. Usage: node scripts/test-boot.mjs [baseUrl] [shotsDir]
// (needs `npm run preview` running). Pass a shots dir to save two frames.
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
  await p.evaluateOnNewDocument(() => {
    window.__f = [];
    let l = performance.now();
    const f = (n) => {
      window.__f.push(n - l);
      l = n;
      requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
    // When the CRT-off starts and when the boot ends.
    window.__bt = {};
    const watch = (n) => {
      if (document.getElementById('boot')?.classList.contains('boot-off') && !window.__bt.start) window.__bt.start = n;
      if (window.__bt.start && !document.documentElement.dataset.boot) return void (window.__bt.end = n);
      requestAnimationFrame(watch);
    };
    requestAnimationFrame(watch);
  });
  await p.goto(base, { waitUntil: 'domcontentloaded' });
  return p;
}

{
  const p = await open({ width: 1440, height: 900 });
  const t0 = Date.now();
  await sleep(2300);
  check('the split-flap name is showing', (await p.$$eval('#boot .split-flap-text__tile', (t) => t.length)) >= 8);
  check('the old grid-cell name is gone', !(await p.$('#boot-cells')));
  if (shots) await p.screenshot({ path: `${shots}/boot-desk.jpg`, type: 'jpeg', quality: 60 });
  await p.mouse.move(700, 450);
  for (let i = 0; i < 6; i++) {
    await p.mouse.wheel({ deltaY: 120 });
    await sleep(60);
  }
  await sleep(200);
  if (shots) await p.screenshot({ path: `${shots}/boot-break.jpg`, type: 'jpeg', quality: 60 });
  await p.waitForFunction(() => !document.documentElement.dataset.boot, { timeout: 4000 }).catch(() => {});
  const took = Date.now() - t0;
  const r = await p.evaluate(() => {
    const f = window.__f.slice(5).sort((a, b) => a - b);
    return { y: scrollY, slow: f.filter((x) => x > 33).length, p95: +f[Math.floor(f.length * 0.95)].toFixed(1) };
  });
  check('scrolling enters the desktop early', took < 3600, `${took}ms`);
  const bt = await p.evaluate(() => window.__bt.end - window.__bt.start);
  check('the CRT-off is visible (at least 0.3s)', bt >= 300, `${Math.round(bt)}ms`);
  check('the page stays at the top under the boot', r.y === 0, `scrollY=${r.y}`);
  check('boot frames stay smooth', r.p95 < 20 && r.slow < 6, `p95=${r.p95}ms, frames over 33ms=${r.slow}`);
  await sleep(500); // the boot swallows the rest of the entering gesture
  await p.mouse.wheel({ deltaY: 400 });
  await sleep(800);
  check('the page scrolls normally afterwards', (await p.evaluate(() => scrollY)) > 100);
}

{
  const p = await open({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await sleep(2600);
  if (shots) await p.screenshot({ path: `${shots}/boot-phone.jpg`, type: 'jpeg', quality: 60 });
  await p.touchscreen.tap(200, 400);
  await sleep(400);
  check('a tap skips on phones', !(await p.evaluate(() => document.documentElement.dataset.boot)));
}

check('no console errors', errs.length === 0, errs.join(' | '));
await b.close();
console.log(problems.length ? `\n${problems.length} failed.` : '\nAll checks passed.');
process.exit(problems.length ? 1 : 0);
