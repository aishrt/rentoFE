import { CheckDraw } from '@/components/motion/check-draw';
import { cn } from '@/lib/cn';
import { motion } from '@/styles/tokens';

interface CheckListProps {
  items: readonly string[];
  /** "dark" for dark or green backgrounds, where the checks turn gold. */
  tone?: 'light' | 'dark';
  className?: string;
}

/** A list of benefits, each with a check that draws in one after another as the list comes into view. */
export function CheckList({ items, tone = 'light', className }: CheckListProps) {
  const dark = tone === 'dark';

  return (
    <ul className={cn('grid gap-3', className)}>
      {items.map((item, index) => (
        <li key={item} className={cn('flex items-start gap-3', dark ? 'text-canvas/85' : 'text-ink')}>
          <span
            aria-hidden="true"
            className={cn(
              'flex size-6 shrink-0 items-center justify-center rounded-full',
              dark ? 'bg-gold/20 text-gold' : 'bg-primary/8 text-primary',
            )}
          >
            <CheckDraw
              className="size-3.5"
              delay={motion.duration.short + Math.min(index, motion.staggerLimit - 1) * motion.stagger}
            />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}
