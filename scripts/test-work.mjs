// Drives ~/work in real Chrome: featured windows, folders, folder pages, project windows,
// project pages, old-URL redirects, shared links, the phone layout and Lite mode.
// Usage: node scripts/test-work.mjs [baseUrl]   (needs `npm run preview` running)
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

async function newPage(viewport, url = base + '/') {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport(viewport);
  await page.evaluateOnNewDocument(() => sessionStorage.setItem('aryan-os:booted', '1'));
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
  page.on('console', (m) => m.type() === 'error' && problems.push('console: ' + m.text()));
  page.on('response', (r) => r.status() >= 400 && problems.push(`http ${r.status()}: ${r.url()}`));
  await page.goto(url, { waitUntil: 'networkidle2' });
  await sleep(1500);
  return page;
}
const has = (page, sel) => page.$(sel).then(Boolean);
const text = (page, sel) => page.$eval(sel, (el) => el.textContent.trim()).catch(() => '');
const scrollTo = (page, sel) => page.$eval(sel, (el) => el.scrollIntoView({ block: 'center' }));

const index = await (await fetch(base + '/work/index.json')).json();
check('project data has every project', index.length === 21, `${index.length} projects`);

// ---------- Desktop ----------
{
  const page = await newPage({ width: 1440, height: 900 });
  const featured = await page.$$eval('.fcard-title', (els) => els.map((e) => e.textContent.trim()));
  check(
    'four featured projects, in order',
    featured.join('|') === "TruthLens|Dr. Okamoto's Lab, Mount Sinai|JoeyHelps|Youreka",
    featured.join(' | '),
  );

  // A featured card opens its window.
  await scrollTo(page, '.fcard a[data-open-window="okamoto-lab"]');
  await sleep(800);
  await page.click('.fcard a[data-open-window="okamoto-lab"]');
  await page.waitForSelector('[data-window="okamoto-lab"] .reader-title', { timeout: 5000 }).catch(() => {});
  check('featured card opens its project window', (await text(page, '[data-window="okamoto-lab"] .reader-title')) === "Dr. Okamoto's Lab, Mount Sinai");
  check('URL hash follows the project window', page.url().endsWith('#work/okamoto-lab'), page.url());
  const photos = (await page.$$('[data-window="okamoto-lab"] .reader-photos img')).length;
  const links = (await page.$$('[data-window="okamoto-lab"] .work-links a')).length;
  check('project window shows photos and links', photos === 6 && links === 3, `photos=${photos} links=${links}`);
  await page.keyboard.press('Escape');
  await sleep(500);
  check('Esc closes the project window', !(await has(page, '[data-window="okamoto-lab"]')));

  // Folder page, then a project (folder details: scripts/test-folders.mjs).
  await scrollTo(page, 'a.gf-hit[data-open-window="ventures"]');
  await sleep(600);
  await page.click('a.gf-hit[data-open-window="ventures"]');
  await page.waitForSelector('[data-window="ventures"] .fp-card', { timeout: 4000 }).catch(() => {});
  const rows = await page.$$eval('[data-window="ventures"] .fp-name', (els) => els.map((e) => e.textContent));
  check('ventures/ lists its projects, top picks first', rows.join(',') === 'JoeyHelps,CraftNova,Jobby', rows.join(','));
  await page.click('[data-window="ventures"] a[data-open-window="craftnova"]');
  await page.waitForSelector('[data-window="craftnova"] .reader-title', { timeout: 4000 }).catch(() => {});
  check('clicking a folder card opens the project', (await text(page, '[data-window="craftnova"] .reader-title')) === 'CraftNova');
  check(
    'both windows stay open, project in front',
    (await has(page, '[data-window="ventures"]')) &&
      (await page.$eval('[data-window="craftnova"]', (w) => w.hasAttribute('data-focused'))),
  );
  await page.screenshot({ path: '.shots/p3-windows.png' });

  // Work menu.
  await page.click('[data-menu-trigger="work"]');
  await sleep(150);
  const menu = await page.$$eval('[data-menu="work"] [role="menuitem"]', (els) => els.map((e) => e.textContent.trim()));
  check('Work menu lists folders and featured projects', menu.length === 9 && menu[0] === 'research/' && menu[5] === 'TruthLens', menu.join(' | '));
  await page.keyboard.press('Escape');

  const href = await page.$eval('.fcard a[data-open-window="joeyhelps"]', (a) => a.getAttribute('href'));
  check('featured links are real links to the full page', href === '/work/joeyhelps/', href);

  await scrollTo(page, '.work-all summary');
  await page.click('.work-all summary');
  await sleep(200);
  check('the full list shows all 21 projects', (await page.$$('.work-all tbody tr')).length === 21);
  await page.close();
}

// ---------- A shared link opens its window on load ----------
{
  const page = await newPage({ width: 1440, height: 900 }, base + '/#tks');
  await page.waitForSelector('[data-window="tks"] .reader-title', { timeout: 5000 }).catch(() => {});
  check('an old shared link (/#tks) opens that project in the reader', (await text(page, '[data-window="tks"] .reader-title')) === 'The Knowledge Society');
  check('old #tks link is rewritten to #work/tks', page.url().endsWith('#work/tks'), page.url());
  await page.close();
}

// ---------- Project pages and old URLs ----------
{
  const page = await newPage({ width: 1440, height: 900 }, base + '/TKS/');
  await sleep(500);
  check('old /TKS/ URL lands on /work/tks/', page.url().endsWith('/work/tks/'), page.url());
  check('the TKS page has its title', (await text(page, 'h1')) === 'The Knowledge Society');
  await page.close();

  const legacy = ['TKS/', 'SHAD/', 'JoeyHelps/', 'Youreka/', 'NYAS/', 'SchoolClubs/', 'TEDEd/', 'PREVENT-Project/', 'SickKidsMentorship/', 'Dr.Okamoto-lab/', 'CraftNova.html', 'iGEM.html', 'illume.html'];
  const broken = [];
  for (const old of legacy) {
    const html = await (await fetch(`${base}/${old}`)).text();
    const to = html.match(/url=([^"]+)"/)?.[1];
    if (!to || (await fetch(base + to)).status !== 200) broken.push(old);
  }
  check('all 13 old URLs redirect to a working page', broken.length === 0, broken.join(', '));

  const missing = [];
  for (const p of index) {
    if ((await fetch(`${base}/work/${p.id}/`)).status !== 200) missing.push(p.id);
  }
  check('every project has a page', missing.length === 0, missing.join(', '));
}

// ---------- Phone ----------
{
  const page = await newPage({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, window.innerWidth) - document.documentElement.clientWidth);
  check('no sideways scroll on phone', overflow <= 0, `overflow=${overflow}`);
  const tallest = await page.$$eval('.fcard', (els) => Math.max(...els.map((e) => e.getBoundingClientRect().height)));
  check('featured cards fit between the menu bar and the dock', tallest < 844 - 44 - 96, `tallest=${Math.round(tallest)}`);
  await scrollTo(page, 'a.gf-hit[data-open-window="code"]');
  await sleep(500);
  await page.tap('[data-folder="code"] .gf-front');
  await page.waitForSelector('[data-window="code"]', { timeout: 4000 }).catch(() => {});
  await sleep(1000);
  const r = await page.$eval('[data-window="code"]', (w) => w.getBoundingClientRect().toJSON()).catch(() => ({}));
  check('a folder opens as a full-screen sheet', r.width === 390 && Math.abs(r.y) < 1, JSON.stringify(r));
  await page.screenshot({ path: '.shots/p3-phone-finder.png' });
  await page.close();
}

// ---------- Lite ----------
{
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('aryan-os:lite', 'on');
    sessionStorage.setItem('aryan-os:booted', '1');
  });
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
  await page.goto(base + '/', { waitUntil: 'networkidle2' });
  await page.$eval('#work', (el) => window.scrollTo(0, el.offsetTop + 1800));
  await sleep(500);
  const transforms = await page.$$eval('.fcard', (els) => els.map((e) => e.style.transform).filter(Boolean));
  check('Lite: cards stack without scaling', transforms.length === 0, transforms.join(','));
  await scrollTo(page, '.fcard a[data-open-window="youreka"]');
  await page.click('.fcard a[data-open-window="youreka"]');
  await page.waitForSelector('[data-window="youreka"] .reader-title', { timeout: 4000 }).catch(() => {});
  check('Lite: project windows still open', await has(page, '[data-window="youreka"] .reader-title'));
  await page.close();
}

await browser.close();
console.log(results.join('\n'));
if (problems.length) {
  console.log('\nProblems:\n' + problems.map((p) => ' - ' + p).join('\n'));
  process.exit(1);
}
console.log('\nAll checks passed.');
