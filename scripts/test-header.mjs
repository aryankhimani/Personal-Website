// Header v2 + dock auto-hide checks. Usage: node scripts/test-header.mjs [url] [--shot file.png]
import puppeteer from 'puppeteer-core';
const base = process.argv[2]?.startsWith('http') ? process.argv[2] : 'http://localhost:4321/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fail = 0;
const check = (name, ok, info = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? `  ${info}` : ''}`);
  if (!ok) fail++;
};
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.evaluateOnNewDocument(() => sessionStorage.setItem('aryan-os:booted', '1'));
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text() + ' ' + (m.args()[2]?.toString() ?? '') + (m.args()[3]?.toString() ?? '')));
await page.goto(base, { waitUntil: 'networkidle2' });
await sleep(800);

const fill = await page.$eval('header .os-brand-mark path', (p) => p.getAttribute('fill'));
check('AK mark replaces the dot', fill?.startsWith('url(#'), fill);
const ids = await page.$$eval('header linearGradient', (g) => g.map((x) => x.id));
check('gradient ids are unique', new Set(ids).size === ids.length, ids.join(','));

const hidden = () => page.$eval('nav.os-dock', (n) => n.hasAttribute('data-hidden'));
await page.mouse.move(700, 300);
for (let i = 0; i < 6; i++) { await page.mouse.wheel({ deltaY: 300 }); await sleep(120); }
await sleep(800);
check('dock hides on scroll down', await hidden());
await page.mouse.wheel({ deltaY: -300 });
await sleep(800);
check('dock returns on scroll up', !(await hidden()));
for (let i = 0; i < 4; i++) { await page.mouse.wheel({ deltaY: 300 }); await sleep(120); }
await sleep(800);
await page.mouse.move(700, 880);
await sleep(300);
check('dock returns when mouse nears bottom', !(await hidden()));
check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));

const shot = process.argv.indexOf('--shot');
if (shot > -1) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(1500);
  await page.hover('.hero-cta');
  await sleep(400);
  await page.screenshot({ path: process.argv[shot + 1] });
}
await browser.close();
console.log(fail ? `\n${fail} failed.` : '\nAll checks passed.');
process.exit(fail ? 1 : 0);
