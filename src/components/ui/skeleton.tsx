import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

/** A shimmering placeholder. Size it to match the content it stands in for, so nothing jumps (plan §12.5). */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return <div aria-hidden="true" className={cn('skeleton rounded-md', className)} {...props} />;
}
