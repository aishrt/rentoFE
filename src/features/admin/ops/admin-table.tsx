import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/cn';

/*
 * The staff portal's data tables (plan §12.6): a bordered card that scrolls sideways on a phone, with
 * quiet headings and a row hover. Rows usually link to a detail page. The card is `relative` so it also
 * clips its absolutely positioned parts, such as screen-reader-only headings, which would otherwise
 * widen the whole page.
 */

export function DataTable({
  label,
  children,
  className,
}: {
  /** Names the table for screen readers, e.g. "Users". */
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'scrollbar-subtle relative overflow-x-auto rounded-card border border-line bg-surface',
        className,
      )}
    >
      <table aria-label={label} className="w-full min-w-max text-sm">
        {children}
      </table>
    </div>
  );
}

export function Th({ className, align, ...props }: ComponentProps<'th'> & { align?: 'right' }) {
  return (
    <th
      scope="col"
      className={cn(
        'border-b border-line px-4 py-3 text-left text-xs font-semibold whitespace-nowrap text-muted',
        align === 'right' && 'text-right',
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, align, ...props }: ComponentProps<'td'> & { align?: 'right' }) {
  return (
    <td
      className={cn('px-4 py-3 align-top', align === 'right' && 'text-right tabular-nums', className)}
      {...props}
    />
  );
}

export function Tr({ className, ...props }: ComponentProps<'tr'>) {
  return <tr className={cn('border-t border-line first:border-t-0 hover:bg-ink/3', className)} {...props} />;
}

interface PaginationProps {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
  /** "users", "bookings": what's counted. */
  noun: string;
  /** For a single result, e.g. "user"; defaults to `noun` without its final "s". */
  nounOne?: string;
}

/** "41–60 of 112 users" with previous and next. */
export function Pagination({ page, total, pageSize, onChange, noun, nounOne }: PaginationProps) {
  const counted = total === 1 ? (nounOne ?? noun.replace(/s$/, '')) : noun;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  return (
    <nav
      aria-label="Pages"
      className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted"
    >
      <p aria-live="polite">
        {total === 0
          ? `No ${noun}`
          : total === 1
            ? `1 ${counted}`
            : `${formatNumber(first)}–${formatNumber(last)} of ${formatNumber(total)} ${counted}`}
      </p>
      {pages > 1 && (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
            <ChevronLeft aria-hidden="true" />
            Previous
          </Button>
          <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
            Next
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      )}
    </nav>
  );
}
