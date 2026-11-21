// client:calm — for the heavy WebGL islands only (Journey/Contact backdrops, toys).
// After the page has loaded, the island's code is fetched when it's about two screens away;
// it hydrates only once scrolling has paused for a moment and the browser is idle, because
// creating a WebGL context takes 100+ ms and doing that mid-scroll causes a hitch.
import { afterLoad, idle, whenNear, type ClientDirective } from './shared';

const QUIET_MS = 220;

const calm: ClientDirective = (load, _opts, el) => {
  afterLoad(() =>
    whenNear(el, () => {
      const ready = load();
      let t = 0;
      const go = () => {
        window.removeEventListener('scroll', onScroll);
        idle(() => void ready.then((hydrate) => hydrate()), 1500);
      };
      const onScroll = () => {
        window.clearTimeout(t);
        t = window.setTimeout(go, QUIET_MS);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }),
  );
};

export default calm;
