// Shared by the server (content collection, pages) and the browser (windows). No Astro imports here.

export const FOLDER_IDS = ['ai-ml', 'software', 'research', 'ventures', 'leadership'] as const;
export type FolderId = (typeof FOLDER_IDS)[number];

/** `top`: the picks shown clearly in front of each folder, newest first. */
export const FOLDERS: { id: FolderId; note: string; top: string[] }[] = [
  { id: 'ai-ml', note: 'Models I trained and shipped', top: ['truthlens', 'okamoto-lab', 'cnn-blood-cells'] },
  { id: 'software', note: 'Apps, extensions and games', top: ['truthlens', 'prevent-project', 'nyas'] },
  { id: 'research', note: 'Labs and research programs', top: ['okamoto-lab', 'prevent-project', 'youreka'] },
  { id: 'ventures', note: 'Companies I started or joined early', top: ['craftnova', 'joeyhelps', 'jobby'] },
  { id: 'leadership', note: 'Teams, talks and programs', top: ['western-founders-network', 'teded', 'school-clubs'] },
];

/** Old folder names (before Nov 2026), so shared links like #work/code keep working. */
export const FOLDER_ALIASES: Record<string, FolderId> = { code: 'software', programs: 'leadership', talks: 'leadership' };

/** A folder's projects with its top picks first (the papers on the desk), the rest in their usual order. */
export function topFirst<T extends { id: string }>(folder: FolderId, items: T[]): T[] {
  const top = FOLDERS.find((f) => f.id === folder)?.top ?? [];
  const rank = (id: string) => (top.includes(id) ? top.indexOf(id) : top.length);
  return items.map((p, i) => ({ p, i })).sort((a, b) => rank(a.p.id) - rank(b.p.id) || a.i - b.i).map(({ p }) => p);
}

export const isFolderId = (id: string): id is FolderId => (FOLDER_IDS as readonly string[]).includes(id);

/** The tiny index every page carries, so windows and menus know what exists before any fetch. */
export type IndexEntry = {
  id: string;
  title: string;
  folders: FolderId[];
  when: string;
  featured?: number;
};

export type Img = { src: string; srcset: string; width: number; height: number; alt: string };

/** Everything a project window shows. Served from /work/index.json. */
export type ProjectDetail = IndexEntry & {
  role?: string;
  summary: string;
  result?: string;
  tags: string[];
  cover?: Img & { fit: 'cover' | 'contain'; blueprint?: boolean };
  clip?: string;
  photos: (Img & { caption?: string })[];
  links: { label: string; href: string }[];
  html: string;
};

export const INDEX_ELEMENT_ID = 'os-work-index';
export const DETAIL_URL = '/work/index.json';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parts(value: string): [string, string | null] {
  const [year, month] = value.split('-');
  return [year, month ? MONTHS[Number(month) - 1] : null];
}

/** '2024-07' + '2024-08' -> 'Jul – Aug 2024'; '2025-09' + 'present' -> 'Sep 2025 – now'. */
export function formatWhen(start?: string, end?: string): string {
  if (!start) return '';
  const [sy, sm] = parts(start);
  const from = sm ? `${sm} ${sy}` : sy;
  if (!end) return from;
  if (end === 'present') return `${from} – now`;
  const [ey, em] = parts(end);
  if (sy === ey) return sm && em ? `${sm} – ${em} ${ey}` : sy;
  return `${from} – ${em ? `${em} ${ey}` : ey}`;
}

/** Newest first, by the year it ended, then by when it started; undated things go last. */
export function sortKey(start?: string, end?: string): number {
  const num = (v: string) => {
    const [y, m] = v.split('-');
    return Number(y) + (m ? Number(m) / 100 : 0);
  };
  const from = start ? num(start) : 0;
  if (end === 'present') return 1e8 + from;
  const last = end ?? start;
  return last ? Number(last.slice(0, 4)) * 10000 + from : 0;
}
