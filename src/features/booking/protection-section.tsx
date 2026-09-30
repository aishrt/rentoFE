import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router';
import type { ProtectionPlanSummary } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PriceWithEstimate } from '@/features/currency/price-with-estimate';
import { cn } from '@/lib/cn';
import { formatNzd } from './booking-format';

interface ProtectionSectionProps {
  plans: readonly ProtectionPlanSummary[];
  value: string | undefined;
  onChange: (code: string) => void;
  onContinue: () => void;
}

/**
 * Step 2 (plan §12.6): the protection plans as radio cards, with what each covers, its excess and its daily
 * price. The plan every trip includes is chosen to start with; a lower excess is the Guest's choice.
 */
export function ProtectionSection({ plans, value, onChange, onContinue }: ProtectionSectionProps) {
  return (
    <div className="grid gap-5">
      <p className="flex items-start gap-2.5 text-sm text-ink/85">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-4.5 shrink-0 text-primary" />
        <span>
          Every trip includes damage and theft cover. The excess is the most you’d pay if something happens; a
          lower excess costs a little more each day.{' '}
          <Link
            to="/insurance"
            target="_blank"
            rel="noopener"
            className="link-underline font-medium text-primary"
          >
            How protection works
          </Link>
        </span>
      </p>
      <fieldset className="grid gap-3">
        <legend className="sr-only">Protection plan</legend>
        {plans.map((plan) => {
          const checked = plan.code === value;
          return (
            <label
              key={plan.code}
              className={cn(
                'flex cursor-pointer items-start gap-4 rounded-card border bg-surface p-4 transition-[border-color,box-shadow,scale] duration-120 ease-out active:scale-98 sm:p-5',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary',
                checked
                  ? 'border-primary shadow-card ring-1 ring-primary/20'
                  : 'border-line hover:border-ink/25',
              )}
            >
              <input
                type="radio"
                name="protection-plan"
                value={plan.code}
                checked={checked}
                onChange={() => onChange(plan.code)}
                className="mt-0.5 size-5 shrink-0 cursor-pointer accent-primary focus-visible:outline-none"
              />
              <span className="grid min-w-0 flex-1 gap-1">
                <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="flex items-center gap-2 font-semibold text-ink">
                    {plan.name}
                    {plan.mandatory && <Badge variant="primary">Included</Badge>}
                  </span>
                  <span className="text-sm font-semibold text-ink tabular-nums">
                    <PriceWithEstimate cents={plan.dailyPriceCents} /> a day
                  </span>
                </span>
                <span className="text-sm text-muted">{plan.coverSummary}</span>
                <span className="text-sm text-ink/85">
                  Excess <span className="font-semibold text-ink">{formatNzd(plan.excessCents)}</span>
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>
      <div>
        <Button size="lg" onClick={onContinue} className="max-sm:w-full">
          Continue
        </Button>
      </div>
    </div>
  );
}
