// client:near — like client:visible, but starts about two screens early, so the section is
// ready (drawn, interactive) by the time it scrolls into view. Waits for the page's load
// event first, so it never competes with the first screen.
import { afterLoad, idle, whenNear, type ClientDirective } from './shared';

const near: ClientDirective = (load, _opts, el) => {
  afterLoad(() =>
    whenNear(el, () => {
      const ready = load();
      idle(() => void ready.then((hydrate) => hydrate()), 300);
    }),
  );
};

export default near;
