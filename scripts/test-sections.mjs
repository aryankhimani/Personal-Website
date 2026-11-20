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

/** A click that reports which selector failed, instead of crashing the run. */
async function click(page, sel) {
  try {
    await page.$eval(sel, (el) => el.scrollIntoView({ block: 'center' }));
    await page.click(sel);
  } catch (e) {
    problems.push(`click failed: ${sel} (${e.message})`);
  }
}

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
  // These checks are about what things do, not how they arrive: skip the section entrances
  // so a click never lands on a block that's still sliding in.
  await page.addStyleTag({ content: '[data-motion] .reveal{opacity:1!important;transform:none!important;transition:none!important}' });
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

  await goTo(page, '[data-fig]', -80);
  await sleep(400);
  const mid = await state(page);
  check('the build starts when the canvas is on screen', mid.playing && mid.heading.length < 13, JSON.stringify(mid));
  await sleep(11000);
  const end = await state(page);
  check('the build finishes: heading typed, button filled, Replay shown', !end.playing && end.heading === 'hi, I’m Aryan' && end.filled && end.replay, JSON.stringify(end));
  check('cursors rest inside the canvas', await insideCanvas(page));
  const layers = await page.$$eval('[data-layer]:not([hidden])', (els) => els.length);
  check('all four layers are listed', layers === 4, `${layers}`);

  await click(page, '[data-replay]');
  await sleep(500);
  check('Replay builds it again', (await state(page)).playing);

  // Scroll away mid-build: it snaps to the finished card.
  await goTo(page, '#home');
  await sleep(300);
  const away = await state(page);
  check('scrolling away stops it at the finished card', !away.playing && away.heading === 'hi, I’m Aryan', JSON.stringify(away));

  // Pace toggle: one canvas, normal by default; hyper speed replays the same build faster.
  await goTo(page, '[data-pace-root]', -80);
  const pace = () =>
    page.evaluate(() => ({
      pace: document.querySelector('[data-fig]').dataset.pace,
      pressed: document.querySelector('button[data-pace="hyper"]').getAttribute('aria-pressed'),
      windows: document.querySelectorAll('#playground .fig').length,
      canvases: document.querySelectorAll('#playground [data-canvas]').length,
    }));
  const p0 = await pace();
  check('one cursor window and canvas, normal by default', p0.windows === 1 && p0.canvases === 1 && p0.pace === 'normal', JSON.stringify(p0));
  await page.$eval('button[data-pace="hyper"]', (el) => el.click());
  await sleep(400);
  const p1 = await pace();
  const playing = await page.evaluate(() => document.querySelector('[data-fig]').hasAttribute('data-playing'));
  check('hyper speed restarts the build at the faster pace', p1.pace === 'hyper' && p1.pressed === 'true' && playing, JSON.stringify(p1));
  await page.$eval('button[data-pace="normal"]', (el) => el.click());
  await sleep(300);
  check('normal switches back', (await pace()).pace === 'normal');

  // Toys: their own section, after Writing.
  const order = await page.evaluate(() => {
    const w = document.getElementById('writing'), t = document.getElementById('toys');
    return !!w && !!t && !!(w.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING) && !document.querySelector('#playground .toys');
  });
  check('toys sit after the Writing section', order);
  const seq = await page.evaluate(() =>
    [...document.querySelectorAll('main > section[id], footer')].map((e) => e.id || e.tagName.toLowerCase()).slice(-5).join(' > '),
  );
  check('bottom of the page: writing > build > contact > toys > footer', seq === 'writing > build > contact > toys > footer', seq);
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
  await goTo(page, '[data-fig]', -80);
  await sleep(1200);
  const s = await state(page);
  check('Lite: no animation, finished card, no Replay', !s.playing && s.heading === 'hi, I’m Aryan' && !s.replay, JSON.stringify(s));
  await goTo(page, '.toys');
  await sleep(800);
  check('Lite: the sticker is a still image (no WebGL)', !(await page.$('.toy-stage-sticker canvas')) && (await page.$('.toy-sticker-still').then(Boolean)));
  await page.close();

  const phone = await newPage({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await goTo(phone, '[data-fig]', -60);
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
    await click(page, `[data-filter="${k}"]`);
    counts[k] = await rows();
  }
  check('filters show 12 articles, 9 newsletters, 2 talks', counts.article === 12 && counts.newsletter === 9 && counts.talk === 2, JSON.stringify(counts));
  check('the status line follows the filter', (await page.$eval('[data-writing-status]', (e) => e.textContent)) === '2 items');
  check('only the chosen chip is pressed', (await page.$$eval('[data-filter][aria-pressed="true"]', (els) => els.map((e) => e.dataset.filter))).join() === 'talk');
  await click(page, '[data-filter="all"]');
  const dates = await page.$$eval('[data-writing] time', (els) => els.map((e) => e.getAttribute('datetime')));
  check('newest first', dates.every((d, i) => i === 0 || dates[i - 1] >= d));
  const ext = await page.$$eval('[data-writing] a', (els) => els.every((a) => a.target === '_blank' && a.rel.includes('noopener')));
  check('writing links open in a new tab, safely', ext);

  check('me.md is a compact card: photo, heading, a few skill tags; no badge; three file cards incl. resume', (await page.$eval('#about h2', (e) => e.textContent)) === 'Hi, I’m Aryan.' && Boolean(await page.$('#about .me-photo img[alt]')) && (await page.$$('#about .me-tags li')).length <= 10 && !(await page.$('#about .desk-badge')) && (await page.$$('#about .file-card')).length === 3 && Boolean(await page.$('#about a.file-card-open')));
  // Hologram orbit: real buttons, Enter brings a card to the front, Esc sends it back.
  await page.evaluate(() => document.querySelector('[data-holo]').scrollIntoView({ block: 'center' }));
  await sleep(600);
  const t0 = await page.$eval('.holo-item:nth-child(2)', (e) => e.style.transform);
  await sleep(500);
  const t1 = await page.$eval('.holo-item:nth-child(2)', (e) => e.style.transform);
  check('hologram cards orbit the core', (await page.$eval('[data-holo]', (e) => e.dataset.mode)) === 'orbit' && t0 !== t1 && Boolean(await page.$('.holo-core')));
  await page.focus('.holo-item:nth-child(3) .holo-btn');
  await page.keyboard.press('Enter');
  await sleep(700);
  const front = await page.evaluate(() => ({ exp: document.querySelector('.holo-item:nth-child(3) .holo-btn').getAttribute('aria-expanded'), front: document.querySelector('.holo-item:nth-child(3)').classList.contains('is-front'), lines: document.querySelectorAll('.holo-item:nth-child(3) .file-card-lines li').length }));
  check('Enter brings honours.txt to the front with every line', front.exp === 'true' && front.front && front.lines === 6, JSON.stringify(front));
  await page.keyboard.press('Escape');
  await sleep(700);
  check('Esc returns it to the orbit, focus stays on its button', await page.evaluate(() => !document.querySelector('.holo-item.is-front') && document.activeElement?.classList.contains('holo-btn')));
  check('no photo stack or folding resume in About', (await page.$('#about .card-swap, #about .bill-stage, #about [data-photo-slot]')) === null);

  // Compose: Send builds a mailto link from the fields.
  await goTo(page, '#contact');
  await page.type('[data-compose] input[name="subject"]', 'Coffee chat?');
  await page.type('[data-compose] textarea', 'Hi Aryan, loved the site.');
  await click(page, '[data-send]');
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
