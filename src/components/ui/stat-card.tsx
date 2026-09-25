import type { LucideIcon } from 'lucide-react';
import { CountUp } from '@/components/motion/count-up';
import { cn } from '@/lib/cn';
import { Card } from './card';
import { Skeleton } from './skeleton';

interface StatCardProps {
  label: string;
  icon: LucideIcon;
  /** `null` means the figure isn't tracked yet; the card says so instead of showing a made-up zero. */
  value: number | null;
  format?: (value: number) => string;
  /** Shown under the value, or instead of it when the value is null. */
  hint?: string;
  className?: string;
}

export function StatCard({ label, icon: Icon, value, format, hint, className }: StatCardProps) {
  const pending = value === null;

  return (
    <Card className={cn('flex flex-col gap-4 p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span
          aria-hidden="true"
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-full',
            pending ? 'bg-ink/5 text-muted' : 'bg-primary/8 text-primary',
          )}
        >
          <Icon className="size-[1.125rem]" />
        </span>
      </div>
      <div>
        <p className="headline text-[2rem] leading-none font-medium text-ink">
          {pending ? <span aria-label="Not tracked yet">—</span> : <CountUp value={value} format={format} />}
        </p>
        {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
      </div>
    </Card>
  );
}

export function StatCardSkeleton() {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="size-9 rounded-full" />
      </div>
      <div>
        <Skeleton className="h-8 w-20" />
        <Skeleton className="mt-2 h-3 w-36" />
      </div>
    </Card>
  );
}
