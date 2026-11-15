import { openWindow } from '../../lib/windows';
import { Icon } from './Icon';
import { windowMeta } from './window-list';

/** A file on the desk. One click opens its window. */
export default function DesktopIcon({ id }: { id: string }) {
  const meta = windowMeta(id);
  if (!meta) return null;
  return (
    <button
      type="button"
      className="os-desktop-icon group flex w-28 flex-col items-center gap-2 rounded-md p-2 text-center"
      aria-haspopup="dialog"
      onClick={(e) => openWindow(id, e.currentTarget)}
    >
      <span className="os-file-tile">
        <Icon name={meta.icon} className="text-[28px]" />
      </span>
      <span className="text-xs leading-tight break-all text-chrome-3 group-hover:text-chrome-4">{meta.file}</span>
    </button>
  );
}
