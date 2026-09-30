import { Tag } from 'lucide-react';
import { useId } from 'react';
import type { LineItem, Quote } from '@/api/types';
import { Counter } from '@/components/motion/counter';
import { formatEstimate } from '@/features/currency/currency';
import { useDisplayCurrency } from '@/features/currency/use-display-currency';
import { useExchangeRates } from '@/features/currency/use-exchange-rates';
import { cn } from '@/lib/cn';

const nzd = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "$82.80", or "−$92.00" for a discount: a breakdown shows the cents, so the lines add up. */
const formatCents = (cents: number) => (cents < 0 ? `−${nzd.format(-cents / 100)}` : nzd.format(cents / 100));

function LineGroup({ title, items }: { title: string; items: readonly LineItem[] }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className="eyebrow text-muted">
        {title}
      </h3>
      <dl className="mt-2 grid gap-2">
        {items.map((item, index) => {
          const discount = item.amountCents < 0;
          return (
            <div key={`${item.code}-${index}`} className="flex items-baseline justify-between gap-4 text-sm">
              <dt
                className={cn('flex min-w-0 items-center gap-1.5', discount ? 'text-primary' : 'text-ink/85')}
              >
                {discount && <Tag aria-hidden="true" className="size-3.5 shrink-0" />}
                {item.label}
              </dt>
              <dd className={cn('shrink-0 tabular-nums', discount ? 'text-primary' : 'text-ink')}>
                {formatCents(item.amountCents)}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

interface PriceBreakdownProps {
  lineItems: readonly LineItem[];
  price: Quote['price'];
  /** Rolls the total to its new amount when the trip changes (plan §12.4), as on the listing page. */
  animateTotal?: boolean;
  className?: string;
}

/**
 * The price of a trip exactly as the API calculated it (plan §5: the frontend never calculates a price), in
 * the groups spec §7 asks for: **Mandatory** charges (rental, any weekly or monthly discount on its own
 * line, service fee, a mandatory protection plan) and **Optional** ones (delivery, a chosen protection
 * plan), then the GST included in the total, and the **Total NZD** in bold. Used on the listing page and at
 * checkout.
 */
export function PriceBreakdown({ lineItems, price, animateTotal = false, className }: PriceBreakdownProps) {
  const [currency] = useDisplayCurrency();
  const rates = useExchangeRates(currency !== 'NZD');
  const estimate = formatEstimate(price.totalCents, currency, rates.data?.rates);
  const mandatory = lineItems.filter((item) => item.mandatory);
  const optional = lineItems.filter((item) => !item.mandatory);

  return (
    <div className={cn('grid gap-5', className)}>
      {mandatory.length > 0 && <LineGroup title="Mandatory" items={mandatory} />}
      {optional.length > 0 && <LineGroup title="Optional" items={optional} />}

      <dl className="grid gap-2 border-t border-line pt-4">
        <div className="flex items-baseline justify-between gap-4 text-sm text-muted">
          <dt>GST included in the total</dt>
          <dd className="tabular-nums">{formatCents(price.gstCents)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="font-semibold text-ink">Total NZD</dt>
          <dd className="text-right text-lg font-semibold text-ink tabular-nums">
            {animateTotal ? (
              <Counter value={price.totalCents} format={formatCents} />
            ) : (
              formatCents(price.totalCents)
            )}
            {estimate && (
              <span
                className="block text-sm font-normal text-muted"
                title={`Approximate, at the European Central Bank rate for ${rates.data?.date}. You're charged in NZD and your card issuer converts it.`}
              >
                {estimate}
              </span>
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}
