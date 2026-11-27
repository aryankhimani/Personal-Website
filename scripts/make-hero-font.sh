#!/bin/sh
# Subsets Bricolage Grotesque to the glyphs of the hero name (public/fonts/hero-name.woff2,
# used by .hero-name in hero.css and preloaded in Base.astro). Keeps the weight axis.
# Needs fonttools + brotli:  python3 -m pip install fonttools brotli
set -e
cd "$(dirname "$0")/.."
pyftsubset node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2 \
  --text="Aryan Khimani" --flavor=woff2 --layout-features='kern,liga' \
  --output-file=public/fonts/hero-name.woff2
ls -la public/fonts/hero-name.woff2
