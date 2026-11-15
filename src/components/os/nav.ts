import type { IconName } from './Icon';

// Old site's resume link, carried over.
export const RESUME_URL = 'https://drive.google.com/file/d/1CM-ZjINPhd6xLyEt7oCMCQVCNPMu_2U4/view';

export type Section = { id: string; label: string; icon: IconName };

/** Homepage sections the dock scrolls to, in page order. */
export const SECTIONS: Section[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'work', label: 'Work', icon: 'folder' },
  { id: 'journey', label: 'Journey', icon: 'compass' },
  { id: 'playground', label: 'Playground', icon: 'shapes' },
  { id: 'writing', label: 'Writing', icon: 'notes' },
  { id: 'contact', label: 'Contact', icon: 'mail' },
];
