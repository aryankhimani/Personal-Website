// Drives the Phase 5 sections in real Chrome: the playground build and toys, the writing
// filters, me.md, the compose window, the footer, and that every GitHub link resolves.
// Usage: node scripts/test-sections.mjs [baseUrl]   (needs `npm run preview` running)
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
});

async function newPage(viewport, { lite = false } = {}) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport(viewport);
  await page.evaluateOnNewDocument((lite) => {
    sessionStorage.setItem('aryan-os:booted', '1');
    if (lite) localStorage.setItem('aryan-os:lite', 'on');
  }, lite);
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    // Headless Chrome has no mail app to hand mailto: links to; that message is expected.
    if (m.type() === 'error' && !/mailto/.test(m.text())) problems.push('console: ' + m.text());
  });
  page.on('response', (r) => r.status() >= 400 && problems.push(`http ${r.status()}: ${r.url()}`));
  await page.goto(base + '/', { waitUntil: 'networkidle2' });
  await sleep(1200);
  return page;
}

// Jump to a section. Measured twice: the Journey scene makes the page longer once it loads.
async function goTo(page, sel, offset = 0) {
  for (let i = 0; i < 2; i++) {
    await page.$eval(sel, (e, off) => window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 32 + off), offset);
    await sleep(800);
  }
}
const state = (page) =>
  page.evaluate(() => ({
    playing: document.querySelector('[data-fig]').hasAttribute('data-playing'),
    heading: document.querySelector('[data-el="heading"]').textContent,
    filled: document.querySelector('[data-el="button"]').hasAttribute('data-filled'),
    replay: !document.querySelector('[data-replay]').hidden,
  }));
const insideCanvas = (page) =>
  page.evaluate(() => {
    const c = document.querySelector('[data-canvas]').getBoundingClientRect();
    return [...document.querySelectorAll('[data-cursor]')].every((el) => {
      const r = el.getBoundingClientRect();
      return r.left >= c.left - 1 && r.right <= c.right + 1 && r.top >= c.top - 1 && r.bottom <= c.bottom + 1;
    });
  });

// ---------- Playground ----------
{
  const page = await newPage({ width: 1440, height: 900 });
  const before = await state(page);
  check('the finished card is there before any animation', before.heading === 'hi, I’m Aryan' && before.filled && !before.playing);

  await goTo(page, '#playground', 260);
  await sleep(400);
  const mid = await state(page);
  check('the build starts when the canvas is on screen', mid.playing && mid.heading.length < 13, JSON.stringify(mid));
  await sleep(11000);
  const end = await state(page);
  check('the build finishes: heading typed, button filled, Replay shown', !end.playing && end.heading === 'hi, I’m Aryan' && end.filled && end.replay, JSON.stringify(end));
  check('cursors rest inside the canvas', await insideCanvas(page));
  const layers = await page.$$eval('[data-layer]:not([hidden])', (els) => els.length);
  check('all four layers are listed', layers === 4, `${layers}`);

  await page.click('[data-replay]');
  await sleep(500);
  check('Replay builds it again', (await state(page)).playing);

  // Scroll away mid-build: it snaps to the finished card.
  await goTo(page, '#home');
  await sleep(300);
  const away = await state(page);
  check('scrolling away stops it at the finished card', !away.playing && away.heading === 'hi, I’m Aryan', JSON.stringify(away));

  // Toys.
  await goTo(page, '.toys');
  await sleep(1200);
  check('the sticker is a live canvas', await page.$('.toy-stage-sticker canvas').then(Boolean));
  const stub = await page.$('[aria-label="Tear off the ticket stub"]');
  check('the ticket stub can be reached by keyboard', !!stub && (await stub.evaluate((e) => e.tabIndex >= 0)));
  if (stub) {
    await stub.focus();
    await page.keyboard.press('Enter');
    await sleep(1200);
    check('Enter tears the ticket', await stub.evaluate((e) => e.getAttribute('aria-hidden') === 'true'));
  }
  await page.close();
}

// ---------- Playground in Lite, and on a phone ----------
{
  const page = await newPage({ width: 1440, height: 900 }, { lite: true });
  await goTo(page, '#playground', 260);
  await sleep(1200);
  const s = await state(page);
  check('Lite: no animation, finished card, no Replay', !s.playing && s.heading === 'hi, I’m Aryan' && !s.replay, JSON.stringify(s));
  await goTo(page, '.toys');
  await sleep(800);
  check('Lite: the sticker is a still image (no WebGL)', !(await page.$('.toy-stage-sticker canvas')) && (await page.$('.toy-sticker-still').then(Boolean)));
  await page.close();

  const phone = await newPage({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await goTo(phone, '#playground', 230);
  await sleep(11500);
  check('phone: cursors rest inside the canvas', await insideCanvas(phone));
  const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  check('phone: no sideways scroll', overflow <= 0, `overflow=${overflow}`);
  await phone.close();
}

// ---------- Writing, about, contact, footer ----------
{
  const page = await newPage({ width: 1440, height: 900 });
  const rows = () => page.$$eval('[data-writing] tbody tr:not([hidden])', (els) => els.length);
  check('writing lists all 23 pieces', (await rows()) === 23);
  const counts = {};
  for (const k of ['article', 'newsletter', 'talk']) {
    await page.click(`[data-filter="${k}"]`);
    counts[k] = await rows();
  }
  check('filters show 12 articles, 9 newsletters, 2 talks', counts.article === 12 && counts.newsletter === 9 && counts.talk === 2, JSON.stringify(counts));
  check('the status line follows the filter', (await page.$eval('[data-writing-status]', (e) => e.textContent)) === '2 items');
  check('only the chosen chip is pressed', (await page.$$eval('[data-filter][aria-pressed="true"]', (els) => els.map((e) => e.dataset.filter))).join() === 'talk');
  await page.click('[data-filter="all"]');
  const dates = await page.$$eval('[data-writing] time', (els) => els.map((e) => e.getAttribute('datetime')));
  check('newest first', dates.every((d, i) => i === 0 || dates[i - 1] >= d));
  const ext = await page.$$eval('[data-writing] a', (els) => els.every((a) => a.target === '_blank' && a.rel.includes('noopener')));
  check('writing links open in a new tab, safely', ext);

  check('me.md has a heading, photo with alt text, and skills', (await page.$eval('#about h2', (e) => e.textContent)) === 'Hi, I’m Aryan.' && (await page.$eval('#about img', (e) => e.alt.length > 10)) && (await page.$$('#about .work-tags li')).length >= 15);

  // Compose: Send builds a mailto link from the fields.
  await goTo(page, '#contact');
  await page.type('[data-compose] input[name="subject"]', 'Coffee chat?');
  await page.type('[data-compose] textarea', 'Hi Aryan, loved the site.');
  await page.click('[data-send]');
  await sleep(150);
  const mailto = await page.$eval('[data-compose]', (f) => f.dataset.mailto);
  check('Send makes a mailto with subject and message', mailto === 'mailto:khimani.aryan@gmail.com?subject=Coffee%20chat%3F&body=Hi%20Aryan%2C%20loved%20the%20site.', mailto);
  check('compose links to LinkedIn and GitHub', (await page.$$eval('.compose-elsewhere a', (els) => els.map((a) => new URL(a.href).hostname))).join() === 'www.linkedin.com,github.com');
  await page.close();

  const foot = await newPage({ width: 1440, height: 900 });
  const meta = await foot.$eval('.site-foot-meta', (e) => e.textContent);
  check('footer says when it was built and links to the source', /Last updated \w+ \d+, \d{4}/.test(meta) && (await foot.$('.site-foot a[href*="Personal-Website"]').then(Boolean)));
  check('footer has a Lite switch', await foot.$('.site-foot .os-switch').then(Boolean));
  await foot.goto(base + '/work/tks/', { waitUntil: 'networkidle2' });
  check('the footer is on project pages too', await foot.$('.site-foot').then(Boolean));
  await foot.close();
}

// ---------- GitHub links ----------
{
  const html = await (await fetch(base + '/')).text();
  const json = await (await fetch(base + '/work/index.json')).text();
  const links = [...new Set([...(html + json).matchAll(/https:\/\/github\.com\/[\w.-]+(?:\/[\w.-]+)?/g)].map((m) => m[0]))];
  check('no links to the old Bossgod360 account', !links.some((l) => /bossgod360/i.test(l)));
  const broken = [];
  for (const l of links) {
    const r = await fetch(l, { redirect: 'follow' });
    if (r.status !== 200) broken.push(`${r.status} ${l}`);
  }
  check(`all ${links.length} GitHub links resolve`, broken.length === 0, broken.join(', '));
}

await browser.close();
console.log(results.join('\n'));
if (problems.length) {
  console.log('\nProblems:\n' + problems.map((p) => ' - ' + p).join('\n'));
  process.exit(1);
}
console.log('\nAll checks passed.');
