import { Download, Printer, ReceiptText } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError } from '@/api/client';
import type { Receipt } from '@/api/types';
import { PageBackdrop } from '@/components/brand/page-backdrop';
import { TripRoute } from '@/components/brand/patterns/trip-route';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { BackLink } from '@/components/ui/back-link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { downloadReceiptPdf, useReceipt } from '@/features/account/dashboard-api';
import { RequireSignedIn } from '@/features/auth/require-signed-in';
import {
  formatDays,
  formatNzDateTimeWithYear,
  formatNzNumericDate,
  formatNzd,
} from '@/features/booking/booking-format';
import { cn } from '@/lib/cn';

function Heading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="eyebrow mb-2 text-muted">
      {children}
    </h2>
  );
}

function Row({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className={cn('flex items-baseline justify-between gap-6 py-1', muted && 'text-muted')}>
      <dt className={cn(strong && 'font-semibold text-ink')}>{label}</dt>
      <dd className={cn('text-right tabular-nums', strong ? 'font-semibold text-ink' : !muted && 'text-ink')}>
        {value}
      </dd>
    </div>
  );
}

/** The receipt as a document: the same parts, in the same order, as its PDF. */
function ReceiptDocument({ receipt }: { receipt: Receipt }) {
  return (
    <Card className="grid gap-8 p-6 text-sm sm:p-10 print:border-0 print:p-0 print:shadow-none">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="headline text-2xl font-medium text-primary">{receipt.supplier.name}</p>
          {receipt.supplier.gstNumber && (
            <p className="mt-1 text-muted">GST number {receipt.supplier.gstNumber}</p>
          )}
          <p className="text-muted">{receipt.supplier.email}</p>
        </div>
        <div className="sm:text-right">
          <p className="text-xl font-semibold text-ink">Receipt</p>
          <p className="text-muted">{receipt.ref}</p>
        </div>
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        <section aria-labelledby="receipt-billed">
          <Heading id="receipt-billed">Billed to</Heading>
          <p className="text-ink">{receipt.customer.name}</p>
          {receipt.customer.email && <p className="text-muted">{receipt.customer.email}</p>}
        </section>
        <section aria-labelledby="receipt-details">
          <Heading id="receipt-details">Details</Heading>
          <dl>
            <Row label="Receipt number" value={receipt.ref} />
            <Row label="Date paid" value={formatNzNumericDate(receipt.paidAt)} />
            <Row label="Paid with" value={receipt.paidWith} />
          </dl>
        </section>
      </div>

      <section aria-labelledby="receipt-trip">
        <Heading id="receipt-trip">Trip</Heading>
        <p className="font-semibold text-ink">{receipt.vehicleTitle}</p>
        <p className="text-muted">
          {formatNzDateTimeWithYear(receipt.start)} to {formatNzDateTimeWithYear(receipt.end)} (NZ time),{' '}
          {formatDays(receipt.days)}
        </p>
      </section>

      <section aria-labelledby="receipt-charges">
        <Heading id="receipt-charges">Charges</Heading>
        <dl>
          {receipt.lines.map((line, index) => (
            <Row key={index} label={line.label} value={formatNzd(line.amountCents)} />
          ))}
        </dl>
        <dl className="mt-3 border-t border-line pt-3">
          <Row label="Total (NZD)" value={formatNzd(receipt.totalCents)} strong />
          <Row label={`GST included (${receipt.gstRatePct}%)`} value={formatNzd(receipt.gstCents)} muted />
        </dl>
      </section>

      {receipt.refunds.length > 0 && (
        <section aria-labelledby="receipt-refunds">
          <Heading id="receipt-refunds">Refunds</Heading>
          <dl>
            {receipt.refunds.map((refund, index) => (
              <Row
                key={index}
                label={`Refund, ${formatNzNumericDate(refund.at)}${refund.status === 'PENDING' ? ' (on its way)' : refund.status === 'FAILED' ? ' (failed)' : ''}`}
                value={formatNzd(-refund.amountCents)}
                muted={refund.status === 'FAILED'}
              />
            ))}
          </dl>
          <dl className="mt-3 border-t border-line pt-3">
            <Row label="Paid after refunds (NZD)" value={formatNzd(receipt.netPaidCents)} strong />
          </dl>
        </section>
      )}

      <p className="text-xs text-muted">
        All amounts are in New Zealand dollars and include GST. Times are in NZ time. Keep this receipt for
        your records.
      </p>
    </Card>
  );
}

function ReceiptView({ tripRef }: { tripRef: string }) {
  const receipt = useReceipt(tripRef);
  const [downloading, setDownloading] = useState(false);

  if (receipt.isError) {
    const code = receipt.error instanceof ApiError ? receipt.error.code : '';
    const status = receipt.error instanceof ApiError ? receipt.error.status : 0;
    return (
      <EmptyState
        className="mx-auto py-10"
        visual={
          <IconBadge size="xl">
            <ReceiptText />
          </IconBadge>
        }
        title={
          code === 'NO_RECEIPT'
            ? 'No receipt yet'
            : status === 404
              ? 'We couldn’t find that trip'
              : status === 403
                ? 'This receipt is the guest’s'
                : 'We couldn’t load this receipt'
        }
        description={
          code === 'NO_RECEIPT'
            ? 'The receipt is ready once the booking is paid for.'
            : status === 403
              ? 'What you earn from this trip is on your booking page.'
              : receipt.error.message
        }
        actions={
          status === 403 ? (
            <Button asChild>
              <Link to={`/host/bookings/${tripRef}`}>Your booking</Link>
            </Button>
          ) : status === 404 ? (
            <Button asChild>
              <Link to="/trips">Your trips</Link>
            </Button>
          ) : code === 'NO_RECEIPT' ? (
            <Button asChild>
              <Link to={`/trips/${tripRef}`}>Back to the trip</Link>
            </Button>
          ) : (
            <Button onClick={() => void receipt.refetch()}>Try again</Button>
          )
        }
      />
    );
  }

  const download = async () => {
    setDownloading(true);
    try {
      await downloadReceiptPdf(tripRef);
    } catch (error) {
      toast('We couldn’t download the receipt', {
        tone: 'danger',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="grid gap-8">
      <div className="print:hidden">
        <BackLink to={`/trips/${tripRef}`}>Back to the trip</BackLink>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow text-primary">Trip {tripRef}</p>
            <h1 className="headline mt-2 text-title-3 font-medium">Receipt</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => window.print()} disabled={!receipt.data}>
              <Printer aria-hidden="true" />
              Print
            </Button>
            <Button onClick={() => void download()} loading={downloading} disabled={!receipt.data}>
              <Download aria-hidden="true" />
              Download PDF
            </Button>
          </div>
        </div>
      </div>
      {receipt.data ? (
        <ReceiptDocument receipt={receipt.data} />
      ) : (
        <Skeleton aria-hidden="true" className="h-[36rem] rounded-card" />
      )}
    </div>
  );
}

/**
 * A paid trip's GST receipt (spec §17; plan §8.1, item 18): a page to print, and a PDF to download, with
 * every line, the GST included, how it was paid and any refunds.
 */
export function ReceiptPage() {
  const { ref = '' } = useParams();
  return (
    <Container className="max-w-3xl py-8 sm:py-12 print:max-w-none print:p-0">
      <PageBackdrop art={TripRoute} />
      <PageMeta title={`Receipt ${ref}`} noindex />
      <RequireSignedIn fallback={<Skeleton aria-hidden="true" className="h-[36rem] rounded-card" />}>
        {() => <ReceiptView key={ref} tripRef={ref} />}
      </RequireSignedIn>
    </Container>
  );
}
