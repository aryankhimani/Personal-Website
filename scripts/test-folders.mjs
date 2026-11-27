// Liquid-glass folders and folder pages: one row, top 3 in front, the rest blurred behind;
// a folder opens as #work/<folder>, projects open on top of it, Esc/back unwind in order.
// Usage: node scripts/test-folders.mjs [baseUrl] [shotsDir]   (needs `npm run preview`)
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

async function open(vp, url = base) {
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport(vp);
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.evaluateOnNewDocument(() => sessionStorage.setItem('aryan-os:booted', '1'));
  await p.goto(url, { waitUntil: 'networkidle0' });
  await sleep(600);
  return p;
}
const hash = (p) => p.evaluate(() => location.hash);
const has = (p, sel) => p.evaluate((s) => !!document.querySelector(s), sel);

{
  const p = await open({ width: 1440, height: 900 });
  await p.$eval('.gfolders', (e) => e.scrollIntoView({ block: 'center' }));
  await sleep(1200);

  const row = await p.$$eval('.gf', (els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
  check('five folders in one row', row.length === 5 && new Set(row).size === 1, JSON.stringify(row));
  const research = await p.$eval('[data-folder="research"]', (e) => ({
    front: [...e.querySelectorAll('a.gf-paper .gf-paper-title')].map((t) => t.textContent),
    behind: e.querySelectorAll('.gf-paper-behind').length,
  }));
  check('research shows its top 3 in front', research.front.join('|') === 'AI pose tracking at Mount Sinai|PREVENT Project|Youreka', research.front.join(' | '));
  check('the other 2 sit blurred behind', research.behind === 2);
  check('leadership caps the blurred ones at 3', (await p.$$eval('[data-folder="leadership"] .gf-paper-behind', (e) => e.length)) === 3);
  check('the front glass really blurs what is behind it', await p.$eval('.gf-front', (e) => (getComputedStyle(e).backdropFilter || getComputedStyle(e).webkitBackdropFilter).includes('blur')));

  await p.hover('[data-folder="research"] .gf-hit');
  await sleep(500);
  if (shots) await p.screenshot({ path: `${shots}/folders-desk.jpg`, type: 'jpeg', quality: 65 });

  const scrollBefore = await p.evaluate(() => scrollY);
  await p.click('[data-folder="research"] .gf-front');
  await sleep(700);
  check('a folder opens as a page at #work/research', (await hash(p)) === '#work/research' && (await has(p, '[data-folder-page]')));
  const cards = await p.$$eval('.fp-grid li', (els) => els.map((e) => e.classList.contains('fp-top')));
  check('the page lists all 5, newest first, with 3 top picks', cards.length === 5 && cards.filter(Boolean).length === 3 && cards[0] && cards[1], JSON.stringify(cards));
  await sleep(600);
  if (shots) await p.screenshot({ path: `${shots}/folder-page.jpg`, type: 'jpeg', quality: 65 });

  await p.click('.fp-grid li:first-child .fp-card');
  await sleep(700);
  check('a card opens the reader on top', (await hash(p)) === '#work/okamoto-lab' && (await has(p, '[data-reader]')) && (await has(p, '[data-folder-page]')));
  await p.keyboard.press('Escape');
  await sleep(700);
  check('Esc returns to the folder page', (await hash(p)) === '#work/research' && !(await has(p, '[data-reader]')) && (await has(p, '[data-folder-page]')), await hash(p));

  await p.click('.fp-grid li:nth-child(2) .fp-card');
  await sleep(700);
  await p.goBack();
  await sleep(700);
  check('back returns to the folder page', (await hash(p)) === '#work/research' && !(await has(p, '[data-reader]')) && (await has(p, '[data-folder-page]')), await hash(p));

  await p.keyboard.press('Escape');
  await sleep(700);
  check('Esc again closes the folder, same scroll spot', !(await hash(p)) && !(await has(p, '[data-folder-page]')) && Math.abs((await p.evaluate(() => scrollY)) - scrollBefore) < 4);

  await p.hover('[data-folder="ai-ml"] .gf-hit');
  await sleep(500);
  await p.click('[data-folder="ai-ml"] a.gf-paper');
  await sleep(700);
  check('a front paper opens its project directly', (await hash(p)) === '#work/truthlens' && !(await has(p, '[data-folder-page]')), await hash(p));
}

{
  const p = await open({ width: 1440, height: 900 }, base + '#research');
  await sleep(500);
  check('old #research links open the folder page', (await hash(p)) === '#work/research' && (await has(p, '[data-folder-page]')));
}

for (const [old, now] of [['#work/code', 'software'], ['#programs', 'leadership'], ['#work/talks', 'leadership']]) {
  const p = await open({ width: 1440, height: 900 }, base + old);
  await sleep(500);
  check(`old ${old} links open ${now}/`, (await hash(p)) === `#work/${now}` && (await has(p, `[data-window="${now}"]`)), await hash(p));
}

{
  const p = await open({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const r = await p.evaluate(() => {
    const row = document.querySelector('.gfolders');
    return { rowScrolls: row.scrollWidth > row.clientWidth + 10, page: document.documentElement.scrollWidth };
  });
  check('on phones the row scrolls sideways, the page does not', r.rowScrolls && r.page === 390, JSON.stringify(r));
}

check('no console errors', errs.length === 0, errs.join(' | '));
await b.close();
console.log(problems.length ? `\n${problems.length} failed.` : '\nAll checks passed.');
process.exit(problems.length ? 1 : 0);
