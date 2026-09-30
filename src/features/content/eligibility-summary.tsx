import type { PublicPolicies } from '@/api/types';
import { CheckList } from '@/components/ui/check-list';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { eligibilityPoints } from './policies';

interface EligibilitySummaryProps {
  eligibility: PublicPolicies['eligibility'];
  /** "dark" on ink or primary backgrounds. */
  tone?: 'light' | 'dark';
  className?: string;
}

/** Who can drive, from the rules in force (plan §16 item 5: they change in settings, not in code). */
export function EligibilitySummary({ eligibility, tone, className }: EligibilitySummaryProps) {
  return <CheckList items={eligibilityPoints(eligibility)} tone={tone} className={className} />;
}

export function EligibilitySummarySkeleton({ className }: { className?: string }) {
  return (
    <div aria-busy="true" className={cn('grid gap-3', className)}>
      <span className="sr-only">Loading who can drive</span>
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}
