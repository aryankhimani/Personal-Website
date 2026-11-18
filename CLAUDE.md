# Aryan OS (aryankhimani.com rebuild): read this first

Claude reads this file at the start of every session, so a fresh chat knows where things stand.
Aryan's usage is limited: keep sessions small, read only what a task needs, and keep messages to him short (3-5 bullets).

## Where things stand (update this at the end of every phase)
- Branch: `upgrade_01` only. Never commit to or push `main` (GitHub Pages serves it) until Aryan says "launch it".
- Done: Phases 0-5, and Phase 5B steps 1-9 (colour system, boot v2, ASCII field, glass lens, liquid metal, project reader, React Bits/Bencho components, ~/rebuild swarm, CRT toggle, secret terminal, 404 dialog). `git log --oneline | head -20` has the details.
- Fixed Nov 16: `npm run dev` crashed on a React type import in `src/components/rb/SplitFlapText.tsx` (now `import { type CSSProperties, type HTMLAttributes, ... }`).
- Phase 6 step 1 done (Nov 18): heroes 4 Astral (`AstralField.tsx`, star globe) and 5 Orbits (`OrbitSystem.tsx`, spiral galaxy), canvas 2D via `hero/canvas-loop.ts`, stills in `public/hero/`. Switcher now 1/5.
- Next (Phase 6, one per session): hero 6 (propose 2 21st.dev pop-up heroes to Aryan first), then copy pass, a11y pass, perf pass (first-load JS ~191 KB vs 150 KB budget), Unslop audit, OG/sitemap/favicon, remove `/colour` route. Then Phase 7 launch.
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
