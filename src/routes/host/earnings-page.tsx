import {
  ArrowDownToLine,
  Banknote,
  CalendarDays,
  CalendarRange,
  CircleCheck,
  Clock,
  ExternalLink,
  Landmark,
  PiggyBank,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { EarningsRow, HostPayout, PayoutAccount } from '@/api/types';
import { PageBackdrop } from '@/components/brand/page-backdrop';
import { ParkingBays } from '@/components/brand/patterns/parking-bays';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard, StatCardSkeleton } from '@/components/ui/stat-card';
import { toast } from '@/components/ui/toast';
import { RequireSignedIn } from '@/features/auth/require-signed-in';
import { formatNzDate, formatNzd } from '@/features/booking/booking-format';
import { EarningsChart } from '@/features/host/earnings-chart';
import {
  downloadStatement,
  useEarnings,
  useHostPayouts,
  useOpenStripeDashboard,
  useStartPayoutSetup,
  useSyncPayoutAccount,
} from '@/features/host/earnings-api';
import { HostPageHeader, HostSubNav } from '@/features/host/host-nav';

const HOLD_WORDS: Record<NonNullable<HostPayout['holdReason']>, string> = {
  PAYOUT_SETUP: 'Waiting for your payout setup',
  TRIP_NOT_STARTED: 'Waiting for check-in',
  INCIDENT: 'Held while an incident is open',
  DISPUTE: 'Held during a card dispute',
  SUSPENDED: 'Held while the account is suspended',
  MANUAL: 'Held while our team checks something',
};

const TYPE_WORDS: Record<HostPayout['type'], string> = {
  TRIP: 'Trip',
  CANCELLATION_FEE: 'Cancellation fee',
  EXTRA_CHARGE: 'Extra charge',
};

function PayoutSetup({ account }: { account: PayoutAccount }) {
  const start = useStartPayoutSetup();
  const dashboard = useOpenStripeDashboard();

  if (account.payoutsEnabled) {
    return (
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
          <div>
            <p className="font-semibold text-ink">Payouts are set up</p>
            <p className="text-sm text-muted">
              You’re paid 24 hours after each trip starts. Stripe pays your bank
              {account.bankDays !== undefined
                ? ` about ${account.bankDays} business days later`
                : ' a few days later'}
              .
            </p>
          </div>
        </div>
        <Button variant="secondary" loading={dashboard.isPending} onClick={() => dashboard.mutate()}>
          <ExternalLink aria-hidden="true" />
          Bank details in Stripe
        </Button>
      </Card>
    );
  }
  return (
    <Alert
      variant="info"
      title={account.connected ? 'Finish your payout setup' : 'Set up payouts to get paid'}
      action={
        <Button loading={start.isPending} onClick={() => start.mutate()}>
          <Landmark aria-hidden="true" />
          {account.connected ? 'Continue payout setup' : 'Set up payouts'}
        </Button>
      }
    >
      <p>
        Stripe, our payments partner, pays your earnings into your bank account. It takes a few minutes: your
        bank details and a quick identity check. Approved listings go live once it’s done.
      </p>
      {account.requirements.length > 0 && (
        <p className="mt-2">Still needed: {account.requirements.join(', ')}.</p>
      )}
      {start.isError && <p className="mt-2 text-danger">{start.error.message}</p>}
    </Alert>
  );
}

function PayoutRow({ payout }: { payout: HostPayout }) {
  const deducted = payout.deductions.reduce((sum, deduction) => sum + deduction.amountCents, 0);
  return (
    <li className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-ink">
          {payout.booking.vehicleTitle}
          <span className="ml-2 text-sm font-normal text-muted">
            {TYPE_WORDS[payout.type]} · {payout.booking.ref}
          </span>
        </p>
        <p className="text-sm text-muted">
          {payout.status === 'PAID' && payout.paidAt
            ? `Sent ${formatNzDate(payout.paidAt)}${payout.expectedInBankBy ? `, usually in your bank by ${formatNzDate(payout.expectedInBankBy)}` : ''}`
            : payout.status === 'HELD' && payout.holdReason
              ? HOLD_WORDS[payout.holdReason]
              : payout.status === 'FAILED'
                ? 'Didn’t go through: our team is on it'
                : `Due ${formatNzDate(payout.scheduledFor)}`}
          {deducted > 0 && ` · ${formatNzd(deducted)} deducted`}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {payout.status === 'HELD' ? (
          <Badge variant="outline">
            <Clock aria-hidden="true" />
            Held
          </Badge>
        ) : payout.status === 'PAID' ? (
          <Badge variant="primary">Paid</Badge>
        ) : (
          <Badge variant="neutral">Upcoming</Badge>
        )}
        <p className="w-24 text-right font-semibold text-ink tabular-nums">{formatNzd(payout.amountCents)}</p>
      </div>
    </li>
  );
}

function BookingsTable({ rows }: { rows: EarningsRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted">No trips this month yet.</p>;
  return (
    <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[38rem] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-muted">
            <th scope="col" className="py-2 pr-3 font-medium">
              Trip
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">
              Earned
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">
              Commission
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">
              Deductions
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Net
            </th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map((row) => {
            const earned = row.rentalCents + row.deliveryCents + row.extraChargesCents + row.keptFeeCents;
            const deductions = row.hostFundedRefundsCents + row.hostCancellationFeeCents;
            return (
              <tr key={row.ref} className="border-b border-line/60 align-top">
                <th scope="row" className="py-3 pr-3 text-left font-normal">
                  <Link to={`/host/bookings/${row.ref}`} className="link-underline font-medium text-ink">
                    {row.vehicleTitle}
                  </Link>
                  <span className="block text-xs text-muted">
                    {formatNzDate(row.start)} · {row.ref}
                    {row.status === 'CANCELLED' && ' · Cancelled'}
                  </span>
                </th>
                <td className="py-3 pr-3 text-right text-ink">{formatNzd(earned)}</td>
                <td className="py-3 pr-3 text-right text-muted">−{formatNzd(row.commissionCents)}</td>
                <td className="py-3 pr-3 text-right text-muted">
                  {deductions > 0 ? `−${formatNzd(deductions)}` : '–'}
                </td>
                <td className="py-3 text-right font-semibold text-ink">{formatNzd(row.netCents)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** The months and NZ tax years (1 April to 31 March) a statement can cover, newest first. */
function statementChoices(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland' }).format(now).split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const months = Array.from({ length: 24 }, (_, back) => {
    const index = year * 12 + (month - 1) - back;
    const key = `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
    const label = new Intl.DateTimeFormat('en-NZ', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${key}-01T00:00:00Z`));
    return { value: key, label };
  });
  const currentTaxYearEnd = month >= 4 ? year + 1 : year;
  const taxYears = [0, 1, 2].map((back) => {
    const end = currentTaxYearEnd - back;
    return { value: String(end), label: `Tax year 1 Apr ${end - 1} – 31 Mar ${end}` };
  });
  return [...taxYears, ...months];
}

function Statement() {
  const choices = statementChoices();
  const [period, setPeriod] = useState(choices[3]!.value);
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    try {
      await downloadStatement(period);
    } catch (error) {
      toast('We couldn’t download the statement', {
        description: error instanceof Error ? error.message : 'Please try again.',
        tone: 'danger',
      });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="grid gap-4 p-5 sm:p-6">
      <div>
        <h2 className="font-semibold text-ink">Earnings statement</h2>
        <p className="mt-1 text-sm text-muted">
          A spreadsheet (CSV) for your records and tax return: rental, delivery, extra charges, commission,
          deductions and GST in separate columns.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Select
          value={period}
          onChange={setPeriod}
          options={choices}
          icon={<CalendarRange aria-hidden="true" />}
          listLabel="Statement periods"
          className="sm:max-w-xs"
        />
        <Button variant="secondary" loading={busy} onClick={() => void download()}>
          <ArrowDownToLine aria-hidden="true" />
          Download statement
        </Button>
      </div>
    </Card>
  );
}

function Earnings() {
  const earnings = useEarnings();
  const payouts = useHostPayouts();
  const sync = useSyncPayoutAccount();
  const [params, setParams] = useSearchParams();
  const synced = useRef(false);

  // Back from Stripe's setup pages: read the account now rather than wait for Stripe's message.
  const returned = params.get('payouts');
  useEffect(() => {
    if (!returned || synced.current) return;
    synced.current = true;
    sync.mutate(undefined, {
      onSuccess: (account) => {
        if (account.payoutsEnabled)
          toast('Payouts are set up', { description: 'You’ll be paid after each trip.' });
        setParams({}, { replace: true });
      },
    });
  }, [returned, sync, setParams]);

  const error = earnings.error ?? payouts.error;
  if (error) {
    return (
      <Alert
        variant="danger"
        role="alert"
        title="We couldn’t load your earnings"
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void earnings.refetch();
              void payouts.refetch();
            }}
          >
            Try again
          </Button>
        }
      >
        {error.message}
      </Alert>
    );
  }
  if (!earnings.data || !payouts.data) return <EarningsSkeleton />;
  const { summary } = earnings.data;
  const change =
    summary.previousMonthCents > 0
      ? Math.round(((summary.monthCents - summary.previousMonthCents) / summary.previousMonthCents) * 100)
      : null;
  const upcoming = payouts.data.payouts.filter((payout) => payout.status !== 'PAID');
  const paid = payouts.data.payouts.filter((payout) => payout.status === 'PAID').slice(0, 12);
  const nzMonth = (instant: Date) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland' }).format(instant).slice(0, 7);
  const thisMonth = earnings.data.bookings.filter(
    (row) => nzMonth(new Date(row.start)) === nzMonth(new Date()),
  );

  return (
    <div className="grid gap-8">
      <PayoutSetup account={payouts.data.account} />

      <section aria-label="Your earnings" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Today" icon={CalendarDays} value={summary.todayCents} format={formatNzd} />
        <StatCard
          label="This week"
          icon={CalendarRange}
          value={summary.weekCents}
          format={formatNzd}
          hint="Monday to Sunday"
        />
        <StatCard
          label="This month"
          icon={TrendingUp}
          value={summary.monthCents}
          format={formatNzd}
          hint={
            change === null
              ? 'Nothing last month to compare'
              : `${change >= 0 ? '+' : '−'}${Math.abs(change)}% on last month`
          }
        />
        <StatCard label="All time" icon={PiggyBank} value={summary.lifetimeCents} format={formatNzd} />
      </section>
      <p className="-mt-4 text-xs text-muted">
        Earnings count on each trip’s start date (NZ time), after the platform commission, Host-funded refunds
        and Host cancellation fees.
      </p>

      <Card className="grid gap-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold text-ink">Earnings by month</h2>
          <p className="text-sm text-muted">
            Platform fees this month: {formatNzd(summary.platformFeesMonthCents)}
          </p>
        </div>
        <EarningsChart months={earnings.data.months} />
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="flex items-center gap-2 font-semibold text-ink">
              <Wallet aria-hidden="true" className="size-4.5 text-primary" />
              Upcoming payouts
            </h2>
            <p className="font-semibold text-ink tabular-nums">{formatNzd(summary.upcomingPayoutsCents)}</p>
          </div>
          {upcoming.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              Nothing waiting. Payouts are sent 24 hours after each trip starts.
            </p>
          ) : (
            <ul className="divide-y divide-line/70">
              {upcoming.map((payout) => (
                <PayoutRow key={payout.id} payout={payout} />
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-semibold text-ink">
            <Banknote aria-hidden="true" className="size-4.5 text-primary" />
            Paid
          </h2>
          {paid.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Your paid payouts will show here.</p>
          ) : (
            <ul className="divide-y divide-line/70">
              {paid.map((payout) => (
                <PayoutRow key={payout.id} payout={payout} />
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="grid gap-4 p-5 sm:p-6">
        <h2 className="font-semibold text-ink">This month’s trips</h2>
        <BookingsTable rows={thisMonth} />
      </Card>

      <Statement />
    </div>
  );
}

function EarningsSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-8">
      <Skeleton className="h-24 rounded-card" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <StatCardSkeleton key={index} />
        ))}
      </div>
      <Skeleton className="h-72 rounded-card" />
    </div>
  );
}

/**
 * The Host's earnings (spec §9, plan §12.6): payout setup, today, this week, this month against last month
 * and all time, the monthly chart, payouts upcoming and paid with their bank dates, this month's trips and
 * the GST-ready statement.
 */
export function EarningsPage() {
  return (
    <Container className="max-w-5xl py-8 sm:py-12">
      <PageBackdrop art={ParkingBays} />
      <PageMeta title="Earnings" noindex />
      <div className="grid gap-8">
        <HostSubNav />
        <HostPageHeader
          eyebrow="Hosting"
          title="Earnings"
          description="What you’ve earned, and when it’s paid."
        />
        <RequireSignedIn fallback={<EarningsSkeleton />}>{() => <Earnings />}</RequireSignedIn>
      </div>
    </Container>
  );
}
