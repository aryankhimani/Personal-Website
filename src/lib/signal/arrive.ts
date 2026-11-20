// Arrival moments: when a sector arrives, its title gets a short HUD lock-on (four corner
// brackets snap in around it, then fade) and its ~/path label decodes again with Tech Text
// (TechLabel listens for 'aryan-os:decode'). Off in Lite and reduced motion.

import { SECTORS, onSector, still } from './bus';

const TITLE = '.section-heading, .work-heading, .journey-heading, .me-heading, .foot-title';

export function initArrive(): () => void {
  return onSector(({ index, prev }) => {
    if (still() || index === prev) return;
    const id = SECTORS[index].id === 'contact' ? 'build' : SECTORS[index].id;
    const section = document.getElementById(id);
    const title = section?.querySelector<HTMLElement>(TITLE);
    window.dispatchEvent(new CustomEvent('aryan-os:decode', { detail: SECTORS[index].id === 'about' ? 'about' : id }));
    if (!title) return;
    let box = title.querySelector<HTMLElement>(':scope > .lock-box');
    if (!box) {
      box = document.createElement('span');
      box.className = 'lock-box';
      box.setAttribute('aria-hidden', 'true');
      box.innerHTML = '<i></i><i></i><i></i><i></i>';
      title.classList.add('lock-host');
      title.append(box);
    }
    box.classList.remove('on');
    void box.offsetWidth;
    box.classList.add('on');
  });
}
