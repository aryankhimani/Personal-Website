// Accessibility checks (Phase 6 step 8c). Usage: node scripts/test-a11y.mjs [base-url] [--verbose]
// Runs axe-core (WCAG 2 A/AA, loaded from a CDN into the test browser only) plus our own checks:
// landmarks, heading order, alt text, decorative canvases, keyboard focus rings, reduced motion, Lite.
import puppeteer from 'puppeteer-core';
const base = (process.argv[2]?.startsWith('http') ? process.argv[2] : 'http://localhost:4321/').replace(/\/?$/, '/');
const verbose = process.argv.includes('--verbose');
const AXE = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fail = 0;
const tables = [];
import { writeFileSync } from 'node:fs';
const check = (name, ok, info = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? `  ${info}` : ''}`);
  if (!ok) fail++;
};
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});

async function open(path, { motion = 'no-preference', width = 1440, height = 900, lite = false } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: motion }]);
  await page.evaluateOnNewDocument((lite) => {
    sessionStorage.setItem('aryan-os:booted', '1');
    if (lite) localStorage.setItem('aryan-os:lite', 'on');
  }, lite);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(base + path, { waitUntil: 'networkidle2' });
  await sleep(900);
  return { page, errors };
}

async function axe(page, label) {
  await page.addScriptTag({ url: AXE });
  // Scroll through once so lazy islands mount, then back to top.
  await page.evaluate(async () => {
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y < h; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
    window.scrollTo(0, 0);
  });
  await sleep(600);
  const res = await page.evaluate(async () => {
    // Journey words start at 12% opacity and scrub to 100% as you scroll (screen readers get the
    // whole sentence in a separate span), so their mid-reveal contrast isn't a real failure.
    const r = await window.axe.run({ exclude: [['.chapter-line > span[aria-hidden="true"]']] }, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] });
    // Contrast table: every distinct text/background pair axe measured, with the lowest ratio seen.
    const pairs = {};
    for (const n of (r.passes.find((p) => p.id === 'color-contrast')?.nodes || [])) {
      const d = n.any[0]?.data; if (!d?.fgColor) continue;
      const k = `${d.fgColor} on ${d.bgColor}`;
      const big = /pt/.test(d.fontSize || '') && (parseFloat(d.fontSize) >= 18 || (parseFloat(d.fontSize) >= 14 && /bold|[7-9]00/.test(d.fontWeight || '')));
      const cur = pairs[k] || { fg: d.fgColor, bg: d.bgColor, ratio: 99, need: 99, n: 0, eg: n.target.join(' ').slice(0, 60) };
      cur.n++; if (d.contrastRatio < cur.ratio) { cur.ratio = d.contrastRatio; cur.need = big ? 3 : 4.5; cur.eg = n.target.join(' ').slice(0, 60); }
      pairs[k] = cur;
    }
    window.__pairs = Object.values(pairs).sort((a, b) => a.ratio - b.ratio);
    return r.violations.map((v) => ({
      id: v.id, impact: v.impact, help: v.help,
      nodes: v.nodes.slice(0, 6).map((n) => `${n.target.join(' ')} :: ${(n.failureSummary || '').split('\n').slice(1, 2).join(' ').trim()}`),
      count: v.nodes.length,
    }));
  });
  const pairs = await page.evaluate(() => window.__pairs);
  tables.push(`### ${label}\n\n| text | background | lowest ratio | needs | elements | example |\n|---|---|---|---|---|---|\n` +
    pairs.map((p) => `| ${p.fg} | ${p.bg} | ${p.ratio.toFixed(2)} | ${p.need} | ${p.n} | \`${p.eg.replace(/\|/g, '/')}\` |`).join('\n'));
  const serious = res.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  check(`${label}: axe has no serious/critical issues`, serious.length === 0, serious.map((v) => `${v.id}(${v.count})`).join(', '));
  for (const v of res) {
    if (verbose || v.impact === 'serious' || v.impact === 'critical') {
      console.log(`   [${v.impact}] ${v.id}: ${v.help} (${v.count})`);
      for (const n of v.nodes) console.log(`       ${n}`);
    } else console.log(`   (minor) [${v.impact}] ${v.id} (${v.count})`);
  }
}

async function structure(page, label) {
  const s = await page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && (r.width > 0 || r.height > 0); };
    const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter((h) => !h.closest('[hidden],[aria-hidden="true"],dialog:not([open])'));
    let jump = null; let prev = 0;
    for (const h of hs) { const l = +h.tagName[1]; if (prev && l > prev + 1 && !jump) jump = `${h.tagName} "${h.textContent.trim().slice(0, 30)}" after h${prev}`; prev = l; }
    const imgs = [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).map((i) => i.src.split('/').pop());
    const badAlt = [...document.querySelectorAll('img[alt]')].filter((i) => /arden|image|photo of|picture|placeholder/i.test(i.alt)).map((i) => i.alt);
    const canv = [...document.querySelectorAll('canvas')].filter((c) => !c.closest('[aria-hidden="true"]') && c.getAttribute('aria-hidden') !== 'true' && !c.getAttribute('aria-label') && c.getAttribute('role') !== 'img').map((c) => c.className || c.parentElement?.className);
    return {
      main: document.querySelectorAll('main').length,
      header: !!document.querySelector('header'), nav: !!document.querySelector('nav'), footer: !!document.querySelector('footer'),
      h1: hs.filter((h) => h.tagName === 'H1').length, jump, imgs, badAlt, canv,
      lang: document.documentElement.lang,
      skip: !!document.querySelector('a[href="#main"], a.skip, a[href^="#main"]'),
    };
  });
  check(`${label}: html lang set`, !!s.lang, s.lang);
  check(`${label}: one <main>`, s.main === 1, String(s.main));
  check(`${label}: header/nav/footer landmarks`, s.header && s.nav && s.footer, JSON.stringify({ h: s.header, n: s.nav, f: s.footer }));
  check(`${label}: exactly one visible h1`, s.h1 === 1, String(s.h1));
  check(`${label}: headings don't skip levels`, !s.jump, s.jump || '');
  check(`${label}: every <img> has alt`, s.imgs.length === 0, s.imgs.join(', '));
  check(`${label}: no placeholder alt text`, s.badAlt.length === 0, s.badAlt.join(' | '));
  check(`${label}: canvases are hidden from screen readers or labelled`, s.canv.length === 0, s.canv.join(', '));
  check(`${label}: skip link to main`, s.skip);
}

async function keyboard(page, label, tabs = 60) {
  const seen = []; const noRing = []; const hiddenFocus = [];
  await page.evaluate(() => { window.scrollTo(0, 0); document.activeElement?.blur(); });
  for (let i = 0; i < tabs; i++) {
    await page.keyboard.press('Tab');
    await sleep(40);
    const f = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
      const has = (e, pseudo) => { const c = getComputedStyle(e, pseudo); return (c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) >= 1) || (c.boxShadow && c.boxShadow !== 'none' && !pseudo); };
      // The ring may sit on the control, its ::after, or an inner element (dock icons, folder fronts).
      const ring = has(el) || has(el, '::after') || [...el.querySelectorAll('*')].slice(0, 40).some((d) => has(d));
      const name = `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : ''} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24)}"`;
      return { name, ring, offscreen: r.width === 0 || r.height === 0 || cs.visibility === 'hidden' || +cs.opacity === 0 };
    });
    if (!f) continue;
    seen.push(f.name);
    if (!f.ring) noRing.push(f.name);
    if (f.offscreen) hiddenFocus.push(f.name);
  }
  check(`${label}: Tab reaches controls`, seen.length > 10, `${new Set(seen).size} unique`);
  check(`${label}: every focused control shows a ring`, noRing.length === 0, [...new Set(noRing)].slice(0, 8).join(' | '));
  check(`${label}: focus never lands on invisible things`, hiddenFocus.length === 0, [...new Set(hiddenFocus)].slice(0, 8).join(' | '));
  if (verbose) console.log('   tab order:', seen.join(' > '));
}

async function motionOff(page, label) {
  // Count rAF callbacks over 1s; with reduced motion / Lite the page should be (nearly) still.
  const n = await page.evaluate(() => new Promise((res) => {
    let c = 0; const orig = window.requestAnimationFrame;
    window.requestAnimationFrame = (cb) => orig((t) => { c++; cb(t); });
    setTimeout(() => { window.requestAnimationFrame = orig; res(c); }, 1000);
  }));
  const anims = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().iterations === Infinity).map((a) => a.animationName || a.effect?.target?.className || 'anim').slice(0, 8));
  check(`${label}: rAF loops mostly stopped`, n < 30, `${n} callbacks/s`);
  check(`${label}: no infinite CSS animations`, anims.length === 0, anims.join(', '));
}

// 1. Home, normal motion
{
  const { page, errors } = await open('');
  await structure(page, 'home');
  await keyboard(page, 'home');
  await axe(page, 'home');
  check('home: no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await page.close();
}
// 2. Home, reduced motion
{
  const { page } = await open('', { motion: 'reduce' });
  await motionOff(page, 'reduced motion');
  await page.close();
}
// 3. Home, Lite toggle
{
  const { page } = await open('', { lite: true });
  await motionOff(page, 'Lite');
  await page.close();
}
// 4. Phone
{
  const { page } = await open('', { width: 390, height: 844 });
  await structure(page, 'phone');
  await page.close();
}
// 5. 404 + a project page
for (const p of ['nope-404', 'work/' + (process.env.SLUG || '')]) {
  if (p === 'work/') {
    const { page } = await open('');
    const href = await page.$eval('a[href^="/work/"]', (a) => a.getAttribute('href')).catch(() => null);
    await page.close();
    if (!href) { check('project page found', false); continue; }
    const r = await open(href.replace(/^\//, ''));
    await structure(r.page, href); await axe(r.page, href);
    check(`${href}: no console errors`, r.errors.length === 0, r.errors.slice(0, 3).join(' | '));
    await r.page.close();
  } else {
    const r = await open(p);
    await axe(r.page, '404'); await keyboard(r.page, '404', 15);
    await r.page.close();
  }
}

await browser.close();
writeFileSync('_private/contrast-table.md', `# Contrast table (made by scripts/test-a11y.mjs, ${new Date().toISOString().slice(0, 10)})\n\nEvery text colour on its real background, as axe measured it on the built site. AA needs 4.5 (3 for large text).\n\n${tables.join('\n\n')}\n`);
console.log('wrote _private/contrast-table.md');
console.log(fail ? `\n${fail} check(s) failed` : '\nall a11y checks passed');
process.exit(fail ? 1 : 0);
