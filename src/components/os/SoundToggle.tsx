// The speaker in the menu bar: turns the sound layer on or off (lib/sound.ts). Off by default,
// remembered. A pixel speaker drawn on the same 24px grid as the pixelarticons set.
import { useSyncExternalStore } from 'react';
import { onSoundChange, setSound, soundOn } from '../../lib/sound';

export function useSound(): boolean {
  return useSyncExternalStore(onSoundChange, soundOn, () => false);
}

export default function SoundToggle({ withLabel = false, className = '' }: { withLabel?: boolean; className?: string }) {
  const on = useSound();
  return (
    <button
      type="button"
      className={`os-sound ${className}`}
      aria-pressed={on}
      aria-label="Sound"
      title={on ? 'Sound on' : 'Sound off'}
      onClick={() => setSound(!on)}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
        <path d="M11 4h2v16h-2v-2H9v-2H7v-2H3v-4h4V8h2V6h2z" />
        {on ? (
          <path d="M15 9h2v6h-2zM17 7h2v2h-2zM17 15h2v2h-2zM19 9h2v6h-2z" />
        ) : (
          <path d="M15 9h2v2h-2zM19 9h2v2h-2zM17 11h2v2h-2zM15 13h2v2h-2zM19 13h2v2h-2z" />
        )}
      </svg>
      {withLabel && <span>Sound {on ? 'on' : 'off'}</span>}
    </button>
  );
}
