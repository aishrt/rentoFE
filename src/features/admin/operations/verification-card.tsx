import { Check, TriangleAlert, X } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router';
import type { VerificationQueueItem } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDateNz, formatDayValue, todayNz, waitingFor } from '@/features/admin/listings/listing-format';
import { riskFlagLabel } from '@/features/admin/ops/admin-labels';
import { EmailAddress } from '@/features/admin/ops/email-address';
import { formatNzDateTime } from '@/features/booking/booking-format';
import { cn } from '@/lib/cn';
import { DocumentMatch, LicenceNumber } from './licence-facts';
import { englishFact } from './licence-format';
import {
  documentTypeLabel,
  licenceClassLabel,
  personName,
  verificationStatusLabel,
} from './operations-labels';

type LicenceFacts = NonNullable<VerificationQueueItem['licence']>;

function Detail({ term, children, className }: { term: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-muted">{term}</dt>
      <dd className="mt-0.5 text-ink">{children}</dd>
    </div>
  );
}

const Missing = ({ children }: { children: ReactNode }) => <span className="text-muted">{children}</span>;

/** The licence details to compare with their ID and date of birth, with the full number on request. */
function LicenceDetails({ licence, userId }: { licence: LicenceFacts; userId: string }) {
  const expired = licence.expiry < todayNz();
  const english = englishFact(licence);
  return (
    <>
      <Detail term="Licence">{licenceClassLabel(licence.class)}</Detail>
      <Detail term="Issued in">{licence.country}</Detail>
      <Detail term="Licence number">
        <LicenceNumber userId={userId} numberEnding={licence.numberEnding} />
      </Detail>
      <Detail term="Version">
        {licence.version ? (
          <span className="tabular-nums">{licence.version}</span>
        ) : (
          <Missing>Not given</Missing>
        )}
      </Detail>
      <Detail term="Issued">
        {licence.issuedAt ? formatDayValue(licence.issuedAt) : <Missing>Not given</Missing>}
      </Detail>
      <Detail term="Expires">
        <span className={cn(expired && 'font-medium text-danger')}>
          {formatDayValue(licence.expiry)}
          {expired && ' (expired)'}
        </span>
      </Detail>
      {english && <Detail term={english.term}>{english.value}</Detail>}
      <Detail term="Licence check">{verificationStatusLabel(licence.status)}</Detail>
    </>
  );
}

interface VerificationCardProps {
  item: VerificationQueueItem;
  onApprove: () => void;
  onReject: () => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * One person in the verification queue (spec §22): who they are, why a person needs to look, the details to
 * compare, their risk flags, and the bookings waiting on the decision.
 */
export function VerificationCard({ item, onApprove, onReject, className, style }: VerificationCardProps) {
  const name = personName(item);
  const headingId = `verification-${item.kind.toLowerCase()}-${item.userId}`;
  const what = item.kind === 'IDENTITY' ? 'identity check' : 'licence';

  return (
    <Card asChild className={cn('p-5 sm:p-6', className)} style={style}>
      <li aria-labelledby={headingId}>
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <h3 id={headingId} className="text-base font-semibold text-ink">
              <Link
                to={`/admin/users/${item.userId}`}
                className="rounded-inner hover:text-primary hover:underline"
              >
                {name}
              </Link>
            </h3>
            <p className="mt-1 text-sm wrap-anywhere text-muted">
              <EmailAddress email={item.email} /> · Waiting since {formatDateNz(item.since)} (
              {waitingFor(item.since)})
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={onReject} aria-label={`Reject ${name}’s ${what}`}>
              <X aria-hidden="true" />
              Reject
            </Button>
            <Button size="sm" onClick={onApprove} aria-label={`Approve ${name}’s ${what}`}>
              <Check aria-hidden="true" />
              Approve
            </Button>
          </div>
        </div>

        <div className="mt-4 rounded-inner bg-ink/5 px-4 py-3 text-sm">
          <p className="font-medium text-ink">Why it needs a person</p>
          <p className="mt-0.5 text-ink/85">{item.reason}</p>
        </div>

        <dl className="mt-5 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Detail term="Date of birth">
            {item.dob ? formatDayValue(item.dob) : <Missing>Not given</Missing>}
          </Detail>
          <Detail term="ID document">
            {item.identity.documentType ? (
              documentTypeLabel(item.identity.documentType)
            ) : (
              <Missing>Not known</Missing>
            )}
          </Detail>
          <Detail term="Identity check">{verificationStatusLabel(item.identity.status)}</Detail>
          {item.identity.licenceNumberMatched !== undefined && (
            <Detail term="Licence number on the ID">
              <DocumentMatch matched={item.identity.licenceNumberMatched} />
            </Detail>
          )}
          {item.identity.dobMatched !== undefined && (
            <Detail term="Date of birth on the ID">
              <DocumentMatch matched={item.identity.dobMatched} />
            </Detail>
          )}
          {item.licence ? (
            <LicenceDetails licence={item.licence} userId={item.userId} />
          ) : (
            <Detail term="Licence">
              <Missing>Not added yet</Missing>
            </Detail>
          )}

          <Detail term="Risk flags" className="sm:col-span-2 lg:col-span-4">
            {item.riskFlags.length > 0 ? (
              <ul aria-label="Risk flags" className="mt-1 flex flex-wrap gap-2">
                {item.riskFlags.map((flag) => (
                  <li key={flag}>
                    <Badge className="bg-danger/8 text-danger">
                      <TriangleAlert aria-hidden="true" />
                      {riskFlagLabel(flag)}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <Missing>None</Missing>
            )}
          </Detail>

          {(item.kind === 'IDENTITY' || item.waitingBookings.length > 0) && (
            <Detail term="Bookings waiting on this" className="sm:col-span-2 lg:col-span-4">
              {item.waitingBookings.length > 0 ? (
                <ul aria-label="Bookings waiting" className="mt-1 grid gap-1.5">
                  {item.waitingBookings.map((booking) => (
                    <li key={booking.ref} className="flex flex-wrap items-baseline gap-x-2">
                      <Link
                        to={`/admin/bookings/${booking.ref}`}
                        className="rounded-inner font-medium text-primary hover:underline"
                      >
                        {booking.ref}
                      </Link>
                      <span>{booking.vehicleTitle}</span>
                      <span className="text-muted">
                        {booking.expiresAt
                          ? `· Expires ${formatNzDateTime(booking.expiresAt)}`
                          : '· No expiry set'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Missing>None</Missing>
              )}
            </Detail>
          )}
        </dl>
      </li>
    </Card>
  );
}
