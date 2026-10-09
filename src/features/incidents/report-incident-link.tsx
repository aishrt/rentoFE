import { TriangleAlert } from 'lucide-react';
import { Link } from 'react-router';
import type { Booking } from '@/api/types';

/** Bookings an incident can be reported on, as the API allows (plan §3, validation rules). */
const REPORTABLE: readonly Booking['status'][] = ['CONFIRMED', 'ACTIVE', 'COMPLETED'];

/**
 * "Report an incident" on a confirmed, active or completed booking (spec §15), for the Guest or the Host, with
 * the booking already chosen: damage found after the trip, a toll or infringement notice weeks later.
 */
export function ReportIncidentLink({ booking }: { booking: Pick<Booking, 'ref' | 'status'> }) {
  if (!REPORTABLE.includes(booking.status)) return null;
  return (
    <Link
      to={`/incidents/new?booking=${encodeURIComponent(booking.ref)}`}
      className="link-underline inline-flex items-center gap-2 font-medium text-primary"
    >
      <TriangleAlert aria-hidden="true" className="size-4" />
      Report an incident
    </Link>
  );
}
