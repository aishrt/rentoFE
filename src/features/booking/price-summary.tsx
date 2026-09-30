import { ChevronUp, LockKeyhole, ShieldCheck, Undo2, Zap } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import type { CancellationTier, LineItem, Quote, VehicleDetail } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PriceBreakdown } from '@/features/booking/price-breakdown';
import { formatEstimate } from '@/features/currency/currency';
import { CurrencyPicker } from '@/features/currency/currency-picker';
import { useDisplayCurrency } from '@/features/currency/use-display-currency';
import { useExchangeRates } from '@/features/currency/use-exchange-rates';
import { cn } from '@/lib/cn';
import {
  formatNzDateTime,
  formatNzd,
  formatNzdCharge,
  formatWallClock,
  freeCancellationUntil,
} from './booking-format';
import type { ResolvedChoices } from './checkout-state';

/**
 * "You'll be charged NZ$506.50. Your card issuer converts it." (plan §12.7): every charge is in NZD. A request
 * is authorised now and charged only when the Host accepts (plan §8.1).
 */
export function ChargeNote({
  totalCents,
  request,
  hostName,
  className,
}: {
  totalCents: number;
  request: boolean;
  hostName: string;
  className?: string;
}) {
  return (
    <p className={cn('text-sm text-muted', className)}>
      {request ? (
        <>
          Your card is authorised for {formatNzdCharge(totalCents)} now and charged only if {hostName}{' '}
          accepts.
        </>
      ) : (
        <>You’ll be charged {formatNzdCharge(totalCents)}.</>
      )}{' '}
      Your card issuer converts it.
    </p>
  );
}

/** "$506.50 · ≈ A$460": the exact NZD total, with the visitor's estimate when they chose another currency. */
function ExactTotal({ cents }: { cents: number }) {
  const [currency] = useDisplayCurrency();
  const rates = useExchangeRates(currency !== 'NZD');
  const estimate = formatEstimate(cents, currency, rates.data?.rates);
  return (
    <>
      {formatNzd(cents)}
      {estimate && <span className="font-normal text-muted"> · {estimate}</span>}
    </>
  );
}

function TrustPoint({ icon: Icon, children }: { icon: typeof LockKeyhole; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
      <span>{children}</span>
    </li>
  );
}

/** The price of the trip on screen: the latest quote, or the booking once the dates are held. */
export interface PricedTrip {
  lineItems: LineItem[];
  price: Quote['price'];
  instantBook: boolean;
  /** The pick-up as an instant, for "Full refund if you cancel before …". */
  start?: string;
  cancellationTier?: Pick<CancellationTier, 'name' | 'summary' | 'refunds'>;
}

export interface SummaryProps {
  vehicle: VehicleDetail;
  resolved: ResolvedChoices;
  /** The latest price; while the next one loads it stays, faded. */
  priced: PricedTrip | undefined;
  current: boolean;
  pricing: boolean;
}

function PriceBody({ vehicle, resolved, priced, current, pricing }: SummaryProps) {
  if (!resolved.start || !resolved.end) {
    return (
      <p className="text-sm text-muted">
        Add your dates to see the total, with every mandatory fee included.
      </p>
    );
  }
  if (!priced) {
    return pricing ? (
      <div aria-hidden="true" className="grid gap-2.5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="mt-2 h-6 w-full" />
      </div>
    ) : null;
  }
  return (
    <div className="grid gap-3">
      <PriceBreakdown
        lineItems={priced.lineItems}
        price={priced.price}
        animateTotal
        className={cn('transition-opacity duration-200', !current && 'opacity-50')}
      />
      <ChargeNote
        totalCents={priced.price.totalCents}
        request={!priced.instantBook}
        hostName={vehicle.host.firstName}
      />
    </div>
  );
}

function TrustPoints({ vehicle, resolved, priced }: Pick<SummaryProps, 'vehicle' | 'resolved' | 'priced'>) {
  const tier = priced?.cancellationTier ?? vehicle.cancellationTier;
  const until = resolved.start && priced?.start ? freeCancellationUntil(tier, priced.start) : null;
  const plan = vehicle.protectionPlans.find((item) => item.code === resolved.planCode);
  return (
    <ul className="grid gap-2 text-sm text-ink/85">
      <TrustPoint icon={LockKeyhole}>
        Secure payment with Stripe. Your card details never reach us.
      </TrustPoint>
      {plan && (
        <TrustPoint icon={ShieldCheck}>
          {plan.name} protection, with a {formatNzd(plan.excessCents)} excess.
        </TrustPoint>
      )}
      <TrustPoint icon={Undo2}>
        {until
          ? `Full refund if you cancel before ${formatNzDateTime(until)}.`
          : `${tier.name} cancellation policy.`}
      </TrustPoint>
    </ul>
  );
}

/** The right-hand summary on desktop (plan §12.6): the car, the trip, the live price and why it's safe to pay. */
export function CheckoutSummary(props: SummaryProps) {
  const { vehicle, resolved } = props;
  const photo = vehicle.photos[0];
  const pickup = vehicle.deliveryOptions.find((option) => option.id === resolved.pickupOptionId);
  const dropoff = vehicle.deliveryOptions.find((option) => option.id === resolved.returnOptionId);

  return (
    <Card className="grid gap-5 p-5 sm:p-6">
      <div className="flex items-start gap-4">
        {photo && (
          <img
            src={photo.url}
            alt=""
            width={96}
            height={72}
            className="aspect-4/3 w-24 shrink-0 rounded-control bg-canvas object-cover"
          />
        )}
        <div className="min-w-0">
          <p className="font-semibold text-ink">{vehicle.title}</p>
          <p className="text-sm text-muted">Hosted by {vehicle.host.firstName}</p>
          <Badge variant={vehicle.rules.instantBook ? 'primary' : 'neutral'} className="mt-2">
            {vehicle.rules.instantBook && <Zap aria-hidden="true" />}
            {vehicle.rules.instantBook ? 'Instant Book' : 'Request to book'}
          </Badge>
        </div>
      </div>

      {resolved.start && resolved.end && (
        <div className="grid gap-3 border-t border-line pt-4 text-sm">
          <dl className="grid gap-3">
            <div>
              <dt className="text-muted">Pick-up</dt>
              <dd className="font-medium text-ink">{formatWallClock(resolved.start)}</dd>
              {pickup && <dd className="text-ink/85">{pickup.label}</dd>}
            </div>
            <div>
              <dt className="text-muted">Return</dt>
              <dd className="font-medium text-ink">{formatWallClock(resolved.end)}</dd>
              {dropoff && <dd className="text-ink/85">{dropoff.label}</dd>}
            </div>
          </dl>
          <p className="text-xs text-muted">Times are in NZ time.</p>
        </div>
      )}

      <div className="border-t border-line pt-4">
        <h2 className="sr-only">Price</h2>
        <PriceBody {...props} />
      </div>
      <CurrencyPicker />
      <div className="border-t border-line pt-4">
        <TrustPoints {...props} />
      </div>
    </Card>
  );
}

/**
 * The price on phones (plan §12.6): a bar that stays at the foot of the screen from the first step, and opens
 * to show the full breakdown.
 */
export function MobileSummaryBar(props: SummaryProps) {
  const { priced, resolved } = props;
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const total = resolved.start && resolved.end && priced ? priced.price.totalCents : null;

  return (
    <div className="glass sticky bottom-0 z-30 -mx-4 mt-6 border-t border-line/70 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:-mx-6 sm:px-6 lg:hidden">
      {open && (
        <div id={panelId} className="grid max-h-[60dvh] animate-fade-up gap-4 overflow-y-auto pb-4">
          <PriceBody {...props} />
          <CurrencyPicker />
          <TrustPoints {...props} />
        </div>
      )}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-11 w-full items-center justify-between gap-4 rounded-control text-left"
      >
        <span>
          <span className="block text-xs text-muted">Total NZD</span>
          <span className="block font-semibold text-ink tabular-nums">
            {total !== null ? <ExactTotal cents={total} /> : 'Add your dates'}
          </span>
        </span>
        <span className="flex items-center gap-1.5 text-sm font-medium text-primary">
          {open ? 'Hide price details' : 'Price details'}
          <ChevronUp
            aria-hidden="true"
            className={cn('size-4 transition-transform duration-200 ease-out', open && 'rotate-180')}
          />
        </span>
      </button>
    </div>
  );
}
