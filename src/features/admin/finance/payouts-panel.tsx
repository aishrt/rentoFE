import { useQueryClient } from '@tanstack/react-query';
import { Lock, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { AdminPayout, AdminPayouts } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { HOLD_REASON, PAYOUT_STATUS, PAYOUT_TYPE } from '@/features/admin/ops/admin-labels';
import { DataTable, Pagination, Td, Th, Tr } from '@/features/admin/ops/admin-table';
import { EmptyList, ListSkeleton, LoadError } from '@/features/admin/ops/query-feedback';
import { adminDashboardQueryKey } from '@/features/admin/use-admin-overview';
import { useSession } from '@/features/auth/use-session';
import { StatusBadge } from '@/features/booking/booking-parts';
import { formatNzDate, formatNzd } from '@/features/booking/booking-format';
import { cn } from '@/lib/cn';
import {
  isForbidden,
  pageFrom,
  PAYOUTS_PAGE_SIZE,
  payoutsQueryKey,
  useAdminPayouts,
  type PayoutAction,
} from './finance-api';
import { PayoutActionDialog } from './payout-action-dialog';

const ALL = 'ALL';

const STATUS_OPTIONS = [
  { value: ALL, label: 'All payouts' },
  ...Object.entries(PAYOUT_STATUS).map(([value, status]) => ({ value, label: status.label })),
];

const statusFrom = (value: string | null) =>
  value && value in PAYOUT_STATUS ? (value as AdminPayout['status']) : undefined;

/** Holding is for payouts not yet paid; a held one is released, and a failed one sent again. */
const actionsFor = (payout: AdminPayout): PayoutAction[] => {
  if (payout.status === 'SCHEDULED') return ['hold'];
  if (payout.status === 'HELD') return ['release'];
  if (payout.status === 'FAILED') return ['retry', 'hold'];
  return [];
};

const ACTION_LABELS: Record<PayoutAction, string> = { hold: 'Hold', release: 'Release', retry: 'Retry' };

function doneToast(payout: AdminPayout, action: PayoutAction) {
  const name = payout.host.name;
  if (action === 'hold') {
    toast(`${name}’s payout is on hold`, { description: 'It isn’t sent until you release it.' });
  } else if (payout.status === 'HELD') {
    // Released, but a hold that still applies put it straight back.
    toast(`${name}’s payout is still on hold`, {
      description: `${payout.holdReason ? HOLD_REASON[payout.holdReason] : 'A hold still applies'}. It’s released once that’s sorted.`,
      tone: 'neutral',
    });
  } else if (action === 'release') {
    toast(`${name}’s payout is released`, { description: `It’s due ${formatNzDate(payout.scheduledFor)}.` });
  } else {
    toast(`${name}’s payout is queued again`, { description: 'Stripe tries the transfer again shortly.' });
  }
}

/** Host payouts (spec §18), with holds, releases and retries for the admin. */
export function PayoutsPanel() {
  const queryClient = useQueryClient();
  const isAdmin = useSession().data?.roles.includes('ADMIN') ?? false;
  const [searchParams, setSearchParams] = useSearchParams();
  const status = statusFrom(searchParams.get('status'));
  const page = pageFrom(searchParams.get('page'));
  const payouts = useAdminPayouts({ status, page });
  // Kept while the dialog closes, so its text doesn't change as it animates out.
  const [pending, setPending] = useState<{ action: PayoutAction; payout: AdminPayout } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const update = (changes: { status?: string; page?: string }) =>
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

  const start = (action: PayoutAction, payout: AdminPayout) => {
    setPending({ action, payout });
    setDialogOpen(true);
  };

  const done = (updated: AdminPayout, action: PayoutAction) => {
    setDialogOpen(false);
    doneToast(updated, action);
    // The row changes in place; other lists and the overview's queues load afresh when next opened.
    queryClient.setQueriesData<AdminPayouts>(
      { queryKey: payoutsQueryKey() },
      (previous) =>
        previous && {
          ...previous,
          payouts: previous.payouts.map((payout) => (payout.id === updated.id ? updated : payout)),
        },
    );
    void queryClient.invalidateQueries({ queryKey: payoutsQueryKey(), refetchType: 'none' });
    void queryClient.invalidateQueries({ queryKey: adminDashboardQueryKey() });
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="max-w-xl text-sm text-muted">
          Hosts are paid after each trip, less commission and any deductions. A payout waits while an incident
          or card dispute is open, or until the Host finishes their payout setup.
        </p>
        <Field label="Status" className="w-full sm:w-52">
          <Select
            value={status ?? ALL}
            onChange={(next) => update({ status: next === ALL ? undefined : next })}
            options={STATUS_OPTIONS}
            icon={<Wallet />}
            listLabel="Payout statuses"
          />
        </Field>
      </div>

      <div className="mt-6">
        {payouts.isPending && <ListSkeleton label="Loading payouts" />}

        {payouts.isError &&
          (isForbidden(payouts.error) ? (
            <EmptyList
              icon={<Lock />}
              title="Payouts need the refunds permission"
              description="Ask the admin for the refunds permission to see payouts."
            />
          ) : (
            <LoadError
              title="We couldn't load the payouts"
              error={payouts.error}
              onRetry={() => payouts.refetch()}
              retrying={payouts.isFetching}
            />
          ))}

        {payouts.data?.payouts.length === 0 && (
          <EmptyList
            title={status ? `No ${PAYOUT_STATUS[status].label.toLowerCase()} payouts` : 'No payouts yet'}
            description="Host payouts are scheduled when a booking is confirmed."
          />
        )}

        {payouts.data && payouts.data.payouts.length > 0 && (
          <div aria-busy={payouts.isPlaceholderData}>
            <DataTable label="Payouts" className={cn(payouts.isPlaceholderData && 'opacity-60')}>
              <thead>
                <tr>
                  <Th>Booking</Th>
                  <Th>Host</Th>
                  <Th>Type</Th>
                  <Th align="right">Amount</Th>
                  <Th align="right">Deductions</Th>
                  <Th>Status</Th>
                  <Th>Due</Th>
                  <Th>Paid</Th>
                  <Th>Failure</Th>
                  {isAdmin && (
                    <Th>
                      <span className="sr-only">Actions</span>
                    </Th>
                  )}
                </tr>
              </thead>
              <tbody>
                {payouts.data.payouts.map((payout) => (
                  <Tr key={payout.id}>
                    <Td className="whitespace-nowrap">
                      {payout.bookingRef ? (
                        <Link
                          to={`/admin/bookings/${payout.bookingRef}`}
                          className="rounded-inner font-medium text-primary hover:underline"
                        >
                          {payout.bookingRef}
                        </Link>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </Td>
                    <Td>
                      <Link
                        to={`/admin/users/${payout.host.id}`}
                        className="rounded-inner text-primary hover:underline"
                      >
                        {payout.host.name}
                      </Link>
                    </Td>
                    <Td className="whitespace-nowrap">{PAYOUT_TYPE[payout.type]}</Td>
                    <Td align="right">{formatNzd(payout.amountCents)}</Td>
                    <Td align="right">{payout.deductedCents > 0 ? formatNzd(payout.deductedCents) : '—'}</Td>
                    <Td>
                      <StatusBadge status={PAYOUT_STATUS[payout.status]} />
                      {payout.status === 'HELD' && payout.holdReason && (
                        <p className="mt-1 text-xs text-muted">{HOLD_REASON[payout.holdReason]}</p>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap">{formatNzDate(payout.scheduledFor)}</Td>
                    <Td className="whitespace-nowrap">
                      {payout.paidAt ? formatNzDate(payout.paidAt) : <span className="text-muted">—</span>}
                    </Td>
                    <Td>
                      {payout.failureReason ? (
                        <p className="max-w-64 whitespace-normal text-danger">{payout.failureReason}</p>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </Td>
                    {isAdmin && (
                      <Td>
                        <div className="flex justify-end gap-2">
                          {actionsFor(payout).map((action) => (
                            <Button
                              key={action}
                              variant="secondary"
                              size="sm"
                              onClick={() => start(action, payout)}
                            >
                              {ACTION_LABELS[action]}{' '}
                              <span className="sr-only">
                                payout for {payout.bookingRef || payout.host.name}
                              </span>
                            </Button>
                          ))}
                        </div>
                      </Td>
                    )}
                  </Tr>
                ))}
              </tbody>
            </DataTable>
            <Pagination
              page={payouts.data.page}
              total={payouts.data.total}
              pageSize={PAYOUTS_PAGE_SIZE}
              onChange={(next) => update({ page: next > 1 ? String(next) : undefined })}
              noun="payouts"
            />
          </div>
        )}
      </div>

      <PayoutActionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        action={pending?.action ?? null}
        payout={pending?.payout ?? null}
        onDone={done}
      />
    </div>
  );
}
