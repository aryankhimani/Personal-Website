// The colour scales for code that needs real hex values (canvas, WebGL, props).
// Generated data lives in src/data/palette.json (scripts/make-palette.mjs); CSS uses palette.css.
import data from '../data/palette.json';

type Scale = Record<'50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | '950', string>;

export const navy = data.scales.navy as Scale;
export const slate = data.scales.slate as Scale;
export const ember = data.scales.ember as Scale;
export const cream = data.scales.cream as Scale;
/** Desaturated extra hues, for swarm cursor name tags only. */
export const tags = data.tags as { teal: string; amber: string; violet: string; sky: string };

/** The semantic set most effects need: navy ground, cream marks, ember as the rare hot spot. */
export const C = {
  desk: navy['950'],
  desk2: navy['900'],
  line: navy['800'],
  cream: cream['100'],
  creamHi: cream['50'],
  muted: navy['300'],
  hot: ember['500'],
  hotInk: ember['700'],
} as const;
