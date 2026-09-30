import {
  ArrowRight,
  CalendarClock,
  Fuel,
  MapPin,
  Navigation,
  Plane,
  Route,
  ShieldCheck,
  Truck,
  Undo2,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { DeliveryOptionSummary, ProtectionPlanSummary, VehicleDetail } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { IconBadge } from '@/components/ui/icon-badge';
import { cn } from '@/lib/cn';
import { ListingSection } from './listing-section';
import { formatNotice, formatNzdPrecise, optionDetail, optionFee, refundRules } from './vehicle-format';

function PolicyRow({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-4 py-5 first:pt-0 last:pb-0">
      <IconBadge size="sm">
        <Icon />
      </IconBadge>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-ink">{title}</h3>
        <div className="mt-1 text-ink/85">{children}</div>
      </div>
    </li>
  );
}

/** Fuel, kilometres, trip length and the listing's cancellation tier with its refund rules (spec §6). */
export function PoliciesSection({ vehicle }: { vehicle: VehicleDetail }) {
  const electric = vehicle.fuelType === 'EV';
  const fuel =
    vehicle.fuelPolicy === 'FULL'
      ? electric
        ? 'Return it fully charged.'
        : 'Return it with a full tank.'
      : electric
        ? 'Return it with the same battery charge as when you collected it.'
        : 'Return it with the same amount of fuel as when you collected it.';
  const { rules, cancellationTier } = vehicle;

  return (
    <ListingSection id="policies" title="Policies">
      <ul className="divide-y divide-line">
        <PolicyRow icon={Fuel} title={electric ? 'Charging' : 'Fuel'}>
          {fuel}
        </PolicyRow>
        <PolicyRow icon={Route} title="Kilometres">
          {vehicle.unlimitedKm || vehicle.kmAllowancePerDay === null
            ? 'Unlimited kilometres.'
            : `${vehicle.kmAllowancePerDay} km a day included, then ${formatNzdPrecise(vehicle.extraKmCents)} for each extra kilometre.`}
        </PolicyRow>
        <PolicyRow icon={CalendarClock} title="Trip length">
          {rules.minDays === rules.maxDays
            ? `${rules.minDays} ${rules.minDays === 1 ? 'day' : 'days'}`
            : `${rules.minDays} to ${rules.maxDays} days`}
          , booked at least {formatNotice(rules.minNoticeHours)} ahead.
        </PolicyRow>
        <PolicyRow icon={Undo2} title={`Cancellation: ${cancellationTier.name}`}>
          <p>{cancellationTier.summary}</p>
          <dl className="mt-3 grid gap-1.5 text-sm">
            {refundRules(cancellationTier).map((rule) => (
              <div
                key={rule.when}
                className="flex justify-between gap-4 border-b border-dashed border-line pb-1.5 last:border-0"
              >
                <dt className="text-muted">{rule.when}</dt>
                <dd className="shrink-0 font-medium text-ink">{rule.refund}</dd>
              </div>
            ))}
          </dl>
          <Link
            to="/cancellation-policy"
            className="link-underline mt-3 inline-block text-sm font-medium text-primary"
          >
            Read the cancellation policy
          </Link>
        </PolicyRow>
      </ul>
    </ListingSection>
  );
}

const OPTION_ICONS: Record<DeliveryOptionSummary['type'], LucideIcon> = {
  PICKUP: MapPin,
  DELIVERY: Truck,
  AIRPORT: Plane,
  CUSTOM: Navigation,
};

/** Where the trip can start and end: collecting from the host, delivery, the airport (spec §6). */
export function DeliveryOptionsSection({ options }: { options: readonly DeliveryOptionSummary[] }) {
  if (options.length === 0) return null;
  return (
    <ListingSection
      id="pickup"
      title="Pick-up and delivery"
      description="The exact address and any meeting instructions are shared once your booking is confirmed."
    >
      <ul className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const Icon = OPTION_ICONS[option.type];
          const detail = optionDetail(option);
          return (
            <li
              key={option.id}
              className="flex items-start gap-3 rounded-card border border-line/80 bg-surface p-4 shadow-card"
            >
              <IconBadge size="sm">
                <Icon />
              </IconBadge>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{option.label}</p>
                {detail && <p className="text-sm text-muted">{detail}</p>}
              </div>
              <p className="shrink-0 text-sm font-semibold text-ink tabular-nums">{optionFee(option)}</p>
            </li>
          );
        })}
      </ul>
    </ListingSection>
  );
}

/** The protection plans (plan §8), with the price a day, the excess and what they cover. */
export function ProtectionSection({ plans }: { plans: readonly ProtectionPlanSummary[] }) {
  if (plans.length === 0) return null;
  return (
    <ListingSection
      id="protection"
      title="Protection"
      aside={
        <Link
          to="/insurance"
          className="link-underline inline-flex items-center gap-1 text-sm font-medium text-primary"
        >
          How protection works
          <ArrowRight aria-hidden="true" className="nudge-right size-4" />
        </Link>
      }
      description="Every trip is covered. Choose a plan with a lower excess when you book."
    >
      <ul className="grid gap-3 sm:grid-cols-3">
        {plans.map((plan) => (
          <li
            key={plan.code}
            className={cn(
              'flex flex-col rounded-card border bg-surface p-5 shadow-card',
              plan.mandatory ? 'border-primary/40' : 'border-line/80',
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 font-semibold text-ink">
                <ShieldCheck aria-hidden="true" className="size-4.5 text-primary" />
                {plan.name}
              </p>
              {plan.mandatory && <Badge variant="primary">Included</Badge>}
            </div>
            <p className="mt-3 text-sm text-ink/85">{plan.coverSummary}</p>
            <dl className="mt-auto grid gap-1 pt-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Price</dt>
                <dd className="font-medium text-ink tabular-nums">
                  {formatNzdPrecise(plan.dailyPriceCents)} a day
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Excess</dt>
                <dd className="font-medium text-ink tabular-nums">{formatNzdPrecise(plan.excessCents)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </ListingSection>
  );
}
