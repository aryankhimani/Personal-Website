// The command palette dialog: type to jump to a section, open a project or an article,
// toggle Lite / sound / CRT, or open the secret terminal. Keyboard first: ↑ ↓ to move,
// Enter to run, Esc to close. A combobox + listbox, so screen readers follow along.
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { isLite, setLite } from '../../lib/device-tier';
import { crtOn, setCrt } from '../../lib/crt';
import { setSound, soundOn } from '../../lib/sound';
import { scrollToSection } from '../../lib/scroll';
import { openWindow } from '../../lib/windows';
import { SECTORS } from '../../lib/signal/bus';
import { sectorTarget } from '../../lib/signal/channel';
import { RESUME_URL } from './nav';
import { WORK_INDEX } from './window-list';
import writing from '../../data/writing.json';

type Cmd = { id: string; group: string; label: string; hint?: string; run: () => void };

function commands(): Cmd[] {
  const list: Cmd[] = [];
  SECTORS.forEach((s, i) =>
    list.push({ id: `go-${s.id}`, group: 'Go to', label: s.label, hint: s.path, run: () => scrollToSection(sectorTarget(i)) }),
  );
  for (const p of WORK_INDEX) list.push({ id: `p-${p.id}`, group: 'Projects', label: p.title, hint: `${p.id}.md`, run: () => openWindow(p.id) });
  for (const w of writing as { title: string; kind: string; href: string; where: string }[])
    list.push({
      id: `w-${w.href}`,
      group: 'Writing',
      label: w.title,
      hint: w.where,
      run: () => window.open(w.href, '_blank', 'noopener,noreferrer'),
    });
  list.push(
    { id: 't-lite', group: 'System', label: `Lite mode: ${isLite() ? 'turn off' : 'turn on'}`, run: () => setLite(!isLite()) },
    { id: 't-sound', group: 'System', label: `Sound: ${soundOn() ? 'turn off' : 'turn on'}`, run: () => setSound(!soundOn()) },
    { id: 't-crt', group: 'System', label: `CRT effect: ${crtOn() ? 'turn off' : 'turn on'}`, run: () => setCrt(!crtOn()) },
    { id: 't-term', group: 'System', label: 'Open the secret terminal', hint: 'sudo', run: () => openWindow('terminal') },
    { id: 't-resume', group: 'System', label: 'Open resume.pdf', run: () => window.open(RESUME_URL, '_blank', 'noopener,noreferrer') },
  );
  return list;
}

/** Contains beats in-order letters; earlier and tighter matches rank higher. 0 = no match. */
function score(q: string, text: string): number {
  if (!q) return 1;
  const t = text.toLowerCase();
  const at = t.indexOf(q);
  if (at >= 0) return 1000 - at;
  let i = 0;
  let gaps = 0;
  for (let j = 0; j < t.length && i < q.length; j++) {
    if (t[j] === q[i]) i++;
    else if (i > 0) gaps++;
  }
  // In-order letters only count when they sit close together (so "trut" doesn't match everything).
  return i === q.length && gaps <= q.length ? 500 - gaps : 0;
}

export default function PaletteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const back = useRef<Element | null>(null);
  const uid = useId();
  // Rebuilt on each open so the toggles say their current state.
  const all = useMemo(() => (open ? commands() : []), [open]);

  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    return all
      .map((c) => ({ c, s: Math.max(score(query, c.label), score(query, `${c.group} ${c.hint ?? ''}`) * 0.5) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => (query ? b.s - a.s : 0))
      .slice(0, 60)
      .map((x) => x.c);
  }, [all, q]);

  useEffect(() => {
    if (!open) return;
    back.current = document.activeElement;
    setQ('');
    setActive(0);
    requestAnimationFrame(() => input.current?.focus());
    return () => (back.current as HTMLElement | null)?.focus?.();
  }, [open]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const run = (c: Cmd | undefined) => {
    if (!c) return;
    onClose();
    // Let focus return first, then act (windows take focus themselves).
    window.setTimeout(c.run, 30);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(shown.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(shown[active]);
    } else if (e.key === 'Tab') {
      e.preventDefault(); // the input is the only stop; the list is driven by the arrows
    }
  };

  let lastGroup = '';
  return (
    <div className="palette-veil" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Command palette" onKeyDown={onKey}>
        <div className="palette-input-row">
          <span className="palette-prompt" aria-hidden="true">
            &gt;
          </span>
          <input
            ref={input}
            className="palette-input"
            role="combobox"
            aria-expanded="true"
            aria-controls={`${uid}-list`}
            aria-activedescendant={shown[active] ? `${uid}-${active}` : undefined}
            aria-autocomplete="list"
            placeholder="Jump to a section, open a project, toggle sound…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            spellCheck={false}
            autoComplete="off"
          />
          <kbd className="palette-kbd">esc</kbd>
        </div>
        <ul ref={listRef} id={`${uid}-list`} role="listbox" aria-label="Commands" className="palette-list">
          {shown.length === 0 && <li className="palette-empty">No matches.</li>}
          {shown.map((c, i) => {
            const head = c.group !== lastGroup;
            lastGroup = c.group;
            return (
              <li
                key={c.id}
                id={`${uid}-${i}`}
                role="option"
                aria-selected={i === active}
                className="palette-item"
                data-head={head ? c.group : undefined}
                onMouseMove={() => setActive(i)}
                onClick={() => run(c)}
              >
                <span className="palette-label">{c.label}</span>
                {c.hint && <span className="palette-hint">{c.hint}</span>}
              </li>
            );
          })}
        </ul>
        <p className="palette-foot" aria-hidden="true">
          <span>↑↓ move</span>
          <span>↵ run</span>
          <span>⌘K toggle</span>
        </p>
      </div>
    </div>
  );
}
