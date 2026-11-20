// now.txt / resume.pdf / honours.txt as glass hologram cards orbiting a plasma core
// (About.astro, CSS .holo-* in sections.css). The cards ride a tilted ellipse: each frame
// sets one transform per card (perspective + translate3d) and a depth for its glow, so
// there's no preserve-3d and the frosted glass keeps working.
//   - hover or keyboard focus pauses the orbit
//   - click / Enter brings a card to the front, enlarged and readable; Esc or a click
//     away sends it back
//   - phones: a smaller core above a swipeable row of cards (CSS, no orbit)
//   - Lite and reduced motion: the cards sit still around the core
// It only runs while the section is on screen.

const TURN = 42000; // ms per orbit

export function initHolo(): void {
  const found = document.querySelector<HTMLElement>('[data-holo]');
  if (!found) return;
  const root: HTMLElement = found;
  const items = [...root.querySelectorAll<HTMLElement>('[data-holo-item]')];
  const buttons = items.map((li) => li.querySelector<HTMLButtonElement>('.holo-btn')!);
  const wide = window.matchMedia('(min-width: 768px)');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const still = () => document.documentElement.dataset.lite === 'true' || reduce.matches;

  let angle = Math.PI / 2; // card 0 starts at the front
  let rx = 0;
  let ry = 0;
  let rz = 0;
  let hover = false;
  let focus = false;
  let active = -1;
  let seen = false;
  let raf = 0;
  let last = 0;
  let animT = 0;

  const orbit = () => wide.matches;

  const place = () => {
    items.forEach((li, i) => {
      if (i === active) {
        li.style.transform = 'translate(-50%, -50%) perspective(1400px) translate3d(0, 0, 60px)';
        li.style.zIndex = '20';
        li.style.setProperty('--depth', '1');
        return;
      }
      const th = angle + (i * Math.PI * 2) / items.length;
      const s = Math.sin(th);
      const x = rx * Math.cos(th);
      const y = ry * s;
      const z = rz * s;
      li.style.transform = `translate(-50%, -50%) perspective(1400px) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px)`;
      li.style.zIndex = String(s > 0 ? 6 + Math.round(s * 4) : 1 + Math.round((s + 1) * 2));
      li.style.setProperty('--depth', ((s + 1) / 2).toFixed(3));
    });
  };

  const layout = () => {
    root.dataset.mode = orbit() ? 'orbit' : 'stack';
    if (!orbit()) {
      items.forEach((li) => {
        li.style.transform = '';
        li.style.zIndex = '';
        li.style.removeProperty('--depth');
      });
      buttons.forEach((b) => b.removeAttribute('aria-expanded'));
      if (active >= 0) setActive(-1, false);
      return;
    }
    buttons.forEach((b, i) => b.setAttribute('aria-expanded', String(i === active)));
    const w = root.clientWidth;
    rx = Math.min(w * 0.34, 360);
    ry = rx * 0.42;
    rz = rx * 0.7;
    place();
    run();
  };

  const frame = (t: number) => {
    raf = 0;
    if (!canRun()) return;
    const dt = Math.min(50, t - (last || t));
    last = t;
    angle += (dt / TURN) * Math.PI * 2;
    place();
    raf = requestAnimationFrame(frame);
  };

  const canRun = () => orbit() && seen && !hover && !focus && active < 0 && !still() && !document.hidden;
  function run() {
    if (raf || !canRun()) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  }

  // Smooth glide to and from the front: transitions only while a card is moving there.
  const glide = () => {
    if (still()) return;
    root.dataset.anim = '';
    window.clearTimeout(animT);
    animT = window.setTimeout(() => {
      delete root.dataset.anim;
      run();
    }, 600);
  };

  function setActive(i: number, moveFocus = true) {
    if (!orbit()) return;
    const prev = active;
    active = i;
    root.toggleAttribute('data-active', i >= 0);
    items.forEach((li, k) => li.classList.toggle('is-front', k === i));
    buttons.forEach((b, k) => b.setAttribute('aria-expanded', String(k === i)));
    glide();
    place();
    if (i < 0 && prev >= 0 && moveFocus) buttons[prev].focus({ preventScroll: true });
    run();
  }

  items.forEach((li, i) => {
    li.addEventListener('pointerenter', () => ((hover = true), cancelAnimationFrame(raf), (raf = 0)));
    li.addEventListener('pointerleave', () => ((hover = false), run()));
    li.addEventListener('click', (e) => {
      if (!orbit()) {
        if ((e.target as Element).closest('.holo-btn')) li.scrollIntoView({ behavior: still() ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
        return;
      }
      if ((e.target as Element).closest('a')) return;
      if ((e.target as Element).closest('.holo-btn')) setActive(active === i ? -1 : i, false);
      else if (active !== i) setActive(i, false);
    });
  });

  root.addEventListener('focusin', () => {
    focus = true;
    cancelAnimationFrame(raf);
    raf = 0;
  });
  root.addEventListener('focusout', (e) => {
    if (root.contains(e.relatedTarget as Node)) return;
    focus = false;
    if (active >= 0) setActive(-1, false);
    run();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && active >= 0) {
      e.stopPropagation();
      setActive(-1);
    }
  });
  document.addEventListener('pointerdown', (e) => {
    if (active >= 0 && !items[active].contains(e.target as Node)) setActive(-1, false);
  });

  new IntersectionObserver(([e]) => {
    seen = e.isIntersecting;
    if (seen) run();
  }).observe(root);
  document.addEventListener('visibilitychange', run);
  wide.addEventListener('change', layout);
  reduce.addEventListener('change', layout);
  let rt = 0;
  new ResizeObserver(() => {
    window.clearTimeout(rt);
    rt = window.setTimeout(layout, 120);
  }).observe(root);
  layout();
}
