// Shared by the server (content collection, pages) and the browser (windows). No Astro imports here.

export const FOLDER_IDS = ['research', 'ventures', 'code', 'programs', 'talks'] as const;
export type FolderId = (typeof FOLDER_IDS)[number];

export const FOLDERS: { id: FolderId; note: string }[] = [
  { id: 'research', note: 'Labs and research programs' },
  { id: 'ventures', note: 'Companies I started or joined early' },
  { id: 'code', note: 'Things I built' },
  { id: 'programs', note: 'Programs, clubs and teams' },
  { id: 'talks', note: 'Talks and videos' },
];

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
  cover?: Img & { fit: 'cover' | 'contain' };
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

/** Newest first; undated things go last. */
export function sortKey(start?: string, end?: string): number {
  const num = (v: string) => {
    const [y, m] = v.split('-');
    return Number(y) + (m ? Number(m) / 100 : 0.12);
  };
  if (end === 'present') return 10000 + (start ? num(start) : 0);
  const v = end ?? start;
  return v ? num(v) : 0;
}
