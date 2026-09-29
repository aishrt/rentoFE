import { Coins } from 'lucide-react';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { CURRENCY_NAMES, DISPLAY_CURRENCIES, type DisplayCurrency } from './currency';
import { useDisplayCurrency } from './use-display-currency';

const OPTIONS = DISPLAY_CURRENCIES.map((code) => ({
  value: code,
  label: `${code} · ${CURRENCY_NAMES[code]}`,
}));

/** Lets a visitor see estimates in their own currency (plan §12.7). Charges stay in NZD. */
export function CurrencyPicker({ className }: { className?: string }) {
  const [currency, setCurrency] = useDisplayCurrency();

  return (
    <Field label="Show prices in" className={className}>
      <Select
        value={currency}
        onChange={(value) => setCurrency(value as DisplayCurrency)}
        options={OPTIONS}
        icon={<Coins aria-hidden="true" />}
        listLabel="Currencies"
      />
    </Field>
  );
}
