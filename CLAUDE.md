# Aryan OS (aryankhimani.com rebuild): read this first

Claude reads this file at the start of every session, so a fresh chat knows where things stand.
Aryan's usage is limited: keep sessions small, read only what a task needs, and keep messages to him short (3-5 bullets).

## Where things stand (update this at the end of every phase)
- Branch: `upgrade_01` only. Never commit to or push `main` (GitHub Pages serves it) until Aryan says "launch it".
- Done: Phases 0-5, and Phase 5B steps 1-9 (colour system, boot v2, ASCII field, glass lens, liquid metal, project reader, React Bits/Bencho components, ~/rebuild swarm, CRT toggle, secret terminal, 404 dialog). `git log --oneline | head -20` has the details.
- Fixed Nov 16: `npm run dev` crashed on a React type import in `src/components/rb/SplitFlapText.tsx` (now `import { type CSSProperties, type HTMLAttributes, ... }`).
- Phase 6 step 1 done (Nov 18): heroes 4 Astral (`AstralField.tsx`, star globe) and 5 Orbits (`OrbitSystem.tsx`, spiral galaxy), canvas 2D via `hero/canvas-loop.ts`, stills in `public/hero/`. Switcher now 1/5.
- Phase 6 (final) plan: `_private/phase6-plan.md` (replaces the old hero-6 plan; hero 6 skipped). One step per session; read only that step. "continue Phase 6" = do the first unchecked step.
  - [x] Step 1 (Nov 18): hero DPR cap 1.5, ASCII field ~30 fps, batched Astral drawing, heading letters only layered while moving; lens only on hero 1; arcs + HUD (`hud.ts`, `HeroHud.tsx`); HUD moved clear of desktop icons on phones; tagline + clock fixed. Perf at 4x CPU: ASCII hover 39 -> 60 fps, rest already 60. First-load JS still ~285 KB raw (Step 8). Tools: `scripts/perf-hero.mjs`, `perf-scroll.mjs`, `perf-profile.mjs`. Stop old dev/preview servers before testing.
  - [ ] Step 2: opening v3, CRT/HUD terminal boot then anime.js-style grid-cell breakdown of the name (≤5 s, skippable)
  - [ ] Step 3: motion.dev-style orb behind the liquid-metal AK (one canvas or CSS fake)
  - [ ] Step 4: storyboard scroll, Aryan's photo travels from hero to About (GSAP Flip; phones = fade)
  - [ ] Step 5: liquid-glass folders in one row, top 3 in front + rest blurred, folder expands to #work/<folder> page
  - [ ] Step 6: header v2 (AK logo not red dot, refined type, glass bar), remove mouse-reactive red tab, dock auto-hide
  - [ ] Step 7: footer, Aryan stands still while pixel walkers pass; contact + "Let's build something." above
  - [ ] Step 8: polish (copy, colour, a11y, perf ≤150 KB / Lighthouse ≥90, Unslop, remove /colour, OG/sitemap/robots/favicon, final walkthrough)
  - Also from Nov 18 notes: hero composition (drop floating desktop icons), tighten navy gap between Work and Journey.
- Open TODO(aryan) items: grep -rn "TODO(aryan)" src

## The full plan
`_private/aryan-os-build-prompt.md` (long). Don't read it all. Open only the Part you need:
Part 3 design system, Part 5 sections, Part 6 React Bits list, Part 7 wording, Part 8 perf budget, Part 9 a11y, Part 10 "not AI-made" checklist, Part 12 phase table.
Example: `grep -n "^## PART" _private/aryan-os-build-prompt.md`, then read just that range.

## Rules to save usage
- Don't open or search: `node_modules/`, `dist/`, `.astro/`, `_legacy/`, `.scratch/`, old images in `.shots/`, `package-lock.json`. Use `rg`/`grep` to find code before opening files, and read line ranges, not whole big files.
- Screenshots are expensive. Take them only at a checkpoint, at most 2 (desktop 1440x900 + mobile 390x844), and only for the sections that changed. Prefer the test scripts in `scripts/` (test-*.mjs) and console-error checks over looking at images.
- Test with BOTH `npm run dev` and `npm run build && npm run preview`. Dev mode catches errors preview hides.
- React type imports must use `type` (`import { type CSSProperties } from 'react'`), or dev mode crashes.
- One step per session: finish it, build, commit, push, update "Where things stand" above, then tell Aryan to type `/clear` before the next one.
- Small fixes (copy edits, one CSS tweak, one bug) don't need the biggest model; Aryan can switch to Sonnet for those.
- Credits for anything copied go in `CREDITS.md`. Never invent facts about Aryan; use `TODO(aryan): ...`.
