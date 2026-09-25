import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/*
 * Teach tailwind-merge the custom theme scales (globals.css) so e.g. `rounded-card` and `rounded-control`
 * conflict correctly. Without the `text` list, `text-title-3` looks like a colour and a later `text-ink`
 * would silently remove it.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['display', 'title-1', 'title-2', 'title-3', 'stat', 'ui'],
      radius: ['inner', 'control', 'card', 'sheet'],
      shadow: ['input', 'card', 'lift'],
      'inset-shadow': ['highlight'],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
