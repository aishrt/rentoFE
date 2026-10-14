import { Flag } from 'lucide-react';
import type { RiskFlag } from '@/api/types';
import { Button } from '@/components/ui/button';
import { formatDateNz } from '@/features/admin/listings/listing-format';
import { riskFlagLabel } from '@/features/admin/ops/admin-labels';
import { cn } from '@/lib/cn';

/**
 * One risk flag (plan §14): what our checks found, when, and Clear once staff have looked into it.
 * A cleared flag stays in someone's record, greyed, with the day it was cleared.
 */
export function RiskFlagItem({
  flag,
  onClear,
  clearing,
}: {
  flag: RiskFlag;
  /** Left out where the flag can't be cleared from. */
  onClear?: () => void;
  clearing?: boolean;
}) {
  const label = riskFlagLabel(flag.code);
  const cleared = Boolean(flag.clearedAt);
  return (
    <li className="flex flex-wrap items-start gap-x-3 gap-y-2 py-3 first:pt-0 last:pb-0">
      <Flag
        aria-hidden="true"
        className={cn('mt-0.5 size-4 shrink-0', cleared ? 'text-muted' : 'text-danger')}
      />
      <div className="min-w-0 flex-1 basis-40">
        <p className={cn('font-medium', cleared ? 'text-muted' : 'text-ink')}>{label}</p>
        {flag.detail && <p className="mt-0.5 text-sm break-words text-muted">{flag.detail}</p>}
        <p className="mt-0.5 text-xs text-muted">
          Raised {formatDateNz(flag.createdAt)}
          {flag.clearedAt && ` · cleared ${formatDateNz(flag.clearedAt)}`}
        </p>
      </div>
      {!cleared && onClear && (
        <Button
          variant="secondary"
          size="sm"
          aria-label={`Clear flag: ${label}`}
          loading={clearing}
          onClick={onClear}
          className="ml-7 sm:ml-0"
        >
          Clear
        </Button>
      )}
    </li>
  );
}
