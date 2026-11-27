// Security checks on the built site (run against npm run preview):
//   - every page has the CSP <meta> (no 'unsafe-eval', no 'unsafe-inline' for scripts,
//     object-src 'none', base-uri 'self') and a strict referrer policy
//   - zero CSP violations and no console errors while using the whole site: scrolling,
//     every folder page and project reader, the ⌘K palette, the secret terminal, toys, compose
//   - no third-party requests at all (fonts, scripts, images all from this site)
//   - every external link has rel="noopener noreferrer"
//   - loaded inside another site's frame, the page breaks out (clickjacking guard)
// Usage: node scripts/test-security.mjs [baseUrl]
import puppeteer from 'puppeteer-core';
import { createServer } from 'node:http';

const base = (process.argv[2] || 'http://localhost:4321/').replace(/\/?$/, '/');
const origin = new URL(base).origin;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fail = 0;
const check = (name, ok, info = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? `  ${info}` : ''}`);
  if (!ok) fail++;
};
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const violations = [];
const errors = [];
const thirdParty = new Set();

async function open(path, opts = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: opts.width ?? 1440, height: opts.height ?? 900, isMobile: !!opts.touch, hasTouch: !!opts.touch });
  await page.evaluateOnNewDocument(() => {
    sessionStorage.setItem('aryan-os:booted', '1');
    document.addEventListener('securitypolicyviolation', (e) => {
      (window.__csp ??= []).push(`${e.violatedDirective} ${e.blockedURI} ${e.sourceFile ?? ''}:${e.lineNumber ?? ''}`);
    });
  });
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (/Content Security Policy|Refused to/i.test(m.text())) violations.push(`${path}: ${m.text()}`);
    // The 404 page's own document is a 404, which Chrome logs.
    else if (!(/status of 404/.test(m.text()) && /nope|not-a-page/.test(path))) errors.push(`${path}: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`${path}: ${e.message}`));
  page.on('request', (r) => {
    const u = r.url();
    if (/^(data|blob|about|chrome-extension):/.test(u)) return;
    if (!u.startsWith(origin)) thirdParty.add(u);
  });
  await page.goto(base + path.replace(/^\//, ''), { waitUntil: 'networkidle2', timeout: 60000 });
  return page;
}
const collect = async (page, path) => {
  const v = await page.evaluate(() => window.__csp ?? []);
  v.forEach((x) => violations.push(`${path}: ${x}`));
};

// ---------- meta tags on every page type ----------
for (const path of ['/', '/work/joeyhelps/', '/this-is-not-a-page/', '/JoeyHelps/']) {
  const res = await fetch(base + path.replace(/^\//, ''), { redirect: 'manual' });
  const html = await res.text();
  const csp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1] ?? '';
  const script = csp.match(/script-src ([^;]+)/)?.[1] ?? '';
  check(
    `${path}: CSP meta (scripts by hash only, no eval, object-src none, base-uri self)`,
    !!csp && !/unsafe-eval|unsafe-inline/.test(script) && /object-src 'none'/.test(csp) && /base-uri 'self'/.test(csp) && /default-src 'self'/.test(csp),
    csp.slice(0, 80),
  );
  if (path !== '/JoeyHelps/') check(`${path}: referrer policy`, /<meta name="referrer" content="strict-origin-when-cross-origin"/.test(html));
}

// ---------- use the whole site under the CSP ----------
{
  const page = await open('/');
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
  });
  await sleep(2500);
  // Folder pages and every reader.
  const index = await (await fetch(base + 'work/index.json')).json();
  for (const h of ['research', 'ventures', 'code', 'programs', 'talks', ...index.map((p) => p.id)]) {
    await page.evaluate((h) => (location.hash = `#work/${h}`), h);
    await sleep(350);
    await page.keyboard.press('Escape');
    await sleep(150);
  }
  // ⌘K palette, typed input.
  await page.keyboard.down('Control');
  await page.keyboard.press('k');
  await page.keyboard.up('Control');
  await sleep(500);
  await page.keyboard.type('<img src=x onerror=alert(1)>');
  await sleep(200);
  const injected = await page.evaluate(() => !!document.querySelector('.palette img[src="x"]'));
  check('⌘K: typed HTML is shown as text, never parsed', !injected);
  await page.keyboard.press('Escape');
  // Compose form.
  await page.evaluate(() => document.getElementById('contact')?.scrollIntoView());
  await sleep(800);
  const subj = await page.$('[data-compose] input[name="subject"]');
  if (subj) {
    await subj.type('<b>hi</b>');
    const bold = await page.evaluate(() => !!document.querySelector('[data-compose] b'));
    check('compose: typed HTML is not parsed', !bold);
  }
  await collect(page, '/');
  await page.close();
}

// Secret terminal: type HTML into it if it can be opened.
{
  const page = await open('/');
  await sleep(1500);
  await page.evaluate(() => (location.hash = '#terminal'));
  await sleep(1200);
  const input = await page.$('[data-window="terminal"] input');
  if (input) {
    await input.type('<img src=x onerror=alert(1)>');
    await page.keyboard.press('Enter');
    await sleep(300);
    check('terminal: typed HTML is shown as text', !(await page.evaluate(() => !!document.querySelector('img[src="x"]'))));
  } else console.log('note  terminal input not found with ` (skipped)');
  await collect(page, 'terminal');
  await page.close();
}

// Phone + a project page + 404.
for (const [path, opts] of [['/', { width: 390, height: 844, touch: true }], ['/work/truthlens/', {}], ['/nope/', {}]]) {
  const page = await open(path, opts);
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 700) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 100));
    }
  });
  await sleep(1000);
  await collect(page, path);
  // External links.
  const links = await page.$$eval('a[href^="http"]', (as) => as.filter((a) => new URL(a.href).origin !== location.origin).map((a) => ({ href: a.href, rel: a.rel })));
  const bad = links.filter((l) => !/noopener/.test(l.rel) || !/noreferrer/.test(l.rel));
  check(`${path}${opts.touch ? ' (phone)' : ''}: ${links.length} external links have rel="noopener noreferrer"`, bad.length === 0, bad.slice(0, 3).map((b) => b.href).join(' | '));
  await page.close();
}

check('zero CSP violations', violations.length === 0, violations.slice(0, 5).join(' || '));
check('no console errors', errors.length === 0, errors.slice(0, 5).join(' || '));
check('no third-party requests (scripts, fonts, images all from this site)', thirdParty.size === 0, [...thirdParty].slice(0, 5).join(' | '));

// ---------- clickjacking guard ----------
{
  const page = await browser.newPage();
  // A cross-origin parent (another port = another origin) that frames the site.
  const evil = createServer((_, res) => res.end(`<!doctype html><iframe src="${base}" width="800" height="600"></iframe>`));
  await new Promise((r) => evil.listen(4399, 'localhost', r));
  await page.goto('http://localhost:4399/');
  await sleep(4000);
  const top = page.url();
  // Chrome lets a cross-origin frame navigate the top window only after a user click, so the
  // guard either breaks out or, when blocked, hides the framed page (nothing to click-jack).
  const framed = page.frames().find((f) => f.url().startsWith(origin));
  const hidden = framed ? await framed.evaluate(() => document.documentElement.style.display === 'none').catch(() => false) : false;
  check('framed by another site, the page breaks out or blanks itself', top.startsWith(origin) || hidden, `top=${top.slice(0, 30)} hidden=${hidden}`);
  evil.close();
  await page.close();
}

await browser.close();
console.log(fail ? `\n${fail} failed.` : '\nAll checks passed.');
process.exit(fail ? 1 : 0);
