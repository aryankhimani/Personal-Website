// What's inside each window. Keys match the ids in window-list.ts.

import type { ReactNode } from 'react';

function Readme() {
  return (
    <div className="os-prose">
      <h3>Welcome to Aryan OS</h3>
      <p>
        This is Aryan Khimani&rsquo;s site, being rebuilt as a small desktop. The shell works; the projects,
        writing and everything else are still being moved in.
      </p>
      <h3>How windows work</h3>
      <ul>
        <li>Drag a window by its title bar.</li>
        <li>Red closes it. Yellow sends it to the dock. Green fills the desk.</li>
        <li>Esc closes the window in front.</li>
        <li>Every window has its own link, so the back button closes it too.</li>
      </ul>
      <h3>If things feel heavy</h3>
      <p>
        Turn on Lite mode from the menu bar. It swaps the animated effects for still ones and keeps everything
        else.
      </p>
    </div>
  );
}

const STACK: [string, string, string][] = [
  ['Astro', 'https://astro.build', 'builds the pages'],
  ['React', 'https://react.dev', 'runs the interactive parts'],
  ['Tailwind CSS', 'https://tailwindcss.com', 'styling'],
  ['Motion', 'https://motion.dev', 'window movement'],
  ['Lenis', 'https://lenis.darkroom.engineering', 'smooth scrolling'],
];

const CREDITS: [string, string, string][] = [
  ['Departure Mono', 'https://departuremono.com', 'typeface by Helena Zhang'],
  ['Pixelarticons', 'https://pixelarticons.com', 'icons by Gerrit Halfmann'],
  ['React Bits', 'https://reactbits.dev', 'dock and mobile menu, adapted, by David Haz'],
];

function LinkList({ rows }: { rows: [string, string, string][] }) {
  return (
    <ul>
      {rows.map(([name, href, note]) => (
        <li key={name}>
          <a href={href} target="_blank" rel="noopener noreferrer">
            {name}
          </a>{' '}
          <span className="os-note">{note}</span>
        </li>
      ))}
    </ul>
  );
}

function AboutThisSite() {
  return (
    <div className="os-prose">
      <h3>About this site</h3>
      <p>
        Aryan OS is a portfolio that behaves like a computer desktop: a menu bar, a dock, and windows you can
        move around.
      </p>
      <h3>Built with</h3>
      <LinkList rows={STACK} />
      <h3>Borrowed with thanks</h3>
      <LinkList rows={CREDITS} />
      <p>
        The code is public:{' '}
        <a href="https://github.com/aryankhimani/Personal-Website" target="_blank" rel="noopener noreferrer">
          github.com/aryankhimani/Personal-Website
        </a>
      </p>
    </div>
  );
}

export const WINDOW_CONTENT: Record<string, () => ReactNode> = {
  readme: Readme,
  'about-this-site': AboutThisSite,
};
