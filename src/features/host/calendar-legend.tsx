import { cn } from '@/lib/cn';
import { BLOCK_TONES, LEGEND_ORDER, reasonLabel } from './calendar-blocks';

/** What each colour on the calendar means. */
export function CalendarLegend({ className }: { className?: string }) {
  return (
    <ul aria-label="Calendar key" className={cn('flex flex-wrap gap-x-5 gap-y-2', className)}>
      {LEGEND_ORDER.map((reason) => (
        <li key={reason} className="flex items-center gap-2 text-sm text-ink">
          <span aria-hidden="true" className={cn('size-3.5 shrink-0 rounded-inner', BLOCK_TONES[reason])} />
          {reasonLabel(reason)}
        </li>
      ))}
    </ul>
  );
}
