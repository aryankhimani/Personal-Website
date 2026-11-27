// The scroll journey as one system (homepage only): the Signal line, channel changes, the
// HUD tracker, arrival lock-ons and the channel click, all driven by the sector bus.
// Loaded on idle from Base.astro, so none of it is in the first-load JavaScript.

import { onSector } from './bus';
import { initArrive } from './arrive';
import { initChannel } from './channel';
import { initHud } from './hud';
import { initSignalLine } from './line';
import { sound } from '../sound';

export function initSignal(): void {
  if (!document.getElementById('home') || !document.getElementById('writing')) return;
  initSignalLine();
  initHud();
  initArrive();
  onSector(({ index, prev }) => index !== prev && sound.channel());
  // Hero hum: only while the hero is on screen (and only if sound is on).
  const hero = document.getElementById('home')!;
  new IntersectionObserver(([e]) => sound.hum(e.isIntersecting), { threshold: 0.2 }).observe(hero);
  initChannel(); // last: its first frame announces the starting sector to everything above
}
