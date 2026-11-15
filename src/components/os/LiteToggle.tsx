import { setLite, useLite } from '../../lib/device-tier';

/** The Lite mode switch. Used in the menu bar and the mobile menu. */
export default function LiteToggle({ className = '' }: { className?: string }) {
  const lite = useLite();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={lite}
      title="Lite mode swaps animated effects for still ones"
      className={`os-switch group inline-flex items-center gap-2 ${className}`}
      onClick={() => setLite(!lite)}
    >
      <span>Lite</span>
      <span className="os-switch-track" aria-hidden="true">
        <span className="os-switch-knob" />
      </span>
    </button>
  );
}
