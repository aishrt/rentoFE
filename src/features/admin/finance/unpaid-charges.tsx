import { CircleCheck, Lock } from 'lucide-react';
import { Link } from 'react-router';
import { EXTRA_CHARGE_STATUS, EXTRA_CHARGE_TYPE } from '@/features/admin/bookings/bookings-labels';
import { DataTable, Pagination, Td, Th, Tr } from '@/features/admin/ops/admin-table';
import { EmptyList, ListSkeleton, LoadError } from '@/features/admin/ops/query-feedback';
import { formatNzDate, formatNzd } from '@/features/booking/booking-format';
import { StatusBadge } from '@/features/booking/booking-parts';
import { cn } from '@/lib/cn';
import {
  EXTRA_CHARGES_PAGE_SIZE,
  isForbidden,
  useUnpaidExtraCharges,
  type AdminExtraChargeRow,
  type ExtraChargeFilters,
} from './finance-api';

const linkClasses = 'rounded-inner font-medium text-primary hover:underline';

/** The last try on the saved card, how many there have been, and when the next one is. */
function Collection({ charge }: { charge: AdminExtraChargeRow }) {
  const { failureReason, attempts, nextTryAt } = charge;
  if (!failureReason && attempts === undefined && !nextTryAt) {
    return <span className="text-muted">Not tried yet</span>;
  }
  return (
    <div className="grid max-w-64 gap-1 whitespace-normal">
      {failureReason && <p className="text-danger">{failureReason}</p>}
      {attempts !== undefined && (
        <p className="text-muted">Tried {attempts === 1 ? 'once' : `${attempts} times`} on the saved card</p>
      )}
      {nextTryAt && <p className="text-muted">Next try {formatNzDate(nextTryAt)}</p>}
    </div>
  );
}

interface UnpaidChargesProps {
  filters: ExtraChargeFilters;
  onPage: (page: number) => void;
}

/**
 * Extra charges still unpaid on any booking (plan §8.1, items 6 and 11): fuel, cleaning, damage, extra
 * kilometres and the rest, while the saved card is tried and after it failed. The Guest has a link to pay
 * each one; staff follow up from the booking or its case.
 */
export function UnpaidCharges({ filters, onPage }: UnpaidChargesProps) {
  const charges = useUnpaidExtraCharges(filters);

  if (charges.isPending) return <ListSkeleton label="Loading unpaid extra charges" />;

  if (charges.isError) {
    return isForbidden(charges.error) ? (
      <EmptyList
        icon={<Lock />}
        title="Payments need the refunds permission"
        description="Ask the admin for the refunds permission to see payments."
      />
    ) : (
      <LoadError
        title="We couldn't load the unpaid extra charges"
        error={charges.error}
        onRetry={() => charges.refetch()}
        retrying={charges.isFetching}
      />
    );
  }

  if (charges.data.charges.length === 0) {
    return (
      <EmptyList
        icon={<CircleCheck />}
        title="No unpaid extra charges"
        description="Extra charges still being collected, or whose payment failed, show here."
      />
    );
  }

  return (
    <div aria-busy={charges.isPlaceholderData || undefined}>
      <DataTable label="Unpaid extra charges" className={cn(charges.isPlaceholderData && 'opacity-60')}>
        <thead>
          <tr>
            <Th>Added</Th>
            <Th>Booking</Th>
            <Th>Guest</Th>
            <Th>Charge</Th>
            <Th align="right">Amount</Th>
            <Th>Status</Th>
            <Th>Collecting it</Th>
            <Th>Case</Th>
          </tr>
        </thead>
        <tbody>
          {charges.data.charges.map((charge) => (
            <Tr key={charge.id}>
              <Td className="whitespace-nowrap">{formatNzDate(charge.createdAt)}</Td>
              <Td className="whitespace-nowrap">
                <Link to={`/admin/bookings/${charge.bookingRef}`} className={linkClasses}>
                  {charge.bookingRef}
                </Link>
              </Td>
              <Td className="whitespace-nowrap">
                <Link to={`/admin/users/${charge.guest.id}`} className={linkClasses}>
                  {charge.guest.name}
                </Link>
              </Td>
              <Td className="max-w-72 whitespace-normal">
                <p className="font-medium text-ink">{EXTRA_CHARGE_TYPE[charge.type]}</p>
                <p className="text-muted">{charge.description}</p>
              </Td>
              <Td align="right">{formatNzd(charge.amountCents)}</Td>
              <Td>
                <StatusBadge status={EXTRA_CHARGE_STATUS[charge.status]} />
              </Td>
              <Td>
                <Collection charge={charge} />
              </Td>
              <Td className="whitespace-nowrap">
                {charge.incidentRef ? (
                  <Link to={`/admin/incidents/${charge.incidentRef}`} className={linkClasses}>
                    {charge.incidentRef}
                  </Link>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </Td>
            </Tr>
          ))}
        </tbody>
      </DataTable>
      <Pagination
        page={charges.data.page}
        total={charges.data.total}
        pageSize={EXTRA_CHARGES_PAGE_SIZE}
        onChange={onPage}
        noun="unpaid extra charges"
        nounOne="unpaid extra charge"
      />
    </div>
  );
}
