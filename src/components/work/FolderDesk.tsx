// ~/work's five folders, as React Bits' Folder Float: hover (or tap) a folder and its
// projects float up out of it as papers. Picking a paper opens that project in the reader.
// Under each folder, a plain link opens it as a Finder window (and works without JS).
import { useLite } from '../../lib/device-tier';
import { cream, navy } from '../../lib/palette';
import { openWindow } from '../../lib/windows';
import FolderFloat from '../rb/FolderFloat';

type Folder = { id: string; note: string; items: { label: string; value: string }[] };

export default function FolderDesk({ folders }: { folders: Folder[] }) {
  const lite = useLite();
  return (
    <ul className="folders folders-float">
      {folders.map((f) => (
        <li key={f.id} className="folder-cell" data-folder={f.id}>
          <FolderFloat
            className="folder-float-host"
            items={f.items}
            label={`${f.id}/`}
            sublabel={`${f.items.length} files`}
            trigger="hover"
            physics={!lite}
            drift={lite ? 0 : 0.6}
            closeOnSelect
            onSelect={(value) => openWindow(value, document.querySelector<HTMLElement>(`[data-folder="${f.id}"]`))}
            folderColor={navy['700']}
            frontColor={navy['600']}
            paperColor={cream['200']}
            itemColor={cream['100']}
            itemTextColor={navy['950']}
            labelColor={cream['50']}
            width={150}
            height={112}
            spread={Math.min(1.2, 0.6 + f.items.length * 0.08)}
          />
          <a href={`#${f.id}`} data-open-window={f.id} className="folder-open" aria-haspopup="dialog">
            Open {f.id}/
          </a>
          <span className="folder-open-note">{f.note}</span>
        </li>
      ))}
    </ul>
  );
}
