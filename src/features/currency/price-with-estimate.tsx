import { formatNzdFromCents } from '@/lib/format';
import { formatEstimate, formatNzdLabelled } from './currency';
import { useDisplayCurrency } from './use-display-currency';
import { useExchangeRates } from './use-exchange-rates';

/**
 * An NZD price with the visitor's estimate beside it, "NZ$180 · ≈ A$162", or just "$180" in NZD
 * (plan §12.7). The estimate's tooltip says it's approximate and that the charge is in NZD.
 */
export function PriceWithEstimate({ cents }: { cents: number }) {
  const [currency] = useDisplayCurrency();
  const rates = useExchangeRates(currency !== 'NZD');
  const estimate = formatEstimate(cents, currency, rates.data?.rates);

  if (!estimate) return <span>{formatNzdFromCents(cents)}</span>;
  return (
    <span>
      {formatNzdLabelled(cents)}
      <span
        className="text-muted"
        title={`Approximate, at the European Central Bank rate for ${rates.data!.date}. You're charged in NZD and your card issuer converts it.`}
      >
        {' · '}
        {estimate}
      </span>
    </span>
  );
}
