// localStorage / sessionStorage can throw (private mode, blocked cookies, quota).
// These wrappers never throw; a failed read returns null and a failed write is ignored.

type Kind = 'local' | 'session';

function store(kind: Kind): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readStored(key: string, kind: Kind = 'local'): string | null {
  try {
    return store(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string, kind: Kind = 'local'): void {
  try {
    store(kind)?.setItem(key, value);
  } catch {
    // Nothing to do: the preference just won't persist.
  }
}
