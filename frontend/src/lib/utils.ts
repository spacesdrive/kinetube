import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// the design tokens add font sizes, radii and shadows that tailwind-merge has to know, or it drops the wrong class
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['hero', 'page-title', 'section', 'label'],
      radius: ['row', 'control', 'card', 'choice', 'dialog', 'pill'],
      shadow: ['popover', 'dialog', 'bar'],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
