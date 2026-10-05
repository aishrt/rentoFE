import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Repeat, X } from 'lucide-react';
import { useRef, useState } from 'react';
import type { HostVehicle, RecurringResult } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { IconButton } from '@/components/ui/icon-button';
import { TimePicker } from '@/components/ui/time-picker';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { formatInstantRange } from './calendar-time';
import { hostKeys, setRecurringRulesRequest } from './host-api';
import { hostErrorMessage } from './use-step-save';

/** Monday first, as NZ calendars are; the API counts from Sunday = 0. */
const DAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

const PRESETS = [
  { label: 'Weekdays', days: [1, 2, 3, 4, 5] },
  { label: 'Weekends', days: [0, 6] },
  { label: 'Every day', days: [0, 1, 2, 3, 4, 5, 6] },
];

interface RuleDraft {
  key: number;
  days: number[];
  start: string;
  end: string;
}

const sameDays = (a: number[], b: number[]) => a.length === b.length && a.every((day) => b.includes(day));

function RuleCard({
  rule,
  index,
  onChange,
  onRemove,
  showError,
}: {
  rule: RuleDraft;
  index: number;
  onChange: (rule: RuleDraft) => void;
  onRemove: () => void;
  showError: boolean;
}) {
  const toggle = (day: number) =>
    onChange({
      ...rule,
      days: rule.days.includes(day) ? rule.days.filter((value) => value !== day) : [...rule.days, day],
    });
  const overnight = rule.end <= rule.start;

  return (
    <li className="grid animate-fade-up gap-4 rounded-card border border-line bg-canvas/50 p-3">
      <fieldset aria-labelledby={`rule-${rule.key}-days`} className="min-w-0">
        <div className="-mt-1 -mr-1 flex items-center justify-between gap-3">
          <p id={`rule-${rule.key}-days`} className="text-sm font-medium text-ink">
            Unavailable on
          </p>
          <IconButton label={`Remove time ${index + 1}`} tooltip="top" onClick={onRemove}>
            <X aria-hidden="true" />
          </IconButton>
        </div>
        {/* 36 px circles with a 44 px touch area, so a week fits the narrow column on one line. */}
        <div className="mt-1 flex flex-wrap gap-1">
          {DAYS.map((day) => {
            const on = rule.days.includes(day.value);
            return (
              <button
                key={day.value}
                type="button"
                aria-pressed={on}
                aria-label={day.label}
                onClick={() => toggle(day.value)}
                className={cn(
                  'relative flex size-9 items-center justify-center rounded-full text-sm font-semibold before:absolute before:-inset-1',
                  'transition-[background-color,color,scale] duration-120 ease-out active:scale-94',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                  on
                    ? 'bg-primary text-surface inset-shadow-highlight'
                    : 'border border-line bg-surface text-ink hover:border-ink/25',
                )}
              >
                <span aria-hidden="true">{day.label.slice(0, 2)}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              aria-pressed={sameDays(rule.days, preset.days)}
              onClick={() => onChange({ ...rule, days: preset.days })}
              className="min-h-11 rounded-control px-2.5 text-sm font-medium text-muted transition-colors duration-120 first:-ml-2.5 hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-primary aria-pressed:text-primary"
            >
              {preset.label}
            </button>
          ))}
        </div>
        {showError && rule.days.length === 0 && (
          <p role="alert" className="mt-1 text-sm text-danger">
            Choose at least one day
          </p>
        )}
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <Field label="From">
          <TimePicker
            value={rule.start}
            onChange={(start) => onChange({ ...rule, start })}
            listLabel="From"
          />
        </Field>
        <Field label="Until">
          <TimePicker
            value={rule.end}
            onChange={(end) => onChange({ ...rule, end })}
            listLabel="Until"
            align="end"
          />
        </Field>
      </div>
      {overnight && (
        <p className="text-sm text-muted">
          {rule.start === '00:00' && rule.end === '00:00'
            ? 'The whole day, midnight to midnight.'
            : 'Runs overnight, into the next day.'}
        </p>
      )}
    </li>
  );
}

/**
 * Weekly availability (plan §3, "Recurring availability"): times the car is regularly unavailable, such as
 * weekdays 8 am to 6 pm. Saving rebuilds the next 12 months of blocks; times where a trip or request
 * already is are left open, and listed here.
 */
export function RecurringRulesEditor({ vehicle }: { vehicle: HostVehicle }) {
  const queryClient = useQueryClient();
  const nextKey = useRef(vehicle.recurringRules.length);
  const [rules, setRules] = useState<RuleDraft[]>(() =>
    vehicle.recurringRules.map((rule, index) => ({
      key: index,
      days: rule.daysOfWeek,
      start: rule.startTime,
      end: rule.endTime,
    })),
  );
  const [tried, setTried] = useState(false);
  const [result, setResult] = useState<RecurringResult | null>(null);
  const save = useMutation({
    mutationFn: () =>
      setRecurringRulesRequest(vehicle.id, {
        rules: rules.map((rule) => ({ daysOfWeek: rule.days, startTime: rule.start, endTime: rule.end })),
      }),
    onSuccess: (saved) => {
      setResult(saved);
      void queryClient.invalidateQueries({ queryKey: hostKeys.calendar(vehicle.id) });
      void queryClient.invalidateQueries({ queryKey: hostKeys.vehicle(vehicle.id), exact: true });
    },
  });

  const update = (key: number, rule: RuleDraft) => {
    setResult(null);
    setRules((current) => current.map((item) => (item.key === key ? rule : item)));
  };
  const add = () => {
    setResult(null);
    const key = nextKey.current++;
    setRules((current) => [...current, { key, days: [1, 2, 3, 4, 5], start: '08:00', end: '18:00' }]);
  };

  return (
    <Card asChild className="p-5 sm:p-6">
      <section aria-labelledby="weekly-availability" className="grid gap-5">
        <div className="flex items-start gap-3">
          <Repeat aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 id="weekly-availability" className="text-base font-semibold text-ink">
              Weekly availability
            </h2>
            <p className="mt-1 text-sm text-muted">
              Times your car is never free, such as weekdays while you drive to work. Trips already booked
              stay booked.
            </p>
          </div>
        </div>

        {rules.length === 0 ? (
          <p className="rounded-control bg-canvas/70 p-3 text-sm text-muted">
            No weekly times. Your car is free whenever it isn’t blocked or booked.
          </p>
        ) : (
          <ul className="grid gap-3">
            {rules.map((rule, index) => (
              <RuleCard
                key={rule.key}
                rule={rule}
                index={index}
                showError={tried}
                onChange={(next) => update(rule.key, next)}
                onRemove={() => {
                  setResult(null);
                  setRules((current) => current.filter((item) => item.key !== rule.key));
                }}
              />
            ))}
          </ul>
        )}

        {save.isError && (
          <Alert variant="danger" role="alert">
            {hostErrorMessage(save.error)}
          </Alert>
        )}
        {result && (
          <Alert variant="success" role="status" title="Weekly availability saved">
            <p>
              {result.blocks === 0
                ? 'Nothing is blocked each week now.'
                : `${formatNumber(result.blocks)} ${result.blocks === 1 ? 'time is' : 'times are'} blocked over the next 12 months.`}
            </p>
            {result.skipped.length > 0 && (
              <div className="mt-2">
                <p className="font-medium">Left open, because a trip or request is already there:</p>
                <ul className="mt-1 list-disc pl-5">
                  {result.skipped.map((range) => (
                    <li key={range.start}>{formatInstantRange(range.start, range.end)}</li>
                  ))}
                </ul>
              </div>
            )}
          </Alert>
        )}

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={add} disabled={rules.length >= 14}>
            <Plus aria-hidden="true" />
            Add a time
          </Button>
          <Button
            loading={save.isPending}
            onClick={() => {
              setTried(true);
              if (rules.some((rule) => rule.days.length === 0)) return;
              save.mutate();
            }}
          >
            Save weekly availability
          </Button>
        </div>
      </section>
    </Card>
  );
}
