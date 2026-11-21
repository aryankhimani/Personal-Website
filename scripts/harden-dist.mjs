// Post-build hardening for the static site (runs after `astro build`, see package.json).
// GitHub Pages can't send security headers, so this:
//   1. writes a Content-Security-Policy <meta> into every HTML page in dist/, right after
//      <meta charset>. Inline scripts are allowed by their SHA-256 hash only (no
//      'unsafe-inline' / 'unsafe-eval' for scripts), everything else must come from this site.
//   2. fails the build if a page has inline event handlers (onclick=...) or javascript: URLs,
//      which the policy would block anyway.
//   3. fails the build if dist/ contains source maps, .git, _private, .scratch, .env or debug
//      routes (/colour, /test...).
// Usage: node scripts/harden-dist.mjs [distDir]
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

const dist = process.argv[2] || 'dist';
const problems = [];

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const files = walk(dist);

// 3. Nothing private, no source maps, no debug pages.
const FORBIDDEN = [/\.map$/, /(^|\/)\.git(\/|$)/, /(^|\/)_private(\/|$)/, /(^|\/)\.scratch(\/|$)/, /(^|\/)\.env/, /(^|\/)colour(\/|$)/, /(^|\/)(test|debug)(\/|\.html|$)/, /\.DS_Store$/];
for (const f of files) {
  const rel = relative(dist, f);
  if (FORBIDDEN.some((re) => re.test(rel))) problems.push(`not allowed in dist/: ${rel}`);
  if (/\.(js|css)$/.test(f) && /sourceMappingURL=/.test(readFileSync(f, 'utf8'))) problems.push(`source map reference in ${rel}`);
}

const policy = (hashes) =>
  [
    "default-src 'self'",
    `script-src 'self' ${hashes.map((h) => `'sha256-${h}'`).join(' ')}`.trim(),
    // Inline style attributes are part of how Astro/React render (and carry no script).
    "style-src 'self' 'unsafe-inline'",
    // data: for small inline SVG/PNG, blob: for the dropzone toy (local files, never uploaded).
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "media-src 'self'",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; ');

let pages = 0;
for (const f of files.filter((f) => f.endsWith('.html'))) {
  let html = readFileSync(f, 'utf8');
  const rel = relative(dist, f);
  html = html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/gi, '');

  // 2. Inline handlers / javascript: URLs.
  const handler = html.match(/<[a-z][^>]*\s(on[a-z]+)\s*=\s*["'][^"']*["']/i);
  if (handler) problems.push(`inline event handler ${handler[1]}= in ${rel}`);
  if (/\s(href|src|action)\s*=\s*["']\s*javascript:/i.test(html)) problems.push(`javascript: URL in ${rel}`);

  // 1. Hash every executable inline script (not src=, not JSON/data blocks).
  const hashes = new Set();
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = m[1];
    if (/\ssrc\s*=/.test(attrs)) continue;
    const type = attrs.match(/\stype\s*=\s*["']?([^"'\s>]+)/i)?.[1]?.toLowerCase();
    if (type && !['module', 'text/javascript', 'application/javascript'].includes(type)) continue;
    hashes.add(createHash('sha256').update(m[2], 'utf8').digest('base64'));
  }
  const meta = `<meta http-equiv="Content-Security-Policy" content="${policy([...hashes])}">`;
  if (/<meta charset[^>]*>/i.test(html)) html = html.replace(/<meta charset[^>]*>/i, (m) => `${m}${meta}`);
  else if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, (m) => `${m}${meta}`);
  // Astro's redirect pages (old URLs) are just a doctype, a title and a meta refresh.
  else if (/<!doctype html>/i.test(html)) html = html.replace(/<!doctype html>/i, (m) => `${m}${meta}`);
  else {
    problems.push(`no <head> to put the CSP in: ${rel}`);
    continue;
  }
  writeFileSync(f, html);
  pages++;
}

if (!existsSync(join(dist, 'index.html'))) problems.push('dist/index.html missing');
if (problems.length) {
  console.error(`harden-dist: ${problems.length} problem(s):\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`harden-dist: CSP written to ${pages} pages; no source maps, private files or debug routes in dist/.`);
