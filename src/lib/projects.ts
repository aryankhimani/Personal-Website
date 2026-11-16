// Server-only helpers over the projects collection. Used by pages and the JSON endpoint.

import { getCollection, type CollectionEntry } from 'astro:content';
import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import { formatWhen, sortKey, type Img, type IndexEntry, type ProjectDetail } from './work';

export type Project = CollectionEntry<'projects'>;

let cache: Project[] | null = null;

/** Every project, newest first. */
export async function getProjects(): Promise<Project[]> {
  cache ??= (await getCollection('projects')).sort(
    (a, b) =>
      sortKey(b.data.start, b.data.end) - sortKey(a.data.start, a.data.end) || a.data.title.localeCompare(b.data.title),
  );
  return cache;
}

export async function getFeatured(): Promise<Project[]> {
  return (await getProjects())
    .filter((p) => p.data.featured)
    .sort((a, b) => (a.data.featured ?? 0) - (b.data.featured ?? 0));
}

export function toIndexEntry(p: Project): IndexEntry {
  return {
    id: p.id,
    title: p.data.title,
    folders: [p.data.folder, ...p.data.alsoIn],
    when: formatWhen(p.data.start, p.data.end),
    featured: p.data.featured,
  };
}

async function img(src: ImageMetadata, alt: string, widths: number[]): Promise<Img> {
  const largest = Math.min(Math.max(...widths), src.width);
  const out = await getImage({ src, widths: widths.filter((w) => w <= src.width), width: largest, format: 'webp' });
  const height = Math.round((src.height / src.width) * largest);
  return { src: out.src, srcset: out.srcSet.attribute, width: largest, height, alt };
}

/** What a project window needs: optimized images and the rendered body. */
export async function toDetail(p: Project): Promise<ProjectDetail> {
  const d = p.data;
  return {
    ...toIndexEntry(p),
    role: d.role,
    summary: d.summary,
    result: d.result,
    tags: d.tags,
    cover: d.cover
      ? { ...(await img(d.cover, d.coverAlt ?? '', [480, 760, 1100])), fit: d.coverFit }
      : undefined,
    photos: await Promise.all(
      d.photos.map(async (ph) => ({ ...(await img(ph.src, ph.alt, [320, 560])), caption: ph.caption })),
    ),
    links: d.links,
    html: p.rendered?.html ?? '',
  };
}
