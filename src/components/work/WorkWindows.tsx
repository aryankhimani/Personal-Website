// Window contents for ~/work: a Finder list per folder, and one window per project.

import { useEffect, useState } from 'react';
import { loadProjectDetails } from '../../lib/work-data';
import { FOLDERS, isFolderId, type FolderId, type ProjectDetail } from '../../lib/work';
import { Icon } from '../os/Icon';
import { WORK_INDEX, workEntry } from '../os/window-list';

export default function WorkWindow({ id }: { id: string }) {
  return isFolderId(id) ? <Finder folder={id} /> : <ProjectWindow id={id} />;
}

function Finder({ folder }: { folder: FolderId }) {
  const items = WORK_INDEX.filter((p) => p.folders.includes(folder));
  const note = FOLDERS.find((f) => f.id === folder)?.note;
  // Warm the project data while the visitor reads the list.
  useEffect(() => void loadProjectDetails().catch(() => {}), []);

  return (
    <div className="finder">
      <div className="finder-bar">
        <span className="finder-path">
          ~/work/<strong>{folder}</strong>
        </span>
        <span>
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>
      {note && <p className="finder-note">{note}</p>}
      <table className="finder-list">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">When</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id}>
              <td>
                <a href={`/work/${p.id}/`} data-open-window={p.id} className="finder-row">
                  <Icon name="file-text" className="finder-icon" />
                  <span className="finder-file">{p.id}.md</span>
                  <span className="finder-title">{p.title}</span>
                </a>
              </td>
              <td className="finder-when">{p.when || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Loaded = { detail?: ProjectDetail; failed?: boolean };

function useDetail(id: string): Loaded {
  const [state, setState] = useState<Loaded>({});
  useEffect(() => {
    let alive = true;
    loadProjectDetails()
      .then((all) => alive && setState({ detail: all.find((p) => p.id === id), failed: !all.some((p) => p.id === id) }))
      .catch(() => alive && setState({ failed: true }));
    return () => {
      alive = false;
    };
  }, [id]);
  return state;
}

/** The window's own h2 is the file name, so the article's headings start one level down. */
const demoteHeadings = (html: string) => html.replace(/<(\/?)h2\b/g, '<$1h4');

function ProjectWindow({ id }: { id: string }) {
  const entry = workEntry(id);
  const { detail, failed } = useDetail(id);
  const page = `/work/${id}/`;

  if (failed) {
    return (
      <div className="os-prose">
        <p>
          This window couldn&rsquo;t load. <a href={page}>Open the full page</a> instead.
        </p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="pw-loading" role="status">
        <span>loading {entry?.title ?? id}</span>
        <span className="pw-loading-dots" aria-hidden="true" />
      </div>
    );
  }

  const d = detail;
  return (
    <article className="pw">
      {d.cover && (
        <div className={`pw-cover pw-cover-${d.cover.fit}`}>
          <img
            src={d.cover.src}
            srcSet={d.cover.srcset}
            sizes="(max-width: 767px) 100vw, 720px"
            width={d.cover.width}
            height={d.cover.height}
            alt={d.cover.alt}
            decoding="async"
          />
        </div>
      )}
      <div className="pw-body">
        <p className="pw-meta">
          <span className="work-folder">{d.folders[0]}/</span>
          {d.when && <time>{d.when}</time>}
        </p>
        <h3 className="pw-title">{d.title}</h3>
        <p className="pw-summary">{d.summary}</p>

        {(d.role || d.result) && (
          <dl className="work-facts">
            {d.role && (
              <div>
                <dt>role</dt>
                <dd>{d.role}</dd>
              </div>
            )}
            {d.result && (
              <div>
                <dt>result</dt>
                <dd>{d.result}</dd>
              </div>
            )}
          </dl>
        )}

        <div className="os-prose work-prose" dangerouslySetInnerHTML={{ __html: demoteHeadings(d.html) }} />

        {d.photos.length > 0 && (
          <section aria-label="Photos" className="pw-photos">
            <ul>
              {d.photos.map((ph) => (
                <li key={ph.src}>
                  <figure>
                    <img
                      src={ph.src}
                      srcSet={ph.srcset}
                      sizes="280px"
                      width={ph.width}
                      height={ph.height}
                      alt={ph.alt}
                      loading="lazy"
                      decoding="async"
                    />
                    {ph.caption && <figcaption>{ph.caption}</figcaption>}
                  </figure>
                </li>
              ))}
            </ul>
          </section>
        )}

        {d.links.length > 0 && (
          <section aria-label="Links" className="work-links">
            <h4>Links</h4>
            <ul>
              {d.links.map((l) => (
                <li key={l.href}>
                  <a href={l.href} target="_blank" rel="noopener noreferrer">
                    {l.label}
                    <Icon name="external-link" className="text-sm" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <a href={page} className="pw-full">
          Open the full page
        </a>
      </div>
    </article>
  );
}
