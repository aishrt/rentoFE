import { ChevronDown, CreditCard, Lock, Tag } from 'lucide-react';
import { useId, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { AdminPayment } from '@/api/types';
import { Field } from '@/components/ui/field';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { Select } from '@/components/ui/select';
import { tabId, tabPanelId } from '@/components/ui/tab-ids';
import { PAYMENT_STATUS, PAYMENT_TYPE } from '@/features/admin/ops/admin-labels';
import { DataTable, Pagination, Td, Th, Tr } from '@/features/admin/ops/admin-table';
import { EmptyList, ListSkeleton, LoadError } from '@/features/admin/ops/query-feedback';
import { StatusBadge } from '@/features/booking/booking-parts';
import { formatNzDate, formatNzd } from '@/features/booking/booking-format';
import { cn } from '@/lib/cn';
import { EXTRA_CHARGE_STATUS } from '@/features/admin/bookings/bookings-labels';
import {
  isForbidden,
  pageFrom,
  PAYMENTS_PAGE_SIZE,
  useAdminPayments,
  type ExtraChargeFilters,
  type PaymentFilters,
  type PaymentsTabView,
  type PaymentView,
} from './finance-api';
import { FUNDED_BY, PAYMENT_VIEWS, REFUND_STATUS, stripeText } from './finance-labels';
import { UnpaidCharges } from './unpaid-charges';

const VIEW_PREFIX = 'payment-view';
const ANY = 'ANY';
const COLUMNS = 9;

const TYPE_OPTIONS = [
  { value: ANY, label: 'All types' },
  ...Object.entries(PAYMENT_TYPE).map(([value, label]) => ({ value, label })),
];
const STATUS_OPTIONS = [
  { value: ANY, label: 'Any status' },
  ...Object.entries(PAYMENT_STATUS).map(([value, status]) => ({ value, label: status.label })),
];
const CHARGE_STATUSES = ['PENDING', 'FAILED'] as const;
const CHARGE_STATUS_OPTIONS = [
  { value: ANY, label: 'Any status' },
  ...CHARGE_STATUSES.map((value) => ({ value, label: EXTRA_CHARGE_STATUS[value].label })),
];

const EMPTY: Record<PaymentView, { title: string; description: string }> = {
  all: { title: 'No payments', description: 'Guests’ payments for bookings and extra charges show here.' },
  failed: { title: 'No failed payments', description: 'Payments that didn’t go through show here.' },
  disputed: {
    title: 'No disputed payments',
    description: 'Card disputes Guests raise with their bank show here.',
  },
  'refunds-failed': { title: 'No failed refunds', description: 'Refunds Stripe couldn’t send show here.' },
};

const viewFrom = (value: string | null): PaymentsTabView =>
  PAYMENT_VIEWS.find((view) => view.value === value)?.value ?? 'all';

const typeFrom = (value: string | null) =>
  value && value in PAYMENT_TYPE ? (value as AdminPayment['type']) : undefined;

const statusFrom = (value: string | null) =>
  value && value in PAYMENT_STATUS ? (value as AdminPayment['status']) : undefined;

const chargeStatusFrom = (value: string | null): ExtraChargeFilters['status'] =>
  CHARGE_STATUSES.find((status) => status === value);

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** A failed payment's reason, and a card dispute with its reason and the date to respond by. */
function PaymentProblem({ payment }: { payment: AdminPayment }) {
  const { dispute, failureReason } = payment;
  if (!dispute && !failureReason) return <span className="text-muted">—</span>;
  return (
    <div className="grid max-w-64 gap-1 whitespace-normal">
      {failureReason && <p className="text-danger">{failureReason}</p>}
      {dispute && (
        <div>
          <p className="font-medium text-danger">Dispute: {stripeText(dispute.status)}</p>
          {dispute.reason && <p className="text-muted">{stripeText(dispute.reason)}</p>}
          {dispute.dueBy && <p className="text-muted">Respond by {formatNzDate(dispute.dueBy)}</p>}
        </div>
      )}
    </div>
  );
}

function PaymentRow({ payment }: { payment: AdminPayment }) {
  const [open, setOpen] = useState(false);
  const refundsId = useId();
  const refunds = payment.refunds;
  const failed = refunds.filter((refund) => refund.status === 'FAILED').length;

  return (
    <>
      <Tr>
        <Td className="whitespace-nowrap">{formatNzDate(payment.createdAt)}</Td>
        <Td className="whitespace-nowrap">
          {payment.bookingRef ? (
            <Link
              to={`/admin/bookings/${payment.bookingRef}`}
              className="rounded-inner font-medium text-primary hover:underline"
            >
              {payment.bookingRef}
            </Link>
          ) : (
            <span className="text-muted">—</span>
          )}
        </Td>
        <Td>{payment.guestName}</Td>
        <Td className="whitespace-nowrap">{PAYMENT_TYPE[payment.type]}</Td>
        <Td align="right">{formatNzd(payment.amountCents)}</Td>
        <Td align="right">
          <p>{payment.refundedCents > 0 ? formatNzd(payment.refundedCents) : '—'}</p>
          {refunds.length > 0 && (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={refundsId}
              onClick={() => setOpen((current) => !current)}
              className="mt-1 inline-flex min-h-8 items-center gap-1 rounded-inner text-xs font-medium text-primary hover:underline"
            >
              {plural(refunds.length, 'refund', 'refunds')}
              {failed > 0 && (
                <>
                  {' '}
                  <span className="text-danger">({failed} failed)</span>
                </>
              )}
              <ChevronDown
                aria-hidden="true"
                className={cn('size-3.5 transition-transform duration-200', open && 'rotate-180')}
              />
            </button>
          )}
        </Td>
        <Td>
          <StatusBadge status={PAYMENT_STATUS[payment.status]} />
        </Td>
        <Td className="whitespace-nowrap">{payment.method ?? <span className="text-muted">—</span>}</Td>
        <Td>
          <PaymentProblem payment={payment} />
        </Td>
      </Tr>
      {refunds.length > 0 && (
        <tr id={refundsId} hidden={!open}>
          <td colSpan={COLUMNS} className="px-4 pb-4">
            <ul
              aria-label={`Refunds on ${payment.bookingRef || 'this payment'}`}
              className="grid gap-2 rounded-inner bg-ink/3 p-3"
            >
              {refunds.map((refund, index) => (
                <li
                  key={`${refund.at}-${index}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
                >
                  <span className="font-medium tabular-nums">{formatNzd(refund.amountCents)}</span>
                  <StatusBadge status={REFUND_STATUS[refund.status]} />
                  <span className="whitespace-nowrap">{formatNzDate(refund.at)}</span>
                  <span className="text-muted">{FUNDED_BY[refund.fundedBy]}</span>
                  <span className="max-w-md whitespace-normal">{refund.reason}</span>
                  {refund.failureReason && (
                    <span className="max-w-md whitespace-normal text-danger">{refund.failureReason}</span>
                  )}
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}

/** Guests' payments in one view (spec §18): a page of them, each with any failure, dispute and refunds. */
function PaymentsList({ filters, onPage }: { filters: PaymentFilters; onPage: (page: number) => void }) {
  const payments = useAdminPayments(filters);

  if (payments.isPending) return <ListSkeleton label="Loading payments" />;

  if (payments.isError) {
    return isForbidden(payments.error) ? (
      <EmptyList
        icon={<Lock />}
        title="Payments need the refunds permission"
        description="Ask the admin for the refunds permission to see payments."
      />
    ) : (
      <LoadError
        title="We couldn't load the payments"
        error={payments.error}
        onRetry={() => payments.refetch()}
        retrying={payments.isFetching}
      />
    );
  }

  if (payments.data.payments.length === 0) {
    return <EmptyList title={EMPTY[filters.view].title} description={EMPTY[filters.view].description} />;
  }

  return (
    <div aria-busy={payments.isPlaceholderData}>
      <DataTable label="Payments" className={cn(payments.isPlaceholderData && 'opacity-60')}>
        <thead>
          <tr>
            <Th>Date</Th>
            <Th>Booking</Th>
            <Th>Guest</Th>
            <Th>Type</Th>
            <Th align="right">Amount</Th>
            <Th align="right">Refunded</Th>
            <Th>Status</Th>
            <Th>Method</Th>
            <Th>Failure or dispute</Th>
          </tr>
        </thead>
        <tbody>
          {payments.data.payments.map((payment) => (
            <PaymentRow key={payment.id} payment={payment} />
          ))}
        </tbody>
      </DataTable>
      <Pagination
        page={payments.data.page}
        total={payments.data.total}
        pageSize={PAYMENTS_PAGE_SIZE}
        onChange={onPage}
        noun="payments"
      />
    </div>
  );
}

/**
 * Guests' payments (spec §18): all, failed, disputed, or with a refund that failed; and the extra charges
 * on any booking still to be paid (plan §8.1, item 6).
 */
export function PaymentsPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = viewFrom(searchParams.get('view'));
  const charges = view === 'unpaid-charges';
  const type = typeFrom(searchParams.get('type'));
  const status = view === 'all' ? statusFrom(searchParams.get('status')) : undefined;
  const chargeStatus = charges ? chargeStatusFrom(searchParams.get('status')) : undefined;
  const page = pageFrom(searchParams.get('page'));

  /** Changes filters in the address; any change but the page's goes back to page 1. */
  const update = (changes: Record<string, string | undefined>) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        if (!('page' in changes)) next.delete('page');
        return next;
      },
      { replace: true },
    );
  const onPage = (next: number) => update({ page: next > 1 ? String(next) : undefined });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-6">
        {/*
          The views scroll sideways on a narrow phone. The padding leaves room for the tabs' shadow, which the
          scroller would clip, and the negative margins take that room back.
        */}
        <div className="scrollbar-subtle relative -mx-4 -mt-2 -mb-6 min-w-0 overflow-x-auto px-4 pt-2 pb-6">
          <SegmentedTabs
            idPrefix={VIEW_PREFIX}
            label="Which payments"
            options={PAYMENT_VIEWS}
            value={view}
            // Extra charges have no payment type, and their own statuses.
            onChange={(next) =>
              update({
                view: next === 'all' ? undefined : next,
                status: undefined,
                ...(next === 'unpaid-charges' && { type: undefined }),
              })
            }
            className="min-w-max"
          />
        </div>
        {charges ? (
          <Field label="Status" className="w-full sm:w-56">
            <Select
              value={chargeStatus ?? ANY}
              onChange={(next) => update({ status: next === ANY ? undefined : next })}
              options={CHARGE_STATUS_OPTIONS}
              icon={<CreditCard />}
              listLabel="Extra charge statuses"
            />
          </Field>
        ) : (
          <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
            <Field label="Type" className="sm:w-48">
              <Select
                value={type ?? ANY}
                onChange={(next) => update({ type: next === ANY ? undefined : next })}
                options={TYPE_OPTIONS}
                icon={<Tag />}
                listLabel="Payment types"
              />
            </Field>
            {view === 'all' && (
              <Field label="Status" className="sm:w-48">
                <Select
                  value={status ?? ANY}
                  onChange={(next) => update({ status: next === ANY ? undefined : next })}
                  options={STATUS_OPTIONS}
                  icon={<CreditCard />}
                  listLabel="Payment statuses"
                />
              </Field>
            )}
          </div>
        )}
      </div>

      <div
        role="tabpanel"
        id={tabPanelId(VIEW_PREFIX, view)}
        aria-labelledby={tabId(VIEW_PREFIX, view)}
        className="mt-6"
      >
        {charges ? (
          <UnpaidCharges filters={{ status: chargeStatus, page }} onPage={onPage} />
        ) : (
          <PaymentsList filters={{ view, type, status, page }} onPage={onPage} />
        )}
      </div>
    </div>
  );
}
