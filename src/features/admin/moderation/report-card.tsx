import { ArrowUpRight, EyeOff, MessagesSquare } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router';
import type { AdminReport } from '@/api/types';
import { threadPath } from '@/features/admin/bookings/bookings-api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatNzDateTime, formatRelativeTime } from '@/features/booking/booking-format';
import { StatusBadge } from '@/features/booking/booking-parts';
import { cn } from '@/lib/cn';
import { ModerationReviewContent } from './held-review-card';
import { REPORT_STATUS, REPORT_TARGET, reportReasonLabel, reviewStateLabel } from './moderation-labels';

const linkClasses = 'link-underline inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary';

/** Where to look at what was reported, in context. */
function contextLink(report: AdminReport): ReactNode {
  if (report.targetType === 'MESSAGE' && report.bookingRef) {
    return (
      <Link to={threadPath(report.bookingRef, 'REPORT', report.id)} className={linkClasses}>
        <MessagesSquare aria-hidden="true" className="size-4" />
        Open the conversation
      </Link>
    );
  }
  if (report.targetType === 'VEHICLE') {
    return (
      <Link to={`/admin/vehicles/${report.targetId}`} className={linkClasses}>
        <ArrowUpRight aria-hidden="true" className="size-4" />
        Open the listing
      </Link>
    );
  }
  if (report.targetType === 'USER') {
    return (
      <Link to={`/admin/users/${report.targetId}`} className={linkClasses}>
        <ArrowUpRight aria-hidden="true" className="size-4" />
        Open their account
      </Link>
    );
  }
  return null;
}

function Detail({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={cn('grid gap-0.5', wide && 'sm:col-span-2')}>
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className="min-w-0 text-sm break-words whitespace-pre-line text-ink">{children}</dd>
    </div>
  );
}

const PersonLink = ({ person }: { person: { id: string; name: string } }) => (
  <Link to={`/admin/users/${person.id}`} className="link-underline font-medium text-primary">
    {person.name}
  </Link>
);

interface ReportCardProps {
  report: AdminReport;
  /** Open reports only. */
  onResolve?: () => void;
  /** Open reports about a review that's still shown. */
  onHideReview?: () => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * A member's report: what they reported and why, who it's about, and a way to look at it in context. A
 * reported review is shown whole, with where it stands, so it can be hidden from here.
 */
export function ReportCard({ report, onResolve, onHideReview, className, style }: ReportCardProps) {
  const what = REPORT_TARGET[report.targetType];
  const context = contextLink(report);
  const { review } = report;
  return (
    <li
      aria-label={`${what} reported by ${report.reporter.name}`}
      className={cn('grid gap-4 rounded-card border border-line bg-surface p-5 sm:p-6', className)}
      style={style}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{what}</Badge>
          <Badge variant="primary">{reportReasonLabel(report.reason)}</Badge>
          {report.status !== 'OPEN' && <StatusBadge status={REPORT_STATUS[report.status]} />}
        </div>
        <p className="text-sm text-muted">
          Reported{' '}
          <time dateTime={report.createdAt} title={formatNzDateTime(report.createdAt)}>
            {formatRelativeTime(report.createdAt)}
          </time>
        </p>
      </div>

      {review ? (
        <figure className="grid gap-2">
          <figcaption className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
            What was reported
            <StatusBadge status={reviewStateLabel(review)} />
          </figcaption>
          <div className="grid gap-3 rounded-card bg-canvas/60 p-4">
            <ModerationReviewContent review={review} />
          </div>
        </figure>
      ) : (
        <figure>
          <figcaption className="text-xs font-semibold text-muted">What was reported</figcaption>
          <blockquote className="mt-1.5 border-l-2 border-line pl-4 text-ink/90 break-words whitespace-pre-wrap">
            {report.preview}
          </blockquote>
        </figure>
      )}

      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        <Detail label="Why">{reportReasonLabel(report.reason)}</Detail>
        <Detail label="Reported by">
          <PersonLink person={report.reporter} />
        </Detail>
        {/* A review says who wrote it about whom. */}
        {report.subject && !review && (
          <Detail label="About">
            <PersonLink person={report.subject} />
          </Detail>
        )}
        {report.note && (
          <Detail label="Their note" wide>
            {report.note}
          </Detail>
        )}
        {review?.status === 'HIDDEN' && review.moderationReason && (
          <Detail label="Why the review was hidden" wide>
            {review.moderationReason}
          </Detail>
        )}
        {report.resolution && (
          <Detail label="What was done" wide>
            {report.resolution}
          </Detail>
        )}
      </dl>

      {(context || onResolve || onHideReview) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          {context}
          {(onResolve || onHideReview) && (
            <div className="ml-auto flex flex-wrap justify-end gap-3">
              {onHideReview && (
                <Button variant="secondary" onClick={onHideReview}>
                  <EyeOff aria-hidden="true" />
                  Hide review
                </Button>
              )}
              {onResolve && <Button onClick={onResolve}>Resolve</Button>}
            </div>
          )}
        </div>
      )}
    </li>
  );
}
