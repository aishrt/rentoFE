import { Check, X } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import type { HostApplication } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { applicantName, formatDateNz, waitingFor } from './listing-format';
import { HostStatusBadge } from './review-badge';
import { VerifiedMark } from './verified-mark';

function Detail({ term, children, className }: { term: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-muted">{term}</dt>
      <dd className="mt-0.5 text-ink">{children}</dd>
    </div>
  );
}

function carsLine({ total, underReview }: HostApplication['vehicles']): string {
  if (total === 0) return 'None yet';
  const cars = `${formatNumber(total)} ${total === 1 ? 'car' : 'cars'}`;
  return underReview > 0 ? `${cars}, ${formatNumber(underReview)} waiting for review` : cars;
}

interface HostApplicationCardProps {
  application: HostApplication;
  /** Left out for applications with nothing to decide, such as approved ones. */
  onApprove?: () => void;
  onReject?: () => void;
  className?: string;
  style?: CSSProperties;
}

/** One person's application to host (plan §9, Days 8–11): who they are, how to reach them, and their cars. */
export function HostApplicationCard({
  application,
  onApprove,
  onReject,
  className,
  style,
}: HostApplicationCardProps) {
  const name = applicantName(application);
  const headingId = `application-${application.userId}`;

  return (
    <Card asChild className={cn('p-5 sm:p-6', className)} style={style}>
      <li aria-labelledby={headingId}>
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 id={headingId} className="text-base font-semibold text-ink">
                {name}
              </h2>
              <HostStatusBadge status={application.status} />
            </div>
            <p className="mt-1 text-sm text-muted">
              Applied {formatDateNz(application.appliedAt)} · {waitingFor(application.appliedAt)}
            </p>
          </div>
          {(onApprove || onReject) && (
            <div className="flex flex-wrap gap-2">
              {onReject && (
                <Button variant="secondary" size="sm" onClick={onReject} aria-label={`Reject ${name}`}>
                  <X aria-hidden="true" />
                  Reject
                </Button>
              )}
              {onApprove && (
                <Button size="sm" onClick={onApprove} aria-label={`Approve ${name}`}>
                  <Check aria-hidden="true" />
                  Approve
                </Button>
              )}
            </div>
          )}
        </div>

        <dl className="mt-5 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <Detail term="Email">
            <span className="flex min-w-0 items-center gap-1.5">
              <a
                href={`mailto:${application.email}`}
                className="min-w-0 rounded-inner text-primary wrap-anywhere hover:underline"
              >
                {application.email}
              </a>
              <VerifiedMark verified={application.emailVerified} />
            </span>
          </Detail>
          <Detail term="Mobile">
            {application.phone ? (
              <span className="flex items-center gap-1.5">
                <a href={`tel:${application.phone}`} className="rounded-inner text-primary hover:underline">
                  {application.phone}
                </a>
                <VerifiedMark verified={application.phoneVerified} />
              </span>
            ) : (
              <span className="text-muted">Not added</span>
            )}
          </Detail>
          <Detail term="GST">
            {application.gstRegistered
              ? `Registered${application.gstNumber ? `, ${application.gstNumber}` : ''}`
              : 'Not registered'}
          </Detail>
          <Detail term="Cars">{carsLine(application.vehicles)}</Detail>
          <Detail term="About them" className="sm:col-span-2 xl:col-span-4">
            {application.bio ? (
              <p className="max-w-3xl whitespace-pre-line">{application.bio}</p>
            ) : (
              <span className="text-muted">Nothing written</span>
            )}
          </Detail>
          {application.reviewNotes && (
            <Detail term="Staff notes" className="sm:col-span-2 xl:col-span-4">
              <p className="max-w-3xl whitespace-pre-line">{application.reviewNotes}</p>
            </Detail>
          )}
        </dl>
      </li>
    </Card>
  );
}
