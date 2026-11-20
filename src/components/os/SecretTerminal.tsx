// The secret terminal (type "sudo" anywhere, or the Konami code). A tiny shell over the
// site's own data: ls, open, whoami, neofetch, help. Nothing here is new information; it
// reads the same project index every page carries.
import { useEffect, useRef, useState } from 'react';
import { setLite } from '../../lib/device-tier';
import { setHero, HEROES } from '../../lib/hero';
import { closeWindow, openWindow } from '../../lib/windows';
import { sound } from '../../lib/sound';
import { FOLDERS } from '../../lib/work';
import { WORK_INDEX } from './window-list';

type Line = { kind: 'in' | 'out'; text: string };

const BANNER = [
  'ARYAN-OS v2.0 (root shell)',
  'You found the secret terminal. Type "help".',
];

function run(cmd: string): string[] | 'clear' | 'exit' {
  const [name, ...args] = cmd.trim().split(/\s+/);
  const arg = args.join(' ');
  switch (name) {
    case '':
      return [];
    case 'help':
      return [
        'help              this list',
        'whoami            who runs this machine',
        'ls [folder]       list folders, or the projects in one',
        'open <project>    open a project in the reader',
        'hero <n>          switch the hero (1-' + HEROES.length + ')',
        'lite on|off       Lite mode',
        'neofetch          system info',
        'clear, exit',
      ];
    case 'whoami':
      return ['aryan khimani', 'Computer Science + Ivey HBA, Western University', 'research · AI tools · ventures'];
    case 'ls':
      if (!arg) return FOLDERS.map((f) => `${f.id}/`.padEnd(12) + f.note);
      {
        const f = arg.replace(/\/$/, '');
        const items = WORK_INDEX.filter((p) => p.folders.includes(f as never));
        return items.length ? items.map((p) => `${p.id}.md`.padEnd(30) + p.title) : [`ls: ${arg}: no such folder`];
      }
    case 'open': {
      const id = arg.replace(/\.md$/, '');
      if (!WORK_INDEX.some((p) => p.id === id)) return [`open: ${arg || '?'}: no such project (try "ls research")`];
      closeWindow('terminal');
      window.setTimeout(() => openWindow(id), 150);
      return [`opening ${id}.md`];
    }
    case 'hero': {
      const n = Number(arg);
      if (!(n >= 1 && n <= HEROES.length)) return [`hero: pick 1-${HEROES.length}`];
      setHero(HEROES[n - 1].id);
      return [`hero → ${HEROES[n - 1].label}`];
    }
    case 'lite':
      if (arg !== 'on' && arg !== 'off') return ['lite: on or off'];
      setLite(arg === 'on');
      return [`lite mode ${arg}`];
    case 'neofetch':
      return [
        '   ___  _  __      aryan@aryan-os',
        '  / _ \\| |/ /      --------------',
        ' / /_\\ \\ \' /       OS: Aryan OS 2.0',
        ' |  _  | . \\       Shell: this one',
        ' |_| |_|_|\\_\\      Projects: ' + WORK_INDEX.length,
        '                   Folders: ' + FOLDERS.length,
        '                   Theme: navy / cream / ember',
      ];
    case 'sudo':
      return ['you are already root here.'];
    case 'rm':
      return ['nice try.'];
    case 'clear':
      return 'clear';
    case 'exit':
      return 'exit';
    default:
      return [`${name}: command not found (type "help")`];
  }
}

export default function SecretTerminal() {
  const [lines, setLines] = useState<Line[]>(BANNER.map((text) => ({ kind: 'out', text })));
  const [value, setValue] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);

  // The window focuses itself when it opens; take focus right after, without scrolling.
  useEffect(() => {
    const id = window.setTimeout(() => input.current?.focus({ preventScroll: true }), 60);
    return () => window.clearTimeout(id);
  }, []);
  // Keep the newest line in view (inside the window only; never scroll the page).
  useEffect(() => {
    const log = end.current?.parentElement?.closest<HTMLElement>('.os-window-body');
    if (log) log.scrollTop = log.scrollHeight;
  }, [lines]);

  return (
    <div className="term" onClick={() => input.current?.focus({ preventScroll: true })}>
      <div className="term-log" role="log" aria-live="polite">
        {lines.map((l, i) => (
          <pre key={i} className={l.kind === 'in' ? 'term-in' : undefined}>
            {l.kind === 'in' ? `root@aryan-os:~# ${l.text}` : l.text}
          </pre>
        ))}
        <div ref={end} />
      </div>
      <form
        className="term-row"
        onSubmit={(e) => {
          e.preventDefault();
          const out = run(value);
          if (out === 'exit') {
            closeWindow('terminal');
            return;
          }
          setLines((ls) =>
            out === 'clear' ? [] : [...ls, { kind: 'in', text: value }, ...out.map((text) => ({ kind: 'out' as const, text }))],
          );
          setValue('');
        }}
      >
        <label htmlFor="term-input" className="term-prompt">
          root@aryan-os:~#
        </label>
        <input
          id="term-input"
          ref={input}
          className="term-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={() => sound.type()}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      </form>
    </div>
  );
}
