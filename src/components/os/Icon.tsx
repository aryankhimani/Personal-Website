// One icon set for the whole site: pixelarticons (MIT), drawn on a 24px pixel grid so it
// sits naturally next to Departure Mono. Icons inherit colour and size (1em) from text.

import check from 'pixelarticons/svg/check.svg?raw';
import chevronRight from 'pixelarticons/svg/chevron-right.svg?raw';
import info from 'pixelarticons/svg/circle-info.svg?raw';
import close from 'pixelarticons/svg/close.svg?raw';
import compass from 'pixelarticons/svg/compass.svg?raw';
import expand from 'pixelarticons/svg/expand.svg?raw';
import externalLink from 'pixelarticons/svg/external-link.svg?raw';
import fileText from 'pixelarticons/svg/file-text.svg?raw';
import folder from 'pixelarticons/svg/folder.svg?raw';
import home from 'pixelarticons/svg/home.svg?raw';
import mail from 'pixelarticons/svg/mail.svg?raw';
import minus from 'pixelarticons/svg/minus.svg?raw';
import notes from 'pixelarticons/svg/notes.svg?raw';
import shapes from 'pixelarticons/svg/shapes.svg?raw';

const ICONS = {
  check,
  'chevron-right': chevronRight,
  info,
  close,
  compass,
  expand,
  'external-link': externalLink,
  'file-text': fileText,
  folder,
  home,
  mail,
  minus,
  notes,
  shapes,
} as const;

export type IconName = keyof typeof ICONS;

// Size every icon to 1em so it scales with font-size. Some files in the set carry a fixed
// 24px size and some carry none, so drop whatever is there and set our own.
const sized = Object.fromEntries(
  Object.entries(ICONS).map(([name, svg]) => [
    name,
    svg
      .replace(/<svg([^>]*?)\s(?:width|height)="[^"]*"/g, '<svg$1')
      .replace(/<svg([^>]*?)\s(?:width|height)="[^"]*"/g, '<svg$1')
      .replace('<svg', '<svg width="1em" height="1em" focusable="false"'),
  ]),
) as Record<IconName, string>;

export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 leading-none ${className}`}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: sized[name] }}
    />
  );
}
