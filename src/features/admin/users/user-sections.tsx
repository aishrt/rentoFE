import { HandCoins } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { AdminBookingRow, AdminUserDetail } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { hostCarsPath } from '@/features/admin/listings/listing-api';
import { formatDateNz, formatDayValue } from '@/features/admin/listings/listing-format';
import { HostStatusBadge } from '@/features/admin/listings/review-badge';
import { Fact, FactList, ReviewSection } from '@/features/admin/listings/review-section';
import { VerifiedMark } from '@/features/admin/listings/verified-mark';
import { BOOKING_STATUS, ROLE_LABELS, VERIFICATION_LABELS } from '@/features/admin/ops/admin-labels';
import { DataTable, Td, Th, Tr } from '@/features/admin/ops/admin-table';
import { EmailAddress } from '@/features/admin/ops/email-address';
import {
  formatNzd,
  formatNzDateTimeWithYear,
  formatTripSpan,
  ratingText,
} from '@/features/booking/booking-format';
import { StatusBadge } from '@/features/booking/booking-parts';
import { DocumentMatch, LicenceNumber } from '@/features/admin/operations/licence-facts';
import { englishFact } from '@/features/admin/operations/licence-format';
import { documentTypeLabel } from '@/features/admin/operations/operations-labels';
import { formatNumber } from '@/lib/format';
import { licenceClassLabel, licenceStatusLabel } from './user-format';

/* The parts of someone's record in the staff portal (plan §12.6). */

// The facts sit in a narrow side column on a desktop: two to a row at most.
const SIDE_FACTS = 'sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2';

export function AccountSection({ user }: { user: AdminUserDetail }) {
  const problem = user.emailProblem;
  return (
    <ReviewSection id="account" title="Account">
      {problem && (
        <Alert
          variant="danger"
          className="mb-5"
          title={
            problem.kind === 'BOUNCED'
              ? 'Emails to this address are bouncing'
              : 'Emails to this address are blocked'
          }
        >
          <p>
            {problem.kind === 'BOUNCED'
              ? `The last one bounced on ${formatNzDateTimeWithYear(problem.at)}.`
              : `Our email service stopped sending to it after earlier bounces or a spam report (${formatNzDateTimeWithYear(problem.at)}).`}{' '}
            They may be missing booking emails: check the address with them, or reach them by phone or in
            messages.
          </p>
          {problem.detail && <p className="mt-1 text-muted wrap-anywhere">{problem.detail}</p>}
        </Alert>
      )}
      <FactList>
        <Fact term="Email">
          <a
            href={`mailto:${user.email}`}
            className="rounded-inner text-primary wrap-anywhere hover:underline"
          >
            <EmailAddress email={user.email} />
          </a>{' '}
          <VerifiedMark verified={user.emailVerified} />
        </Fact>
        <Fact term="Mobile">
          {user.phone ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <a href={`tel:${user.phone}`} className="rounded-inner text-primary hover:underline">
                {user.phone}
              </a>
              <VerifiedMark verified={user.phoneVerified} />
            </span>
          ) : (
            <span className="text-muted">Not added</span>
          )}
        </Fact>
        <Fact term="Roles">{user.roles.map((role) => ROLE_LABELS[role]).join(', ')}</Fact>
        <Fact term="Identity">{VERIFICATION_LABELS[user.identityStatus]}</Fact>
        <Fact term="Last signed in">
          {user.lastLoginAt ? (
            formatNzDateTimeWithYear(user.lastLoginAt)
          ) : (
            <span className="text-muted">Never</span>
          )}
        </Fact>
        <Fact term="Joined">{formatDateNz(user.createdAt)}</Fact>
      </FactList>
    </ReviewSection>
  );
}

/**
 * The licence and what to check it against (spec §22): its details, the date of birth on the account and
 * how the ID in the identity check compared. The full number only on request, logged each time (plan §14).
 */
export function LicenceSection({ user }: { user: AdminUserDetail }) {
  const { licence, identityDocument: document } = user;
  const english = licence ? englishFact(licence) : null;
  return (
    <ReviewSection id="licence" title="Driver licence">
      {licence ? (
        <FactList className={SIDE_FACTS}>
          <Fact term="Class">{licenceClassLabel(licence.class)}</Fact>
          <Fact term="Country">{licence.country}</Fact>
          <Fact term="Number" wide>
            <LicenceNumber userId={user.id} numberEnding={licence.numberEnding} />
          </Fact>
          <Fact term="Version">{licence.version}</Fact>
          <Fact term="Issued">{licence.issuedAt && formatDayValue(licence.issuedAt)}</Fact>
          <Fact term="Expires">{formatDayValue(licence.expiry)}</Fact>
          <Fact term="Date of birth">{user.dob && formatDayValue(user.dob)}</Fact>
          {english && <Fact term={english.term}>{english.value}</Fact>}
          <Fact term="Check">{licenceStatusLabel(licence.status)}</Fact>
          {document?.type && <Fact term="ID used">{documentTypeLabel(document.type)}</Fact>}
          {document?.licenceNumberMatched !== undefined && (
            <Fact term="Number on the ID">
              <DocumentMatch matched={document.licenceNumberMatched} />
            </Fact>
          )}
          {document?.dobMatched !== undefined && (
            <Fact term="Birth date on the ID">
              <DocumentMatch matched={document.dobMatched} />
            </Fact>
          )}
        </FactList>
      ) : (
        <p className="text-sm text-muted">No licence added yet.</p>
      )}
    </ReviewSection>
  );
}

export function HostSection({
  userId,
  host,
  onWaive,
}: {
  /** The Host's user id, to list their cars. */
  userId: string;
  host: NonNullable<AdminUserDetail['host']>;
  /** Left out when nothing is owed. */
  onWaive?: () => void;
}) {
  return (
    <ReviewSection id="host" title="Host" aside={<HostStatusBadge status={host.status} />}>
      <FactList className={SIDE_FACTS}>
        <Fact term="Payouts">{host.payoutsEnabled ? 'Set up' : 'Not set up'}</Fact>
        <Fact term="Fees owed">{formatNzd(host.feesOwedCents)}</Fact>
        <Fact term="Trips">{formatNumber(host.tripCount)}</Fact>
        <Fact term="Rating">{ratingText(host.rating)}</Fact>
        <Fact term="Cars">
          {host.vehicles > 0 ? (
            // Their cars in Vehicles, whatever their status: to suspend one, or reach its calendar.
            <Link to={hostCarsPath(userId)} className="rounded-inner text-primary hover:underline">
              {host.vehicles === 1 ? '1 car' : `${formatNumber(host.vehicles)} cars`}
            </Link>
          ) : (
            formatNumber(host.vehicles)
          )}
        </Fact>
      </FactList>
      {onWaive && (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onWaive}>
          <HandCoins aria-hidden="true" />
          Waive fees
        </Button>
      )}
    </ReviewSection>
  );
}

function Person({ person, selfId }: { person: AdminBookingRow['guest']; selfId: string }) {
  if (person.id === selfId) return <span className="text-ink">{person.name}</span>;
  return (
    <Link to={`/admin/users/${person.id}`} className="rounded-inner text-primary hover:underline">
      {person.name}
    </Link>
  );
}

/** Bookings as Guest and as Host, each linking to the booking and to the other person. */
export function UserBookingsTable({
  label,
  bookings,
  selfId,
  empty,
}: {
  label: string;
  bookings: AdminBookingRow[];
  /** The person whose record this is: their own name isn't a link. */
  selfId: string;
  empty: ReactNode;
}) {
  if (bookings.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <DataTable label={label}>
      <thead>
        <tr>
          <Th>Booking</Th>
          <Th>Car</Th>
          <Th>Dates</Th>
          <Th>Status</Th>
          <Th>Guest</Th>
          <Th>Host</Th>
          <Th align="right">Total</Th>
        </tr>
      </thead>
      <tbody>
        {bookings.map((booking) => (
          <Tr key={booking.id}>
            <Td>
              <Link
                to={`/admin/bookings/${booking.ref}`}
                className="rounded-inner font-medium text-primary hover:underline"
              >
                {booking.ref}
              </Link>
            </Td>
            <Td>{booking.vehicleTitle}</Td>
            <Td className="whitespace-nowrap">{formatTripSpan(booking.start, booking.end)}</Td>
            <Td>
              <StatusBadge status={BOOKING_STATUS[booking.status]} />
            </Td>
            <Td>
              <Person person={booking.guest} selfId={selfId} />
            </Td>
            <Td>
              <Person person={booking.host} selfId={selfId} />
            </Td>
            <Td align="right">{formatNzd(booking.totalCents)}</Td>
          </Tr>
        ))}
      </tbody>
    </DataTable>
  );
}
