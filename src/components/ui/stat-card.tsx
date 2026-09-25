import type { LucideIcon } from 'lucide-react';
import { CountUp } from '@/components/motion/count-up';
import { cn } from '@/lib/cn';
import { Card } from './card';
import { IconBadge } from './icon-badge';
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
        <IconBadge size="sm" tone={pending ? 'muted' : 'soft'}>
          <Icon />
        </IconBadge>
      </div>
      <div>
        <p className="headline text-stat font-medium text-ink">
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
