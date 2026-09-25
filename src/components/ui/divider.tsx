import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

type DividerProps = ComponentProps<'hr'> & {
  /** "dark" for dark backgrounds. */
  tone?: 'light' | 'dark';
};

/** A 1px horizontal rule between groups of content. */
export function Divider({ tone = 'light', className, ...props }: DividerProps) {
  return <hr className={cn(tone === 'dark' ? 'border-canvas/10' : 'border-line', className)} {...props} />;
}
