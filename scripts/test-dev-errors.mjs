// Console-error sweep (run against npm run dev, which catches errors preview hides). Usage: node scripts/test-dev-errors.mjs [url]
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, protocolTimeout: 120000 });
for (const [path, motion, lite] of [['', 'no-preference', false], ['', 'reduce', false], ['', 'no-preference', true], ['work/truthlens/', 'no-preference', false]]) {
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: motion }]);
  await p.evaluateOnNewDocument((l) => { sessionStorage.setItem('aryan-os:booted', '1'); if (l) localStorage.setItem('aryan-os:lite', 'on'); }, lite);
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto((process.argv[2] || 'http://localhost:4321/') + path, { waitUntil: 'networkidle2', timeout: 120000 });
  await p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 800) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); } });
  await new Promise((r) => setTimeout(r, 1500));
  console.log(`${errs.length ? 'FAIL' : 'PASS'}  dev /${path} motion=${motion} lite=${lite}  ${errs.slice(0, 3).join(' | ')}`);
  await p.close();
}
await b.close();
