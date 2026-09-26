import { cn } from '@/lib/cn';

/** The look shared by text inputs and the buttons that open pickers, so every form control matches. */
export const controlClasses = cn(
  'h-12 w-full rounded-control border border-line bg-surface px-4 text-base text-ink shadow-input',
  'placeholder:text-muted/75 transition-[border-color,box-shadow] duration-120 ease-out',
  'hover:border-ink/25 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/12',
  'aria-invalid:border-danger aria-invalid:focus-visible:ring-danger/12',
  'disabled:cursor-not-allowed disabled:opacity-60',
);
