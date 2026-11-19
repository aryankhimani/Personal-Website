// /sitemap.xml: the home page and every project page. The 404 and old redirect URLs stay out.
import type { APIRoute } from 'astro';
import { getProjects } from '../lib/projects';

export const GET: APIRoute = async ({ site }) => {
  const origin = (site ?? new URL('https://aryankhimani.com')).origin;
  const paths = ['/', ...(await getProjects()).map((p) => `/work/${p.id}/`)];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${origin}${p}</loc></url>`).join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
