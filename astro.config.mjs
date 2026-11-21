// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// Old template URLs -> new project pages. The /work/<slug>/ pages arrive in Phase 3.
const legacyRedirects = {
  '/TKS/': '/work/tks/',
  '/SHAD/': '/work/shad/',
  '/JoeyHelps/': '/work/joeyhelps/',
  '/Youreka/': '/work/youreka/',
  '/NYAS/': '/work/nyas/',
  '/SchoolClubs/': '/work/school-clubs/',
  '/TEDEd/': '/work/teded/',
  '/PREVENT-Project/': '/work/prevent-project/',
  '/SickKidsMentorship/': '/work/sickkids-mentorship/',
  '/Dr.Okamoto-lab/': '/work/okamoto-lab/',
  '/CraftNova.html': '/work/craftnova/',
  '/iGEM.html': '/work/igem/',
  '/illume.html': '/work/illume/',
};

// client:calm (src/directives/calm.ts): hydrate near the screen, but only once scrolling pauses.
const calmDirective = {
  name: 'client-calm',
  hooks: {
    'astro:config:setup': ({ addClientDirective }) => {
      addClientDirective({ name: 'calm', entrypoint: './src/directives/calm.ts' });
    },
  },
};

// https://astro.build/config
export default defineConfig({
  site: 'https://aryankhimani.com',
  integrations: [react(), calmDirective],
  // The dev toolbar's Audit app outlines elements in red on every page in dev; it isn't part of
  // the site, and it made dev look broken (red boxes on alt text, file names, counters).
  devToolbar: { enabled: false },
  redirects: legacyRedirects,
  // Only our own SVGs go through astro:assets (src/assets/blueprints, made by
  // scripts/make-blueprints.mjs), so rasterizing them to WebP/AVIF is safe.
  image: { dangerouslyProcessSVG: true },
  vite: {
    plugins: [tailwindcss()],
  },
});
