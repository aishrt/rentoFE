import { CarFront, Minus, Plus } from 'lucide-react';
import { useId, useState } from 'react';
import type { PublicPolicies } from '@/api/types';
import { Counter } from '@/components/motion/counter';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import { Field } from '@/components/ui/field';
import { IconButton } from '@/components/ui/icon-button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNzdFromCents } from '@/lib/format';
import {
  MAX_BOOKED_DAYS,
  MIN_BOOKED_DAYS,
  bodyTypeLabels,
  estimateMonthlyEarnings,
  estimatorBodyTypes,
  perDay,
  type BodyType,
} from './policies';

const formatDollars = (dollars: number) => formatNzdFromCents(dollars * 100);
const daysLabel = (days: number) => (days === 1 ? '1 day' : `${days} days`);

interface EarningsEstimatorProps {
  estimator: PublicPolicies['hostEstimator'];
  hostCommissionPct: number;
}

/**
 * What a car might earn in a month (plan §9, Days 12–14): a typical daily price for the chosen body type,
 * times the days booked, less the host commission. The assumptions are the client's (plan §16 item 18), and
 * the result is labelled as an estimate, never a promise.
 */
export function EarningsEstimator({ estimator, hostCommissionPct }: EarningsEstimatorProps) {
  const bodyTypes = estimatorBodyTypes(estimator);
  const [bodyType, setBodyType] = useState<BodyType | undefined>(() =>
    bodyTypes.includes('SUV') ? 'SUV' : bodyTypes[0],
  );
  const [days, setDays] = useState(estimator.bookedDaysPerMonth);
  const daysId = useId();

  const dailyCents = (bodyType && estimator.dailyCentsByBodyType[bodyType]) ?? 0;
  const estimate = estimateMonthlyEarnings(dailyCents, days, hostCommissionPct);
  const changeDays = (value: number) => setDays(Math.min(MAX_BOOKED_DAYS, Math.max(MIN_BOOKED_DAYS, value)));
  const label = bodyType ? bodyTypeLabels[bodyType] : 'car';
  // "A typical hatchback", but "A typical SUV".
  const bodyTypeName = label === label.toUpperCase() ? label : label.toLowerCase();

  return (
    <Card variant="raised" className="grid overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="grid content-start gap-8 p-6 sm:p-8 lg:p-10">
        <Field label="Your car's body type">
          <Select
            value={bodyType ?? ''}
            onChange={(value) => setBodyType(value as BodyType)}
            options={bodyTypes.map((type) => ({ value: type, label: bodyTypeLabels[type] }))}
            icon={<CarFront />}
            listLabel="Body types"
          />
        </Field>

        <Field
          id={daysId}
          label="Days booked each month"
          labelAside={
            <span aria-hidden="true" className="text-sm font-semibold text-primary tabular-nums">
              {daysLabel(estimate.days)}
            </span>
          }
        >
          <div className="flex items-center gap-2">
            <IconButton
              label="One day fewer"
              tooltip="none"
              onClick={() => changeDays(days - 1)}
              disabled={days <= MIN_BOOKED_DAYS}
              className="border border-line bg-surface"
            >
              <Minus aria-hidden="true" />
            </IconButton>
            {/* The browser's own slider in the brand colour, like Checkbox: every keyboard and screen reader knows it. */}
            <input
              id={daysId}
              type="range"
              min={MIN_BOOKED_DAYS}
              max={MAX_BOOKED_DAYS}
              step={1}
              value={estimate.days}
              aria-valuetext={`${daysLabel(estimate.days)} a month`}
              onChange={(event) => changeDays(Number(event.target.value))}
              className="h-11 min-w-0 flex-1 cursor-pointer accent-primary"
            />
            <IconButton
              label="One day more"
              tooltip="none"
              onClick={() => changeDays(days + 1)}
              disabled={days >= MAX_BOOKED_DAYS}
              className="border border-line bg-surface"
            >
              <Plus aria-hidden="true" />
            </IconButton>
          </div>
        </Field>

        <p className="text-sm text-muted">
          We start from {daysLabel(estimator.bookedDaysPerMonth)} a month, a typical month for a shared car.
          Move the slider to see what more or fewer bookings could mean.
        </p>
      </div>

      <div className="flex flex-col justify-between gap-8 bg-primary p-6 text-canvas sm:p-8 lg:p-10">
        <div>
          <p className="eyebrow text-accent">Estimated monthly earnings</p>
          <p aria-live="polite" className="headline mt-3 text-6xl leading-none font-medium sm:text-7xl">
            <Counter value={Math.round(estimate.monthlyCents / 100)} format={formatDollars} />
          </p>
          <p className="mt-4 text-canvas/85">
            A typical {bodyTypeName} at {perDay(estimate.dailyCents)}, booked {daysLabel(estimate.days)} a
            month.
          </p>
        </div>

        <dl className="grid gap-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-canvas/85">Rental</dt>
            <dd className="font-medium tabular-nums">{formatNzdFromCents(estimate.grossCents)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-canvas/85">Host commission ({hostCommissionPct}%)</dt>
            <dd className="font-medium tabular-nums">−{formatNzdFromCents(estimate.commissionCents)}</dd>
          </div>
          <Divider tone="dark" className="border-canvas/20" />
          <div className="flex items-center justify-between gap-4 text-base">
            <dt className="font-semibold">You’d earn about</dt>
            <dd className="font-semibold tabular-nums">{formatNzdFromCents(estimate.monthlyCents)}</dd>
          </div>
        </dl>

        <p className="text-xs leading-relaxed text-canvas/85">
          An estimate, not a promise. What you earn depends on the price you set, your car, where it’s based,
          the season and how often it’s booked. It doesn’t include your own running costs.
        </p>
      </div>
    </Card>
  );
}

/** Holds the estimator's place while the policies load, at the same size, so nothing jumps (plan §12.5). */
export function EarningsEstimatorSkeleton() {
  return (
    <Card variant="raised" aria-busy="true" className="grid overflow-hidden lg:grid-cols-2">
      <span className="sr-only">Loading the earnings estimator</span>
      <div className="grid content-start gap-8 p-6 sm:p-8 lg:p-10">
        <div className="grid gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-12 w-full rounded-control" />
        </div>
        <div className="grid gap-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-11 w-full rounded-control" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="grid gap-6 bg-primary p-6 sm:p-8 lg:p-10">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-16 w-48" />
        <Skeleton className="h-24 w-full" />
      </div>
    </Card>
  );
}
