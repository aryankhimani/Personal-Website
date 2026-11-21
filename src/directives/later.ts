// client:later — for the always-there chrome (menu bar, dock, windows, palette): hydrates in
// idle time after the page's load event, so the first screen paints without waiting on it.
import { afterLoad, idle, type ClientDirective } from './shared';

const later: ClientDirective = (load) => {
  afterLoad(() => idle(() => void load().then((hydrate) => hydrate()), 1500));
};

export default later;
