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
  - [x] Step 6 (Nov 18): header v2: chrome AK mark with hover shine (`Brand` in MenuBar.tsx), "Aryan OS" in Bricolage, small-caps mono menus, hairline under the glass bar (`.os-bar`, `.os-brand*` in os.css). The red "Open my work" button (changed colour under the cursor lens) is now a glass button with an ember edge and a light that follows the cursor inside it only; the lens fully steps away over links/buttons. Dock auto-hides on scroll down, returns on scroll up / mouse near bottom / focus / page end. Clock `<p>` -> `<div>` (dev hydration warning). Test: `scripts/test-header.mjs`.
  - [x] Step 7 (Nov 18): footer `Footer.astro` + `FooterCrowd.tsx`: "Let's build something." + 4 contact links, then a canvas strip where a pixel Aryan (ember top, spotlight, [aryan] HUD label) stands still while pixel people walk past on 5 depth lanes with time-lapse ghosts; some carry project tags; people in front fade as they pass him. Uses `useCanvasScene(make, { still })` (new option; Lite = one still frame). TODO(aryan) there: could swap the sprite for a pixelated cut-out photo. Test: `scripts/test-footer.mjs`.
  - Step 8 polish, split into sub-steps (one per session):
    - [x] 8a (Nov 18): removed /colour page + public/colour-board; OG/Twitter tags + canonical + theme-color in Base.astro; `public/og.jpg` (hero shot) + icons from `scripts/make-icons-og.mjs` (needs preview running); favicon recoloured to navy-950/cream; `src/pages/sitemap.xml.ts`; `public/robots.txt`.
    - [x] 8b (Nov 18): first-load JS 94 KB gz (113 with idle islands). Liquid metal now feeds Paper's shader a pre-processed texture (`public/hero/logo-metal.webp`, made by `scripts/make-metal-texture.mjs`; rerun if logo.svg changes), so phones skip a ~320 ms task: TBT 533 -> 89 ms at 4x CPU + slow 4G, LCP 1.0 s, CLS 0.009, 539 KB total. ~/rebuild swarm tweens and the ticker split-flap now pause off-screen; About photos lazy. Scroll 59.7 fps. Lighthouse itself couldn't be downloaded (blocked), so `scripts/perf-mobile.mjs` measures the same metrics; `scripts/perf-offscreen.mjs` lists loops still running per section.
    - 8b-fixes (Aryan's feedback after testing, Nov 19). Do these BEFORE 8c, one group per session, one commit per group. Change nothing he didn't mention.
      - [x] Group 1 (Nov 19): opening + removals. Boot v4 (`lib/boot.ts`): grid-cell name gone; old split-flap "ARYAN OS" title back (`BootTitle.tsx` island) inside the v3 CRT/HUD, scan line, CRT click-off at 3.4 s; scroll enters early (rest of the trackpad gesture is swallowed so you land on the hero). Removed storyboard (flying photo), me.md photo slot, photos.zip (CardSwap), folding resume bill (Bencho); plain "Open resume.pdf" button stays. me.md is bio+honours left, skills right on wide screens. Badge uses `public/me/badge.png` if it exists (TODO(aryan): drop it in; it wasn't in the repo), else the SHAD photo.
      - [x] Group 2 (Nov 19): transitions. Journey photos now scan in (cream beam wipes top to bottom, scanlines fade; `--dot` scrubbed in journey.ts, CSS in journey.css), Aryan picked this over a signal-decode option. Reader: DitherVeil (B&W->colour hover) removed and its files deleted; cover gets a one-time CSS scan-in on open (`reader-scan-*` in work.css; off in Lite/reduced motion).
      - [x] Group 3 (Nov 19): playground. One playground.fig window with a "normal pace" (default, four-cursor card build) / "hyper speed" (swarm rebuild, Rebuild.astro now frameless inside it) toggle in the title bar (`[data-pace]` script in Playground.astro, `.fig-pace` in sections.css). Toys moved to their own `#toys` section after Writing (`ToysSection.astro`). test-sections covers both.
      - [x] Group 4 (Nov 19, Aryan approved the screenshots): footer is now a CRT tube like the boot (scanlines, vignette, roll band, HUD rings that fade before the street, AK/OS · CONTACT + LIVE readouts, blinking caret, bracket HUD buttons). Pixel street (`FooterCrowd.tsx`): one 3px art pixel everywhere, whole-number pixel ratio (`pixel: true` option on `useCanvasScene`), positions snapped to device pixels, no ghosts/gradients; 8x16 walkers with a 4-frame cycle in navy-to-cream tones by depth, pre-drawn pixel skyline + blinking ember beacon, Aryan 10x19 in an ember hoodie with blink + ember HUD corners.
      - [x] Group 5 (Nov 19): heroes 4 + 5. `canvas-loop.ts` Pointer now has `mx/my` (real pointer px, read each frame, no easing) and `on` (eased 0..1 strength); `x/y` stay eased for tilt/parallax only. Reticle crosshair, Astral hover light and Orbits lens sit exactly on the cursor; only lock brackets glide. Astral: 340 stars, 520-star 3-layer parallax sky, signal trails (pre-drawn glow sprite), rare shooting star. Orbits: 5600 stars + 900 arm dust (phone 2600 + 400), presorted colour buckets, parallax sky. Both 60 fps hovering at 4x CPU; Lite stills regenerated.
    - FINAL PUSH (Nov 20, Aryan's one-session brief: all groups in order, commit + push + tick after each, no check-ins; questions become TODO(aryan) in the final summary). "continue" = first unchecked group.
      - [x] G1 me.md compact card (photo shad/IMG_3240, 3 lines, tags) + now.txt/resume.pdf/honours.txt file cards with CRT power-on (`[data-crt-in]`, motion.ts + global.css). Lanyard/ThoughtLine/AboutDesk deleted.
      - [x] G2 project reader typography (TL;DR, headings, pull-quote) + an image per project (own photos, else blueprint SVG)
      - [x] G3 writing cards: image per article (own header, else blueprint SVG)
      - [ ] G4 journey photos: CRT power-on + HUD brackets/readout, slower, scroll-tied
      - [ ] G5 playground: one coloured .fig, faster cursors, normal/hyper toggle
      - [ ] G6 page order: Writing, Let's build something, new_message.eml, toys, footer strip
      - [ ] G7 Signal line, channel-change transitions, HUD tracker, sound, ⌘K palette, arrival lock-ons, ending + uptime
      - [ ] G8 verify old 8b-fixes all done
      - [ ] G9 = 8c-8f below
    - [ ] 8c: accessibility (keyboard, focus rings, reduced motion, Lite, alt text, contrast table)
    - [ ] 8d: copy + colour pass (short/specific wording, list open TODO(aryan); no stray greys, accent ≤10%)
    - [ ] 8e: Unslop anti-AI audit (https://github.com/heydamir/unslop), fix what it flags
    - [ ] 8f: hero composition (drop floating desktop icons), tighten navy gap Work→Journey, 404 dialog check, final walkthrough desktop + phone, no console errors. Then set this file to "Phase 6 done. Only Phase 7 (launch) is left. It happens only when Aryan says 'launch it'."
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
