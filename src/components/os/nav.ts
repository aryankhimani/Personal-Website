import type { IconName } from './Icon';

// The newest resume (Nov 23, 2026). To update it, replace public/Aryan_Khimani_Resume.pdf.
export const RESUME_URL = '/Aryan_Khimani_Resume.pdf';

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
