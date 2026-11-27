// Full data for every project window, fetched the first time one opens.
import type { APIRoute } from 'astro';
import { getProjects, toDetail } from '../../lib/projects';

export const GET: APIRoute = async () => {
  const details = await Promise.all((await getProjects()).map(toDetail));
  return new Response(JSON.stringify(details), { headers: { 'Content-Type': 'application/json' } });
};
