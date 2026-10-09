import { CircleDollarSign, HandCoins, ListFilter, Lock, RefreshCw, Search, Undo2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  isForbidden,
  pageFrom,
  REFUNDS_PAGE_SIZE,
  useAdminRefunds,
  type AdminRefundRow,
  type RefundFilters,
} from '@/features/admin/finance/finance-api';
import { FUNDED_BY, REFUND_KIND, REFUND_STATUS } from '@/features/admin/finance/finance-labels';
import { PAYMENT_TYPE } from '@/features/admin/ops/admin-labels';
import { AdminPageHeader } from '@/features/admin/ops/admin-page-header';
import { DataTable, Pagination, Td, Th, Tr } from '@/features/admin/ops/admin-table';
import { EmptyList, ListSkeleton, LoadError } from '@/features/admin/ops/query-feedback';
import { formatNzDate, formatNzd } from '@/features/booking/booking-format';
import { StatusBadge } from '@/features/booking/booking-parts';
import { cn } from '@/lib/cn';

const ANY = '';

const STATUSES = Object.keys(REFUND_STATUS) as AdminRefundRow['status'][];
const FUNDERS = Object.keys(FUNDED_BY) as AdminRefundRow['fundedBy'][];
const KINDS = Object.keys(REFUND_KIND) as NonNullable<AdminRefundRow['kind']>[];

const STATUS_OPTIONS = [
  { value: ANY, label: 'Any status' },
  ...STATUSES.map((status) => ({ value: status, label: REFUND_STATUS[status].label })),
];
const FUNDER_OPTIONS = [
  { value: ANY, label: 'Anyone' },
  ...FUNDERS.map((funder) => ({ value: funder, label: FUNDED_BY[funder] })),
];
const KIND_OPTIONS = [
  { value: ANY, label: 'Any reason' },
  ...KINDS.map((kind) => ({ value: kind, label: REFUND_KIND[kind] })),
];

const pick = <Value extends string>(values: readonly Value[], value: string | null) =>
  values.find((candidate) => candidate === value);

/** The filters in the address (?q=…&status=…&fundedBy=…&kind=…&page=…), so a link or Back keeps them. */
function filtersFrom(params: URLSearchParams): RefundFilters {
  return {
    q: params.get('q')?.trim().slice(0, 20) ?? '',
    status: pick(STATUSES, params.get('status')),
    fundedBy: pick(FUNDERS, params.get('fundedBy')),
    kind: pick(KINDS, params.get('kind')),
    page: pageFrom(params.get('page')),
  };
}

function filtersToParams(filters: RefundFilters): Record<string, string> {
  return Object.fromEntries(
    Object.entries({
      q: filters.q,
      status: filters.status ?? '',
      fundedBy: filters.fundedBy ?? '',
      kind: filters.kind ?? '',
      page: filters.page > 1 ? String(filters.page) : '',
    }).filter(([, value]) => value !== ''),
  );
}

const hasFilters = (filters: RefundFilters) =>
  Boolean(filters.q || filters.status || filters.fundedBy || filters.kind);

/**
 * Refunds (plan §12.6; §8.1, items 10, 15 and 21): every refund to a Guest's card, newest first, with why it
 * was made, who funds it and who issued it. A Host-funded one shows how it was recovered from the Host, and a
 * failed one why, so the money can go back another way. Like payments, it needs the refunds permission.
 */
export function AdminRefundsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = filtersFrom(searchParams);
  const refunds = useAdminRefunds(filters);
  const forbidden = refunds.isError && isForbidden(refunds.error);

  // Any change but the page starts again from page 1.
  const update = (change: Partial<RefundFilters>) =>
    setSearchParams(filtersToParams({ ...filters, page: 1, ...change }), { replace: true });

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        eyebrow="Finance"
        title="Refunds"
        description="Every refund to a Guest’s card, newest first: why it was made, who funds it and who issued it. Open the booking to see its whole record or refund again."
        actions={
          refunds.data && (
            <IconButton
              label="Refresh the list"
              onClick={() => refunds.refetch()}
              disabled={refunds.isFetching}
            >
              <RefreshCw aria-hidden="true" className={refunds.isFetching ? 'animate-spin' : undefined} />
            </IconButton>
          )
        }
      />

      {forbidden ? (
        <EmptyList
          icon={<Lock />}
          title="Refunds need the refunds permission"
          description="Ask the admin for the refunds permission to see refunds."
        />
      ) : (
        <>
          <Filters key={filters.q} filters={filters} onChange={update} />

          <div className="mt-6">
            {refunds.isPending && <ListSkeleton label="Loading refunds" rows={8} />}

            {refunds.isError && (
              <LoadError
                title="We couldn’t load the refunds"
                error={refunds.error}
                onRetry={() => refunds.refetch()}
                retrying={refunds.isFetching}
              />
            )}

            {refunds.data?.refunds.length === 0 &&
              (hasFilters(filters) ? (
                <EmptyList
                  icon={<Search />}
                  title="No refunds match"
                  description="Check the booking reference, or try fewer filters."
                />
              ) : (
                <EmptyList
                  icon={<Undo2 />}
                  title="No refunds yet"
                  description="Refunds show here as soon as one is made, by a cancellation or by staff."
                />
              ))}

            {refunds.data && refunds.data.refunds.length > 0 && (
              <div aria-busy={refunds.isPlaceholderData || undefined}>
                <RefundsTable
                  refunds={refunds.data.refunds}
                  className={cn('transition-opacity duration-200', refunds.isPlaceholderData && 'opacity-60')}
                />
                <Pagination
                  page={refunds.data.page}
                  total={refunds.data.total}
                  pageSize={REFUNDS_PAGE_SIZE}
                  noun="refunds"
                  onChange={(page) => update({ page })}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Filters({
  filters,
  onChange,
}: {
  filters: RefundFilters;
  onChange: (change: Partial<RefundFilters>) => void;
}) {
  // Typing doesn't search on every letter: Enter or Search does.
  const [text, setText] = useState(filters.q);
  const search = (event: FormEvent) => {
    event.preventDefault();
    onChange({ q: text.trim() });
  };

  return (
    <div className="mt-8 grid gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_11rem_12rem_14rem] lg:items-end">
        <form role="search" onSubmit={search} className="flex items-end gap-2">
          <Field label="Booking reference" className="min-w-0 flex-1">
            <Input
              type="search"
              value={text}
              maxLength={20}
              onChange={(event) => setText(event.target.value)}
              placeholder="RV-7K2Q9M, or part of it"
              leadingIcon={<Search />}
              enterKeyHint="search"
            />
          </Field>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
        <Field label="Status">
          <Select
            value={filters.status ?? ANY}
            onChange={(value) => onChange({ status: pick(STATUSES, value) })}
            options={STATUS_OPTIONS}
            icon={<ListFilter />}
            listLabel="Refund statuses"
          />
        </Field>
        <Field label="Funded by">
          <Select
            value={filters.fundedBy ?? ANY}
            onChange={(value) => onChange({ fundedBy: pick(FUNDERS, value) })}
            options={FUNDER_OPTIONS}
            icon={<HandCoins />}
            listLabel="Who funds the refund"
          />
        </Field>
        <Field label="Why">
          <Select
            value={filters.kind ?? ANY}
            onChange={(value) => onChange({ kind: pick(KINDS, value) })}
            options={KIND_OPTIONS}
            icon={<CircleDollarSign />}
            listLabel="Why the refund was made"
          />
        </Field>
      </div>
      {hasFilters(filters) && (
        <Button
          variant="ghost"
          size="sm"
          className="justify-self-start"
          onClick={() => onChange({ q: '', status: undefined, fundedBy: undefined, kind: undefined })}
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}

/**
 * How a Host-funded refund came back from the Host (plan §8.1, item 15): off a payout, back from a paid
 * transfer, or still owed from their next payout.
 */
function HostRecovery({ recovery }: { recovery: NonNullable<AdminRefundRow['hostRecovery']> }) {
  const parts = [
    recovery.deductedCents > 0 && `${formatNzd(recovery.deductedCents)} taken off a payout`,
    recovery.reversedCents > 0 && `${formatNzd(recovery.reversedCents)} taken back from a paid transfer`,
    recovery.owedCents > 0 && `${formatNzd(recovery.owedCents)} still owed, off their next payout`,
  ].filter((part): part is string => Boolean(part));
  if (parts.length === 0) return null;
  return (
    <ul aria-label="How the Host repaid it" className="mt-1 grid gap-0.5 text-xs text-muted">
      {parts.map((part) => (
        <li key={part}>{part}</li>
      ))}
    </ul>
  );
}

function RefundsTable({ refunds, className }: { refunds: AdminRefundRow[]; className?: string }) {
  return (
    <DataTable label="Refunds" className={className}>
      <thead>
        <tr>
          <Th>Date</Th>
          <Th>Booking</Th>
          <Th>Guest</Th>
          <Th align="right">Amount</Th>
          <Th>Why</Th>
          <Th>Funded by</Th>
          <Th>Status</Th>
          <Th>Issued by</Th>
        </tr>
      </thead>
      <tbody>
        {refunds.map((refund) => (
          <Tr key={refund.id}>
            <Td className="whitespace-nowrap">{formatNzDate(refund.createdAt)}</Td>
            <Td className="whitespace-nowrap">
              {refund.bookingRef ? (
                <Link
                  to={`/admin/bookings/${refund.bookingRef}`}
                  className="rounded-inner font-semibold text-primary hover:underline"
                >
                  {refund.bookingRef}
                </Link>
              ) : (
                <span className="text-muted">—</span>
              )}
              {refund.paymentType !== 'BOOKING' && (
                <p className="mt-0.5 text-xs text-muted">{PAYMENT_TYPE[refund.paymentType]}</p>
              )}
            </Td>
            <Td className="whitespace-nowrap">
              {refund.guest.id ? (
                <Link
                  to={`/admin/users/${refund.guest.id}`}
                  className="rounded-inner text-primary hover:underline"
                >
                  {refund.guest.name}
                </Link>
              ) : (
                refund.guest.name
              )}
            </Td>
            <Td align="right">{formatNzd(refund.amountCents)}</Td>
            <Td className="max-w-72 whitespace-normal">
              {refund.kind && <p className="font-medium text-ink">{REFUND_KIND[refund.kind]}</p>}
              <p className="text-muted">{refund.reason}</p>
            </Td>
            <Td className="max-w-64 whitespace-normal">
              <p>{FUNDED_BY[refund.fundedBy]}</p>
              {refund.hostRecovery && <HostRecovery recovery={refund.hostRecovery} />}
            </Td>
            <Td className="max-w-56 whitespace-normal">
              <StatusBadge status={REFUND_STATUS[refund.status]} />
              {refund.failureReason && <p className="mt-1 text-danger">{refund.failureReason}</p>}
            </Td>
            <Td className="whitespace-nowrap">
              {/* Cancellation refunds come with the cancellation, whoever made it. */}
              {refund.issuedBy?.name ?? <span className="text-muted">—</span>}
            </Td>
          </Tr>
        ))}
      </tbody>
    </DataTable>
  );
}
