// Stand-in for @hugeicons used by a few React Bits components: draws the site's own
// pixelarticons instead, so no second icon library ships.
import { Icon, type IconName } from '../os/Icon';

export const Tick02Icon: IconName = 'check';
export const Alert02Icon: IconName = 'info';
export const Loading03Icon: IconName = 'reload';
export const RefreshIcon: IconName = 'reload';
export const ArrowDown01Icon: IconName = 'chevron-right';
export const SparklesIcon: IconName = 'shapes';
export const BeachIcon: IconName = 'shapes';
export const BridgeIcon: IconName = 'shapes';
export const CloudIcon: IconName = 'shapes';
export const SunsetIcon: IconName = 'shapes';

export function HugeiconsIcon({
  icon,
  size = '1em',
  className,
}: {
  icon: IconName;
  size?: number | string;
  strokeWidth?: number;
  className?: string;
}) {
  const s = typeof size === 'number' ? `${size}px` : size;
  return (
    <span className={className} style={{ display: 'inline-grid', width: s, height: s, fontSize: s, lineHeight: 1 }}>
      <Icon name={icon} />
    </span>
  );
}
