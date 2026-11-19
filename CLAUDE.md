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
  - [x] Step 2 (Nov 18): boot v3 in `lib/boot.ts` (canvas, no library): CRT + SVG HUD rings, name from 5x7 grid cells, breakdown on scroll or by itself at 3.25 s, done ~4.3 s; tap/any key skips. Removed `BootTitle.tsx` + `ElectricLogo.tsx` (WebGL). Test: `scripts/test-boot.mjs`.
  - [x] Step 3 (Nov 18): CSS-only glass orb behind the metal AK (`HeroOrb.tsx`, `.hero-orb` in hero.css): navy glass, cream rim, ember glow, caustic rim, dust ring, pointer tilt. Hero 1 still 60 fps (also at 4x CPU). First-load JS now ~281 KB raw.
  - [x] Step 4 (Nov 18): About moved up (after the ticker). `lib/storyboard.ts`: a fixed copy of the cut-out flies from under the hero text into me.md's 3:4 slot, scrubbed by ScrollTrigger, 3D tilt mid-flight; phones fade. Photo is a placeholder: TODO(aryan) in `lib/me.ts`, make the PNG with `swift scripts/cutout.swift`. Test: `scripts/test-storyboard.mjs`. Fixed phone sideways scroll (orb dust, card swap).
  - [x] Step 5 (Nov 18): glass folders (`FolderDesk.tsx`, `.gf-*` in work.css), top 3 per folder in `FOLDERS[].top` (lib/work.ts, Aryan approved). Folder page `FolderPage.tsx` at #work/<folder>; project opened from it stacks (Esc/back return to folder). Shared grow animation `work/useGrow.ts`. Removed FolderFloat + matter-js and the Finder window. Test: `scripts/test-folders.mjs`. First-load JS ~284 KB raw / 102 KB gz (perf-hero's number swings when lazy chunks beat the load event).
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
