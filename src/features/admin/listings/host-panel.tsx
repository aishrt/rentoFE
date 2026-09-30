import { ArrowRight, BadgeCheck, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router';
import type { AdminVehicle } from '@/api/types';
import { Button } from '@/components/ui/button';
import { hostApplicationsLink } from './listing-format';
import { HostStatusBadge } from './review-badge';
import { ReviewSection } from './review-section';
import { VerifiedMark } from './verified-mark';

/**
 * Who listed the car. A listing can only go live once its Host's application is approved (plan §9,
 * Days 8–11), so an unapproved Host is called out with a way to their application.
 */
export function HostPanel({ host }: { host: AdminVehicle['host'] }) {
  const approved = host.status === 'APPROVED';

  return (
    <ReviewSection id="host" title="Host" aside={<HostStatusBadge status={host.status} />}>
      <dl className="grid gap-3 text-sm">
        <div>
          <dt className="text-muted">Name</dt>
          <dd className="mt-0.5 font-medium text-ink">{host.name}</dd>
        </div>
        <div>
          <dt className="text-muted">Email</dt>
          <dd className="mt-0.5 flex min-w-0 items-center gap-1.5">
            {host.email ? (
              <a
                href={`mailto:${host.email}`}
                className="min-w-0 rounded-inner text-primary wrap-anywhere hover:underline"
              >
                {host.email}
              </a>
            ) : (
              <span className="text-muted">Not known</span>
            )}
            <VerifiedMark verified={host.emailVerified} />
          </dd>
        </div>
        <div>
          <dt className="text-muted">Mobile</dt>
          <dd className="mt-0.5">
            {host.phoneVerified ? (
              <span className="inline-flex items-center gap-1.5 text-ink">
                <BadgeCheck aria-hidden="true" className="size-4 text-success" />
                Verified
              </span>
            ) : (
              <VerifiedMark verified={false} />
            )}
          </dd>
        </div>
      </dl>

      {!approved && (
        <div className="mt-5 rounded-control border border-line bg-ink/3 p-4">
          <p className="flex items-start gap-2 text-sm text-ink">
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
            {host.status === 'APPLIED'
              ? 'Approve their Host application before this listing.'
              : host.status === null
                ? "They haven't applied to host, so this listing can't be approved."
                : `Their Host application is ${host.status === 'REJECTED' ? 'rejected' : 'suspended'}, so this listing can't be approved.`}
          </p>
          {host.status !== null && (
            <Button variant="secondary" size="sm" className="mt-3" asChild>
              <Link to={hostApplicationsLink(host.status)}>
                Open Host applications
                <ArrowRight aria-hidden="true" className="nudge-right" />
              </Link>
            </Button>
          )}
        </div>
      )}
    </ReviewSection>
  );
}
