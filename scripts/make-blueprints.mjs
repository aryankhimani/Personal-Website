// Blueprint illustrations for projects and articles that have no real image of their own.
// One style everywhere: navy ground, cream line drawing, a grid, dimension marks, a title
// block, and one small ember mark. Each drawing is a simple diagram of how the thing works.
// Labels only restate what the project or article itself says. Nothing here is a photo.
//
// Usage: node scripts/make-blueprints.mjs   (writes src/assets/blueprints/<id>.svg)
import { mkdirSync, writeFileSync } from 'node:fs';

const W = 1200;
const H = 800;
const NAVY = '#16224A';
const NAVY_DEEP = '#0B1430';
const CREAM = '#F2EBDD';
const EMBER = '#FF4A2B';
const MONO = "'Departure Mono', Menlo, 'DejaVu Sans Mono', monospace";

// ---------- drawing helpers (all return SVG strings) ----------
const ln = (x1, y1, x2, y2, o = 1, w = 2, dash = '') =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${CREAM}" stroke-opacity="${o}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
const rect = (x, y, w, h, o = 1, r = 6, fill = 'none') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${CREAM}" stroke-opacity="${o}" stroke-width="2"/>`;
const circ = (cx, cy, r, o = 1, w = 2, dash = '') =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${CREAM}" stroke-opacity="${o}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
const dot = (cx, cy, r = 5, c = CREAM) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}"/>`;
const path = (d, o = 1, w = 2, dash = '') =>
  `<path d="${d}" fill="none" stroke="${CREAM}" stroke-opacity="${o}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const txt = (x, y, s, size = 18, o = 0.9, anchor = 'start', c = CREAM) =>
  `<text x="${x}" y="${y}" font-family="${MONO}" font-size="${size}" fill="${c}" fill-opacity="${o}" text-anchor="${anchor}" letter-spacing="1">${esc(s)}</text>`;
/** An arrow with a small open head. */
function arrow(x1, y1, x2, y2, o = 0.9, dash = '') {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = 12;
  const p1 = [x2 - h * Math.cos(a - 0.45), y2 - h * Math.sin(a - 0.45)];
  const p2 = [x2 - h * Math.cos(a + 0.45), y2 - h * Math.sin(a + 0.45)];
  return ln(x1, y1, x2, y2, o, 2, dash) + path(`M${p1[0]},${p1[1]} L${x2},${y2} L${p2[0]},${p2[1]}`, o);
}
/** A horizontal dimension line with end ticks and a centred label. */
function dimH(x1, x2, y, label) {
  return (
    ln(x1, y, x2, y, 0.55, 1.5) +
    ln(x1, y - 10, x1, y + 10, 0.55, 1.5) +
    ln(x2, y - 10, x2, y + 10, 0.55, 1.5) +
    `<rect x="${(x1 + x2) / 2 - label.length * 6.5 - 10}" y="${y - 14}" width="${label.length * 13 + 20}" height="28" fill="${NAVY}"/>` +
    txt((x1 + x2) / 2, y + 6, label, 16, 0.75, 'middle')
  );
}
function dimV(x, y1, y2, label) {
  return (
    ln(x, y1, x, y2, 0.55, 1.5) +
    ln(x - 10, y1, x + 10, y1, 0.55, 1.5) +
    ln(x - 10, y2, x + 10, y2, 0.55, 1.5) +
    `<g transform="rotate(-90 ${x} ${(y1 + y2) / 2})"><rect x="${x - label.length * 6.5 - 10}" y="${(y1 + y2) / 2 - 14}" width="${label.length * 13 + 20}" height="28" fill="${NAVY}"/>${txt(x, (y1 + y2) / 2 + 6, label, 16, 0.75, 'middle')}</g>`
  );
}
/** A labelled box: a title and an optional second line. */
const box = (x, y, w, h, title, sub = '') =>
  rect(x, y, w, h) + txt(x + w / 2, y + h / 2 + (sub ? -4 : 7), title, 20, 0.95, 'middle') + (sub ? txt(x + w / 2, y + h / 2 + 24, sub, 14, 0.6, 'middle') : '');
/** Callout: a leader line from a point to a label. */
const callout = (px, py, lx, ly, label, anchor = 'start') =>
  dot(px, py, 4) + ln(px, py, lx, ly, 0.5, 1.5) + txt(lx + (anchor === 'start' ? 8 : -8), ly + 6, label, 15, 0.75, anchor);
/** A DNA double helix between x1 and x2 around y. */
function helix(x1, x2, y, amp = 34, turns = 3, rungs = 22) {
  const N = 140;
  const a = [];
  const b = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = x1 + (x2 - x1) * t;
    const ph = t * turns * Math.PI * 2;
    a.push(`${i ? 'L' : 'M'}${x.toFixed(1)},${(y + Math.sin(ph) * amp).toFixed(1)}`);
    b.push(`${i ? 'L' : 'M'}${x.toFixed(1)},${(y - Math.sin(ph) * amp).toFixed(1)}`);
  }
  let r = '';
  for (let i = 1; i < rungs; i++) {
    const t = i / rungs;
    const x = x1 + (x2 - x1) * t;
    const s = Math.sin(t * turns * Math.PI * 2) * amp;
    r += ln(x, y + s, x, y - s, 0.35, 1.5);
  }
  return path(a.join(''), 0.95, 2.5) + path(b.join(''), 0.6, 2.5) + r;
}
const gear = (cx, cy, r, teeth, o = 0.9) => {
  let d = '';
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const rr = i % 2 ? r : r + 12;
    const a2 = ((i + 1) / (teeth * 2)) * Math.PI * 2;
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)} L${(cx + Math.cos(a2) * rr).toFixed(1)},${(cy + Math.sin(a2) * rr).toFixed(1)} `;
  }
  return path(d + 'Z', o) + circ(cx, cy, r * 0.35, o * 0.7) + dot(cx, cy, 4);
};

// ---------- the frame every sheet shares ----------
function sheet({ id, title, kind, no, body }) {
  let grid = '';
  for (let x = 40; x <= W - 40; x += 20) grid += ln(x, 40, x, H - 40, x % 100 === 40 ? 0.1 : 0.045, 1);
  for (let y = 40; y <= H - 40; y += 20) grid += ln(40, y, W - 40, y, y % 100 === 40 ? 0.1 : 0.045, 1);
  // Edge ruler ticks along the top and left.
  let ticks = '';
  for (let x = 60; x < W - 40; x += 20) ticks += ln(x, 40, x, x % 100 === 60 ? 54 : 47, 0.45, 1.5);
  for (let y = 60; y < H - 40; y += 20) ticks += ln(40, y, y % 100 === 60 ? 54 : 47, y, 0.45, 1.5);
  // Title block, bottom right, like an engineering drawing.
  const tb = { x: W - 470, y: H - 150, w: 430, h: 110 };
  const block =
    `<rect x="${tb.x}" y="${tb.y}" width="${tb.w}" height="${tb.h}" fill="${NAVY_DEEP}" stroke="${CREAM}" stroke-opacity="0.7" stroke-width="2"/>` +
    ln(tb.x, tb.y + 62, tb.x + tb.w, tb.y + 62, 0.5, 1.5) +
    ln(tb.x + 250, tb.y + 62, tb.x + 250, tb.y + tb.h, 0.5, 1.5) +
    txt(tb.x + 16, tb.y + 40, title.length > 30 ? title.slice(0, 29) + '…' : title, 20, 1) +
    txt(tb.x + 16, tb.y + 92, `${kind}`, 14, 0.65) +
    txt(tb.x + 266, tb.y + 92, `DWG ${no} · N.T.S.`, 14, 0.65) +
    `<rect x="${tb.x + tb.w - 30}" y="${tb.y + 16}" width="14" height="14" fill="${EMBER}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Blueprint illustration: ${esc(title)}">
<rect width="${W}" height="${H}" fill="${NAVY}"/>
${grid}
<rect x="40" y="40" width="${W - 80}" height="${H - 80}" fill="none" stroke="${CREAM}" stroke-opacity="0.6" stroke-width="2"/>
${ticks}
${txt(72, 92, `~/${id}`, 16, 0.6)}
${body}
${block}
</svg>`;
}

// ---------- the drawings ----------
const S = {};

S.truthlens = {
  title: 'TruthLens',
  kind: 'project · code',
  body:
    // Browser with the extension
    rect(90, 170, 300, 220) + ln(90, 205, 390, 205, 0.7) + dot(110, 188, 5) + dot(128, 188, 5) + dot(146, 188, 5) +
    rect(330, 178, 46, 20, 0.9, 4) + txt(353, 193, 'ext', 12, 0.8, 'middle') +
    ln(115, 240, 330, 240, 0.5, 6) + ln(115, 265, 360, 265, 0.5, 6) + ln(115, 290, 300, 290, 0.5, 6) +
    `<rect x="110" y="310" width="210" height="50" fill="none" stroke="${EMBER}" stroke-width="2" stroke-dasharray="6 5"/>` +
    txt(240, 425, 'Chrome extension + web app', 15, 0.7, 'middle') +
    arrow(400, 280, 500, 280) + txt(450, 266, 'claim', 14, 0.7, 'middle') +
    box(510, 220, 220, 120, 'FastAPI', '/classify · /health') +
    arrow(740, 280, 820, 280) +
    box(830, 210, 260, 140, 'RoBERTa', 'fine-tuned · LoRA') +
    arrow(960, 360, 960, 450) +
    rect(820, 460, 280, 110) + txt(840, 500, 'verdict', 18, 0.95) + txt(840, 530, '+ why it decided', 15, 0.7) +
    path('M1050,490 l12,14 l22,-28', 0.95, 3) +
    ln(510, 380, 730, 380, 0.4, 1.5, '4 6') + txt(620, 405, 'response cache', 14, 0.6, 'middle') +
    dimH(110, 730, 610, 'backtest accuracy 40% → 90%'),
};

S['western-founders-network'] = {
  title: 'Western Founders Network',
  kind: 'project · programs',
  body: (() => {
    let b = '';
    // Students on the left, founders / mentors / recruiters on the right, three events between.
    const left = [];
    for (let i = 0; i < 12; i++) left.push([140 + (i % 3) * 46, 190 + Math.floor(i / 3) * 90]);
    const right = [[1010, 210], [1060, 330], [1000, 450], [1070, 560]];
    const ev = [[600, 220, 'Tech Consulting', '200+ students'], [600, 380, 'Coffee Chats', '42 of 114 picked'], [600, 540, 'Mosaic', '100+ students']];
    for (const [x, y] of left) for (const [, ey] of ev) if (Math.abs(ey - y) < 170) b += ln(x, y, 470, ey, 0.12, 1);
    for (const [x, y] of right) for (const [, ey] of ev) b += ln(730, ey, x, y, 0.18, 1);
    for (const [x, y] of left) b += circ(x, y, 13, 0.85) + dot(x, y, 3);
    for (const [x, y] of right) b += circ(x, y, 20, 0.9) + dot(x, y, 4);
    for (const [x, y, t, s] of ev) b += box(470, y - 50, 260, 100, t, s);
    b += txt(186, 560, 'students', 16, 0.7, 'middle') + txt(1036, 630, 'founders · mentors', 15, 0.7, 'middle');
    b += `<circle cx="600" cy="380" r="150" fill="none" stroke="${EMBER}" stroke-opacity="0.8" stroke-width="2" stroke-dasharray="3 9"/>`;
    b += dimH(470, 730, 640, '3 events');
    return b;
  })(),
};

S.illume = {
  title: 'Team Canada Chess',
  kind: 'project · programs',
  body: (() => {
    let b = '';
    const x0 = 360;
    const y0 = 130;
    const s = 60;
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if ((r + c) % 2) b += `<rect x="${x0 + c * s}" y="${y0 + r * s}" width="${s}" height="${s}" fill="${CREAM}" fill-opacity="0.1"/>`;
    b += rect(x0, y0, s * 8, s * 8, 0.9, 0);
    for (let i = 0; i < 8; i++) {
      b += txt(x0 - 18, y0 + i * s + 36, String(8 - i), 14, 0.6, 'middle');
      b += txt(x0 + i * s + 30, y0 + s * 8 + 26, 'abcdefgh'[i], 14, 0.6, 'middle');
    }
    // A knight's tour fragment.
    const tour = [[1, 7], [2, 5], [4, 4], [5, 2], [7, 1], [6, 3], [4, 2]];
    const pt = ([c, r]) => [x0 + c * s + 30, y0 + r * s + 30];
    b += path(tour.map((p, i) => `${i ? 'L' : 'M'}${pt(p).join(',')}`).join(' '), 0.85, 2.5, '8 6');
    for (const p of tour) b += dot(...pt(p), 6);
    b += `<circle cx="${pt(tour.at(-1))[0]}" cy="${pt(tour.at(-1))[1]}" r="14" fill="none" stroke="${EMBER}" stroke-width="3"/>`;
    b += callout(...pt(tour[0]), 300, 600, 'national round robin', 'end');
    b += callout(...pt(tour.at(-1)), 960, 330, 'place on Team Canada');
    b += dimH(x0, x0 + s * 8, 670, '8 × 8');
    return b;
  })(),
};

S['emerging-tech'] = {
  title: 'Monthly dive: emerging tech',
  kind: 'newsletter · substack',
  body: (() => {
    let b = '';
    // A scope trace across a monthly calendar strip.
    const months = ['SEP', 'OCT', 'NOV', 'DEC'];
    months.forEach((m, i) => (b += rect(120 + i * 230, 180, 200, 70, i === 2 ? 1 : 0.5) + txt(220 + i * 230, 224, m, 20, i === 2 ? 1 : 0.6, 'middle')));
    let d = 'M120,430';
    for (let x = 120; x <= 1060; x += 4) d += ` L${x},${(430 - Math.sin(x / 38) * 50 * Math.exp(-((x - 640) ** 2) / 90000) - Math.sin(x / 9) * 6).toFixed(1)}`;
    b += ln(120, 430, 1060, 430, 0.3, 1.5, '4 6') + path(d, 0.95, 2.5);
    b += `<circle cx="640" cy="${430 - Math.sin(640 / 38) * 50}" r="10" fill="none" stroke="${EMBER}" stroke-width="3"/>`;
    b += callout(640, 380, 760, 320, 'this month');
    b += txt(120, 560, 'one issue a month · new tech, explained', 16, 0.7);
    b += dimH(120, 1050, 600, '4 weeks');
    return b;
  })(),
};

S['spider-silk'] = {
  title: 'Synthetic spider silk',
  kind: 'article · medium',
  body: (() => {
    let b = '';
    const cx = 300;
    const cy = 360;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      b += ln(cx, cy, cx + Math.cos(a) * 200, cy + Math.sin(a) * 200, 0.7, 1.5);
    }
    for (let r = 30; r <= 200; r += 24) {
      let d = '';
      for (let i = 0; i <= 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
      }
      b += path(d, 0.55, 1.5);
    }
    b += arrow(520, 360, 590, 360);
    b += box(600, 200, 220, 80, 'silk gene') + arrow(710, 290, 710, 340) + box(600, 350, 220, 80, 'host cell') + arrow(710, 440, 710, 490) + box(600, 500, 220, 80, 'silk fibre');
    b += `<path d="M840,540 C900,540 920,470 980,470 S1060,400 1080,380" fill="none" stroke="${EMBER}" stroke-width="3"/>`;
    b += txt(900, 610, 'spun into thread', 15, 0.7);
    b += dimV(70, 160, 560, 'orb web');
    return b;
  })(),
};

S['synbio-101'] = {
  title: 'Synthetic biology 101',
  kind: 'article · medium',
  body: (() => {
    let b = '';
    // A plasmid with parts, and a past / present / future line.
    const cx = 330;
    const cy = 360;
    b += circ(cx, cy, 150, 0.95, 3) + circ(cx, cy, 138, 0.4, 1.5);
    const parts = [['promoter', -60], ['gene', 30], ['terminator', 120], ['ori', 210]];
    for (const [n, deg] of parts) {
      const a = (deg * Math.PI) / 180;
      const x = cx + Math.cos(a) * 150;
      const y = cy + Math.sin(a) * 150;
      b += `<path d="M${cx + Math.cos(a - 0.22) * 150},${cy + Math.sin(a - 0.22) * 150} A150,150 0 0 1 ${cx + Math.cos(a + 0.22) * 150},${cy + Math.sin(a + 0.22) * 150}" fill="none" stroke="${n === 'gene' ? EMBER : CREAM}" stroke-width="12"/>`;
      b += txt(cx + Math.cos(a) * 200, cy + Math.sin(a) * 200 + 6, n, 15, 0.75, Math.cos(a) > 0.2 ? 'start' : Math.cos(a) < -0.2 ? 'end' : 'middle');
      void x, void y;
    }
    b += txt(cx, cy + 6, 'plasmid', 18, 0.8, 'middle');
    const tl = [['past', 640], ['present', 820], ['future', 1000]];
    b += arrow(620, 360, 1080, 360);
    for (const [n, x] of tl) b += ln(x, 345, x, 375, 0.9) + txt(x, 330, n, 18, 0.9, 'middle');
    b += dimH(640, 1000, 460, 'past → future');
    return b;
  })(),
};

S.grind = {
  title: 'The beginning of the grind',
  kind: 'newsletter · substack',
  body:
    gear(380, 360, 120, 14) + gear(565, 300, 70, 9) + gear(560, 480, 60, 8) +
    // Steps going up to the right.
    path('M720,580 h80 v-70 h80 v-70 h80 v-70 h80 v-70', 0.9, 3) +
    `<circle cx="1040" cy="300" r="10" fill="${EMBER}"/>` +
    callout(760, 580, 760, 640, 'week 1') +
    dimV(1100, 300, 580, 'progress'),
};

S['summer-1-2'] = {
  title: 'My incredible summer 1/2',
  kind: 'newsletter · substack',
  body: (() => {
    let b = '';
    // A sun dial over a summer timeline, half of it marked.
    b += circ(600, 330, 80, 0.95, 3);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      b += ln(600 + Math.cos(a) * 100, 330 + Math.sin(a) * 100, 600 + Math.cos(a) * 130, 330 + Math.sin(a) * 130, 0.8, 2.5);
    }
    b += ln(140, 520, 1060, 520, 0.8, 2);
    ['JUL', 'AUG'].forEach((m, i) => (b += ln(140 + i * 460, 505, 140 + i * 460, 535, 0.9) + txt(160 + i * 460, 500, m, 18, 0.85)));
    b += ln(1060, 505, 1060, 535, 0.9);
    b += `<rect x="140" y="512" width="460" height="16" fill="${EMBER}" fill-opacity="0.85"/>`;
    b += dimH(140, 600, 590, 'part 1 of 2');
    return b;
  })(),
};

S['december-newsletter'] = {
  title: 'December newsletter',
  kind: 'newsletter · substack',
  body: (() => {
    let b = rect(380, 150, 440, 460, 0.95, 8) + ln(380, 220, 820, 220, 0.8) + txt(600, 198, 'DEC', 28, 1, 'middle');
    for (let i = 0; i < 31; i++) {
      const c = (i + 3) % 7;
      const r = Math.floor((i + 3) / 7);
      const x = 400 + c * 58;
      const y = 250 + r * 66;
      b += rect(x, y, 50, 56, 0.35, 3) + txt(x + 8, y + 22, String(i + 1), 13, 0.7);
    }
    b += `<rect x="${400 + ((30 + 3) % 7) * 58}" y="${250 + Math.floor(33 / 7) * 66}" width="50" height="56" fill="none" stroke="${EMBER}" stroke-width="3"/>`;
    b += callout(820, 260, 940, 260, 'one month, one letter');
    b += dimV(330, 150, 610, '31 days');
    return b;
  })(),
};

S['gene-editing-journey'] = {
  title: 'Starting in gene editing',
  kind: 'newsletter · substack',
  body:
    helix(120, 1080, 360, 60, 3.5) +
    `<line x1="640" y1="260" x2="640" y2="460" stroke="${EMBER}" stroke-width="3" stroke-dasharray="8 6"/>` +
    callout(640, 270, 760, 200, 'edit site') +
    path('M120,560 h60', 0.9, 3) + dot(120, 560, 8, EMBER) + txt(200, 566, 'start here', 16, 0.75) +
    dimH(120, 1080, 620, 'one strand, read 5′ → 3′'),
};

S['first-newsletter'] = {
  title: 'First ever newsletter',
  kind: 'newsletter · substack',
  body:
    rect(330, 200, 540, 340, 0.95, 6) + path('M330,200 L600,400 L870,200', 0.9, 2.5) + path('M330,540 L540,360 M870,540 L660,360', 0.5, 2) +
    rect(760, 220, 90, 100, 0.9, 2) + txt(805, 266, 'SEP', 18, 0.9, 'middle') + txt(805, 296, '#01', 16, 0.7, 'middle') +
    `<circle cx="600" cy="400" r="18" fill="${EMBER}"/>` +
    callout(330, 540, 220, 620, 'issue 01', 'end') +
    dimH(330, 870, 610, 'to: subscribers'),
};

S['thin-plate-spline'] = {
  title: 'Thin-plate spline motion',
  kind: 'article · sxs',
  body: (() => {
    let b = '';
    // A regular grid on the left warped into a bent grid on the right, with control points.
    const g = (ox, warp) => {
      let o = '';
      const n = 8;
      const s = 44;
      const f = (x, y) => (warp ? [x + Math.sin(y / 60) * 22, y + Math.sin(x / 70) * 18] : [x, y]);
      for (let i = 0; i <= n; i++) {
        let d1 = '';
        let d2 = '';
        for (let j = 0; j <= 32; j++) {
          const t = (j / 32) * n * s;
          const [ax, ay] = f(i * s, t);
          const [bx, by] = f(t, i * s);
          d1 += `${j ? 'L' : 'M'}${(ox + ax).toFixed(1)},${(200 + ay).toFixed(1)}`;
          d2 += `${j ? 'L' : 'M'}${(ox + bx).toFixed(1)},${(200 + by).toFixed(1)}`;
        }
        o += path(d1, 0.6, 1.5) + path(d2, 0.6, 1.5);
      }
      return o;
    };
    b += g(110, false) + g(690, true);
    b += arrow(510, 376, 670, 376) + txt(590, 360, 'warp', 15, 0.7, 'middle');
    for (const [x, y] of [[198, 288], [374, 288], [286, 464], [198, 464]]) b += dot(x, y, 7);
    for (const [x, y] of [[798, 300], [990, 280], [870, 470], [780, 480]]) b += dot(x, y, 7, EMBER);
    b += dimH(110, 462, 620, 'source frame') + dimH(690, 1060, 620, 'driven frame');
    return b;
  })(),
};

S['crispr-soldier'] = {
  title: 'CRISPR: the next super soldier',
  kind: 'article · medium',
  body:
    helix(100, 1100, 420, 46, 4) +
    // Cas9 as a rounded lobe, holding a guide RNA over the strand.
    `<path d="M480,300 C480,220 720,220 720,300 C760,330 760,470 700,510 C640,540 520,540 480,500 C440,460 440,330 480,300 Z" fill="${NAVY}" fill-opacity="0.85" stroke="${CREAM}" stroke-width="3"/>` +
    txt(600, 330, 'Cas9', 22, 1, 'middle') +
    path('M520,380 C560,350 640,350 680,380', 0.9, 3, '2 6') + txt(600, 470, 'guide RNA', 15, 0.7, 'middle') +
    `<line x1="600" y1="380" x2="600" y2="470" stroke="${EMBER}" stroke-width="3"/>` +
    callout(600, 425, 820, 230, 'cut') +
    dimH(480, 720, 620, '20-letter guide'),
};

S.cnn = {
  title: 'Convolutional neural nets',
  kind: 'article · medium',
  body: (() => {
    let b = '';
    // Input grid → stacked feature maps → smaller maps → dense → classes.
    b += rect(100, 220, 200, 200, 0.95, 2);
    for (let i = 1; i < 8; i++) b += ln(100 + i * 25, 220, 100 + i * 25, 420, 0.25, 1) + ln(100, 220 + i * 25, 300, 220 + i * 25, 0.25, 1);
    b += `<rect x="150" y="270" width="75" height="75" fill="none" stroke="${EMBER}" stroke-width="3"/>`;
    for (let k = 0; k < 4; k++) b += rect(400 + k * 18, 230 + k * 14, 150, 150, 0.85 - k * 0.15, 2, NAVY);
    b += path('M225,270 L400,230 M225,345 L400,380', 0.4, 1.5, '4 6');
    for (let k = 0; k < 6; k++) b += rect(660 + k * 14, 270 + k * 10, 90, 90, 0.85 - k * 0.1, 2, NAVY);
    for (let i = 0; i < 6; i++) b += circ(920, 230 + i * 40, 12, 0.9) + ln(830, 320, 908, 230 + i * 40, 0.25, 1);
    for (let i = 0; i < 3; i++) b += circ(1060, 280 + i * 60, 14, 0.95) + txt(1060, 286 + i * 60, String.fromCharCode(65 + i), 14, 0.9, 'middle');
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) b += ln(932, 230 + i * 40, 1046, 280 + j * 60, 0.15, 1);
    b += txt(200, 470, 'input', 15, 0.7, 'middle') + txt(500, 470, 'convolve', 15, 0.7, 'middle') + txt(740, 470, 'pool', 15, 0.7, 'middle') + txt(990, 470, 'classify', 15, 0.7, 'middle');
    b += dimH(150, 225, 520, '3 × 3');
    return b;
  })(),
};

mkdirSync('src/assets/blueprints', { recursive: true });
let no = 1;
for (const [id, s] of Object.entries(S)) {
  writeFileSync(`src/assets/blueprints/${id}.svg`, sheet({ id, no: String(no++).padStart(2, '0'), ...s }));
}
console.log(`wrote ${Object.keys(S).length} blueprints to src/assets/blueprints/`);
