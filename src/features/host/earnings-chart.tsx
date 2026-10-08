import { useState } from 'react';
import { formatNzd } from '@/features/booking/booking-format';
import { cn } from '@/lib/cn';

interface Month {
  /** "2026-10". */
  month: string;
  netCents: number;
}

const monthName = (key: string, style: 'short' | 'long') =>
  new Intl.DateTimeFormat('en-NZ', {
    month: style,
    ...(style === 'long' && { year: 'numeric' }),
    timeZone: 'UTC',
  }).format(new Date(`${key}-01T00:00:00Z`));

/** Round axis steps: 1, 2 or 5 times a power of ten, in dollars. */
function niceStep(maxDollars: number, ticks = 4): number {
  const raw = Math.max(maxDollars / ticks, 1);
  const power = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / power;
  return (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power;
}

const axisDollars = (dollars: number) =>
  dollars >= 1000
    ? `$${(dollars / 1000).toLocaleString('en-NZ', { maximumFractionDigits: 1 })}k`
    : `$${dollars}`;

/**
 * Net earnings for each of the last 12 months (plan §12.6, Host earnings): one series, so the heading names it
 * and there's no legend. Hover or focus a month for its amount; the same figures are in a table for screen
 * readers and on request.
 */
export function EarningsChart({ months, className }: { months: Month[]; className?: string }) {
  const [active, setActive] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const maxDollars = Math.max(0, ...months.map((month) => month.netCents / 100));
  const step = niceStep(maxDollars);
  const top = Math.max(step, Math.ceil(maxDollars / step) * step);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, index) => index * step);
  const current = months.length - 1;

  return (
    <figure className={cn('grid gap-3', className)}>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setTable((shown) => !shown)}
          className="link-underline text-sm font-medium text-primary"
          aria-pressed={table}
        >
          {table ? 'Show as chart' : 'Show as table'}
        </button>
      </div>
      {table ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-muted">
              <th scope="col" className="py-2 font-medium">
                Month
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                Net earnings
              </th>
            </tr>
          </thead>
          <tbody>
            {[...months].reverse().map((month) => (
              <tr key={month.month} className="border-b border-line/60">
                <th scope="row" className="py-2 text-left font-normal text-ink">
                  {monthName(month.month, 'long')}
                </th>
                <td className="py-2 text-right text-ink tabular-nums">{formatNzd(month.netCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div aria-hidden="true" className="relative h-56 pl-12">
          {ticks.map((tick) => (
            <div
              key={tick}
              className="absolute right-0 left-12 border-t border-line/70"
              style={{ bottom: `${(tick / top) * 100}%` }}
            >
              <span className="absolute -top-2.5 -left-12 w-10 text-right text-xs text-muted tabular-nums">
                {axisDollars(tick)}
              </span>
            </div>
          ))}
          <div className="absolute inset-y-0 right-0 left-12 grid grid-cols-12">
            {months.map((month, index) => {
              const height = Math.max(0, month.netCents / 100 / top) * 100;
              return (
                <div
                  key={month.month}
                  className="relative flex items-end justify-center"
                  onPointerEnter={() => setActive(index)}
                  onPointerLeave={() => setActive((shown) => (shown === index ? null : shown))}
                >
                  <div
                    className={cn(
                      'w-[min(24px,60%)] rounded-t-sm bg-primary transition-opacity duration-120',
                      active !== null && active !== index && 'opacity-55',
                    )}
                    style={{ height: `${height}%`, minHeight: month.netCents > 0 ? 2 : 0 }}
                  />
                  {active === index && (
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded-control bg-ink px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-lift">
                      <span className="block text-white/70">
                        {index === current ? 'This month' : monthName(month.month, 'long')}
                      </span>
                      <span className="font-semibold tabular-nums">{formatNzd(month.netCents)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {!table && (
        <div aria-hidden="true" className="grid grid-cols-12 pl-12 text-center text-xs text-muted">
          {months.map((month, index) => (
            <span key={month.month} className={cn(index === current && 'font-semibold text-ink')}>
              {monthName(month.month, 'short').slice(0, 3)}
            </span>
          ))}
        </div>
      )}
      {/* Screen readers always get the figures, whichever view is on screen. */}
      {!table && (
        <table className="sr-only">
          <caption>Net earnings by month</caption>
          <tbody>
            {months.map((month) => (
              <tr key={month.month}>
                <th scope="row">{monthName(month.month, 'long')}</th>
                <td>{formatNzd(month.netCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </figure>
  );
}
