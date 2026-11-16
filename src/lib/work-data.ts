// Fetches the full project data (/work/index.json) once, the first time something needs it.

import { DETAIL_URL, type ProjectDetail } from './work';

let request: Promise<ProjectDetail[]> | null = null;

export function loadProjectDetails(): Promise<ProjectDetail[]> {
  request ??= fetch(DETAIL_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`${DETAIL_URL}: ${r.status}`);
      return r.json() as Promise<ProjectDetail[]>;
    })
    .catch((err) => {
      request = null; // let the next attempt retry
      throw err;
    });
  return request;
}
