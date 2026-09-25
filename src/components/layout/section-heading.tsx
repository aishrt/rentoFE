import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface SectionHeadingProps {
  id?: string;
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
  tone?: 'light' | 'dark';
  className?: string;
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  align = 'left',
  tone = 'light',
  className,
}: SectionHeadingProps) {
  const dark = tone === 'dark';
  return (
    <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center', className)}>
      {eyebrow && <p className={cn('eyebrow mb-3', dark ? 'text-accent' : 'text-primary')}>{eyebrow}</p>}
      <h2 id={id} className={cn('headline text-title-2 font-medium', dark ? 'text-canvas' : 'text-ink')}>
        {title}
      </h2>
      {description && (
        <p className={cn('mt-4 text-lg leading-relaxed', dark ? 'text-canvas/85' : 'text-muted')}>
          {description}
        </p>
      )}
    </div>
  );
}
