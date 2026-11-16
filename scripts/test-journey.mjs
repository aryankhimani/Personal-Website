// Drives ~/journey and memories.mov in real Chrome: the pinned scroll scene, its Lite
// fallback, switching Lite on mid-scene, and the click-to-play video.
// Usage: node scripts/test-journey.mjs [baseUrl]   (needs `npm run preview` running)
import puppeteer from 'puppeteer-core';

const base = (process.argv[2] ?? 'http://localhost:4321/').replace(/\/$/, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const problems = [];
const check = (name, ok, detail = '') => {
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  if (!ok) problems.push(name);
};

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required'],
});

async function newPage(viewport, { lite = false } = {}) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport(viewport);
  await page.evaluateOnNewDocument((lite) => {
    sessionStorage.setItem('aryan-os:booted', '1');
    if (lite) localStorage.setItem('aryan-os:lite', 'on');
  }, lite);
  const requests = [];
  page.on('request', (r) => requests.push(r.url()));
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
  page.on('console', (m) => m.type() === 'error' && problems.push('console: ' + m.text()));
  page.on('response', (r) => r.status() >= 400 && problems.push(`http ${r.status()}: ${r.url()}`));
  await page.goto(base + '/', { waitUntil: 'networkidle2' });
  await sleep(1500);
  return { page, requests };
}

const topOf = (page, sel) => page.$eval(sel, (e) => Math.round(e.getBoundingClientRect().top + scrollY));
const viewTop = (page, sel) => page.$eval(sel, (e) => Math.round(e.getBoundingClientRect().top));
// Scroll in steps, like a person, so scroll-driven code sees the movement.
async function scrollToY(page, y) {
  const from = await page.evaluate(() => scrollY);
  for (let i = 1; i <= 12; i++) {
    await page.evaluate((v) => window.scrollTo(0, v), from + ((y - from) * i) / 12);
    await sleep(40);
  }
  await sleep(500);
}
const shown = (page) =>
  page.$$eval('[data-chapter]', (els) => els.map((e, i) => (Number(getComputedStyle(e).opacity) > 0.5 ? i + 1 : 0)).filter(Boolean));
const activeTick = (page) => page.$$eval('[data-journey-rail] li', (els) => els.findIndex((e) => e.hasAttribute('data-active')) + 1);

// ---------- Desktop: pinned scene ----------
{
  const { page, requests } = await newPage({ width: 1440, height: 900 });
  check('GSAP is not downloaded on first load', !requests.some((u) => /\/journey\.[^/]*\.js$/.test(u)));
  check('seven chapters', (await page.$$('[data-chapter]')).length === 7);

  await scrollToY(page, (await topOf(page, '#journey')) - 600);
  await sleep(1200); // the scene loads as the section comes near
  const start = await topOf(page, '#journey');
  check('the scene sets itself up', await page.$('.pin-spacer').then(Boolean));

  await scrollToY(page, start + 200);
  const pinnedA = await viewTop(page, '[data-journey-stage]');
  await scrollToY(page, start + 1400);
  const pinnedB = await viewTop(page, '[data-journey-stage]');
  check('the stage stays pinned under the menu bar while scrolling', pinnedA === 32 && pinnedB === 32, `${pinnedA}, ${pinnedB}`);

  await scrollToY(page, start + 100);
  check('starts on chapter 1', (await shown(page)).join() === '1' && (await activeTick(page)) === 1, (await shown(page)).join());
  await scrollToY(page, start + 0.8 * 900 * 3 + 200);
  const mid = await shown(page);
  check('scrolling moves to chapter 4, one chapter visible at a time', mid.join() === '4' && (await activeTick(page)) === 4, mid.join());
  const dot = await page.$eval('[data-chapter]:nth-child(4) [data-chapter-photo]', (e) => getComputedStyle(e).getPropertyValue('--dot'));
  check('the photo has finished its halftone reveal', Number(dot) === 1, `--dot=${dot}`);
  await page.screenshot({ path: '.shots/p4-journey.png' });

  // The link in the visible chapter opens its project window.
  await page.click('[data-chapter]:nth-child(4) .chapter-link');
  await page.waitForSelector('[data-window="shad"] .pw-title', { timeout: 5000 }).catch(() => {});
  check('a chapter link opens its project window', await page.$('[data-window="shad"] .pw-title').then(Boolean));
  await page.keyboard.press('Escape');
  await sleep(400);

  await scrollToY(page, start + 0.8 * 900 * 6 + 600);
  check('the page scrolls on after the last chapter', (await viewTop(page, '[data-journey-stage]')) < 0);

  // Lite switched on in the middle of the scene: back to a plain timeline.
  await scrollToY(page, start + 1000);
  await page.click('.os-menubar .os-switch');
  await sleep(500);
  const all = await shown(page);
  check('turning Lite on unpins the scene and shows every chapter', !(await page.$('.pin-spacer')) && all.length === 7, all.join());
  const text = await page.$eval('[data-chapter-line]', (e) => e.textContent.trim());
  check('chapter text is restored whole', text === 'I join The Knowledge Society and start digging into AI and gene editing.', text);
  await page.close();
}

// ---------- Lite from the start ----------
{
  const { page, requests } = await newPage({ width: 1440, height: 900 }, { lite: true });
  await scrollToY(page, await topOf(page, '#journey'));
  await sleep(800);
  check('Lite: a plain timeline, nothing pinned', !(await page.$('.pin-spacer')) && (await shown(page)).length === 7);
  check('Lite: GSAP never loads', !requests.some((u) => /\/journey\.[^/]*\.js$/.test(u)));
  await page.screenshot({ path: '.shots/p4-journey-lite.png' });
  await page.close();
}

// ---------- memories.mov ----------
{
  const { page, requests } = await newPage({ width: 1440, height: 900 }, { lite: true });
  await scrollToY(page, (await topOf(page, '#memories')) - 100);
  await sleep(600);
  check('the video does not download until asked', !requests.some((u) => u.endsWith('memories.mp4')));
  await page.click('[data-memories-play]');
  await sleep(2500);
  const v = await page.$eval('[data-memories-video]', (el) => ({ paused: el.paused, t: el.currentTime, muted: el.muted, controls: el.controls }));
  check('Play starts the video, muted, with controls', !v.paused && v.t > 0.5 && v.muted && v.controls, JSON.stringify(v));
  await page.screenshot({ path: '.shots/p4-memories.png' });
  await scrollToY(page, 0);
  check('it pauses when scrolled away', await page.$eval('[data-memories-video]', (el) => el.paused));
  await page.close();

  const size = Number((await fetch(base + '/media/memories.mp4', { method: 'HEAD' })).headers.get('content-length'));
  check('memories.mp4 is under 4 MB', size > 0 && size < 4_000_000, `${(size / 1e6).toFixed(2)} MB`);
  const clip = Number((await fetch(base + '/media/ascendance-kingdom.mp4', { method: 'HEAD' })).headers.get('content-length'));
  check('the old 12 MB GIF is now a small MP4', clip > 0 && clip < 600_000, `${(clip / 1e3).toFixed(0)} KB`);
}

// ---------- Phone ----------
{
  const { page } = await newPage({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await scrollToY(page, (await topOf(page, '#journey')) - 500);
  await sleep(1200);
  const start = await topOf(page, '#journey');
  await scrollToY(page, start + 0.8 * 844 * 2 + 150);
  const ch = await shown(page);
  check('phone: the scene runs and shows chapter 3', ch.join() === '3', ch.join());
  const fits = await page.$eval('[data-chapter]:nth-child(3) .chapter-link', (e) => e.getBoundingClientRect().bottom < innerHeight - 96);
  check('phone: the chapter fits above the dock', fits);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('phone: no sideways scroll', overflow <= 0, `overflow=${overflow}`);
  await page.screenshot({ path: '.shots/p4-journey-phone.png' });
  await page.close();
}

await browser.close();
console.log(results.join('\n'));
if (problems.length) {
  console.log('\nProblems:\n' + problems.map((p) => ' - ' + p).join('\n'));
  process.exit(1);
}
console.log('\nAll checks passed.');
