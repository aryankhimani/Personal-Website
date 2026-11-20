// A quiet sound layer, OFF by default. Every sound is synthesised here with the Web Audio API
// (no audio files, nothing copyrighted, 0 KB of downloads). The speaker toggle in the menu
// bar turns it on; the choice is remembered. Nothing can play before the visitor has turned it
// on (the AudioContext is only created from that click), and it all goes silent while the tab
// is hidden.
//
//   crtOn   soft CRT power-on: a low thump, a little static, a faint high whine
//   channel the click between sections
//   tick    tiny hover tick on windows and folders
//   open    two-note blip when a window or folder opens
//   type    a key tick for the secret terminal
//   hum     a very low mains hum under the hero, only while it is on screen

import { readStored, writeStored } from './storage';

const KEY = 'aryan-os:sound';
const EVENT = 'aryan-os:sound-change';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let humNodes: { gain: GainNode; oscs: OscillatorNode[] } | null = null;
let humWanted = false;
let lastTick = 0;

export const soundOn = () => typeof document !== 'undefined' && document.documentElement.dataset.sound === 'on';

function ensure(): AudioContext | null {
  if (!soundOn()) return null;
  // Never create the context before the visitor has interacted with this page: browsers
  // refuse to start it (and warn in the console).
  const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  if (!ctx && ua && !ua.hasBeenActive) return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended' && !document.hidden) void ctx.resume();
  return ctx;
}

/** A shaped tone: frequency (or a sweep), length, peak gain, wave type. */
function tone(f0: number, f1: number, len: number, peak: number, type: OscillatorType = 'sine', at = 0) {
  const c = ensure();
  if (!c || !master) return;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + len);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + Math.min(0.01, len / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + len + 0.02);
}

/** Filtered noise: band centre, length, peak gain. */
function hiss(freq: number, len: number, peak: number, q = 0.8, at = 0) {
  const c = ensure();
  if (!c || !master || !noise) return;
  const t = c.currentTime + at;
  const src = c.createBufferSource();
  src.buffer = noise;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.connect(f).connect(g).connect(master);
  src.start(t, Math.random() * 0.3);
  src.stop(t + len + 0.02);
}

export const sound = {
  crtOn() {
    tone(70, 38, 0.35, 0.22);
    hiss(2400, 0.28, 0.05, 0.6, 0.03);
    tone(7800, 7600, 0.5, 0.006, 'sine', 0.05);
  },
  channel() {
    hiss(1800, 0.05, 0.09, 1.2);
    tone(1300, 900, 0.04, 0.04, 'square');
    hiss(5200, 0.12, 0.025, 0.7, 0.03);
  },
  tick() {
    const now = performance.now();
    if (now - lastTick < 70) return;
    lastTick = now;
    tone(2600, 2200, 0.018, 0.018, 'triangle');
  },
  open() {
    tone(660, 660, 0.06, 0.05, 'triangle');
    tone(990, 990, 0.08, 0.04, 'triangle', 0.055);
  },
  type() {
    hiss(3500 + Math.random() * 1500, 0.025, 0.04, 2);
  },
  /** Ask for the hero hum on or off (it only sounds while sound is on). */
  hum(want: boolean) {
    humWanted = want;
    syncHum();
  },
};

function syncHum() {
  const on = humWanted && soundOn() && !document.hidden;
  if (on && !humNodes) {
    const c = ensure();
    if (!c || !master) return;
    const gain = c.createGain();
    gain.gain.value = 0.0001;
    gain.connect(master);
    const oscs = [60, 120, 180].map((f, i) => {
      const o = c.createOscillator();
      o.frequency.value = f;
      const g = c.createGain();
      g.gain.value = [1, 0.35, 0.12][i];
      o.connect(g).connect(gain);
      o.start();
      return o;
    });
    gain.gain.exponentialRampToValueAtTime(0.012, c.currentTime + 1.2);
    humNodes = { gain, oscs };
  } else if (!on && humNodes && ctx) {
    const { gain, oscs } = humNodes;
    humNodes = null;
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    oscs.forEach((o) => o.stop(ctx!.currentTime + 0.45));
  }
}

export function setSound(on: boolean): void {
  document.documentElement.dataset.sound = on ? 'on' : 'off';
  writeStored(KEY, on ? 'on' : 'off');
  window.dispatchEvent(new Event(EVENT));
  if (on) {
    ensure();
    sound.crtOn();
  }
  syncHum();
}

let wired = false;
export function initSound(): void {
  document.documentElement.dataset.sound = readStored(KEY) === 'on' ? 'on' : 'off';
  if (wired) return;
  wired = true;
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) void ctx.suspend();
    else if (soundOn()) void ctx.resume();
    syncHum();
  });
  // Remembered as on: the browser still needs one gesture before audio can start.
  if (soundOn()) {
    const first = () => {
      ensure();
      syncHum();
    };
    window.addEventListener('pointerdown', first, { once: true });
    window.addEventListener('keydown', first, { once: true });
  }
  // Hover ticks and open blips on windows and folders.
  let hovered: Element | null = null;
  document.addEventListener('pointerover', (e) => {
    if (!soundOn() || !ctx) return;
    const t = (e.target as Element).closest('[data-open-window], .gf-hit, .os-light, .file-card-open, .fp-card');
    if (t && t !== hovered) sound.tick();
    hovered = t;
  });
  document.addEventListener('click', (e) => {
    if (!soundOn()) return;
    if ((e.target as Element).closest('[data-open-window], .gf-hit, .fp-card')) sound.open();
  });
}

export function onSoundChange(listener: () => void): () => void {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
