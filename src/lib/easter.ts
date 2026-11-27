// The easter egg: type "sudo" anywhere (outside a text field), or the Konami code,
// and a secret terminal window opens.
import { openWindow } from './windows';

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

export function initEasterEgg(): void {
  let typed = '';
  let k = 0;
  window.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement | null;
    if (t?.closest('input, textarea, select, [contenteditable="true"]') || e.metaKey || e.ctrlKey || e.altKey) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    k = key === KONAMI[k] ? k + 1 : key === KONAMI[0] ? 1 : 0;
    typed = (typed + (e.key.length === 1 ? e.key.toLowerCase() : '')).slice(-4);
    if (k === KONAMI.length || typed === 'sudo') {
      k = 0;
      typed = '';
      openWindow('terminal');
    }
  });
}
