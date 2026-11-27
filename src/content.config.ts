import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { FOLDER_IDS } from './lib/work';

// A month ('2024-07') or just a year ('2022'). Quoted in the YAML so it stays a string.
const when = z.string().regex(/^\d{4}(-\d{2})?$/);

const projects = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      /** The desktop folder it lives in. */
      folder: z.enum(FOLDER_IDS),
      /** Other folders it also shows up in. */
      alsoIn: z.array(z.enum(FOLDER_IDS)).default([]),
      start: when.optional(),
      end: z.union([when, z.literal('present')]).optional(),
      /** Shown instead of the computed dates, e.g. 'Summer 2023'. */
      whenLabel: z.string().optional(),
      role: z.string().optional(),
      /** The browser-tab and search title of its page, without the name. */
      seoTitle: z.string(),
      /** One line that stands alone: what I built. Also the page's search description. */
      summary: z.string(),
      /** One real result, if there is one. */
      result: z.string().optional(),
      tags: z.array(z.string()).default([]),
      /** Position in the featured strip (1 to 4). */
      featured: z.number().int().min(1).max(4).optional(),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      /** 'contain' for logos and documents, so they aren't cropped. */
      coverFit: z.enum(['cover', 'contain']).default('cover'),
      /** A short silent clip under /public (click to play). The cover is its poster. */
      clip: z.string().startsWith('/').optional(),
      photos: z.array(z.object({ src: image(), alt: z.string(), caption: z.string().optional() })).default([]),
      links: z.array(z.object({ label: z.string(), href: z.string().url() })).default([]),
    }),
});

export const collections = { projects };
