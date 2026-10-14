import { Check } from 'lucide-react';
import { BodyTypeArt } from '@/features/vehicles/body-type-art';
import { BODY_TYPE_LABELS, type BodyType } from '@/features/vehicles/vehicle-format';
import { cn } from '@/lib/cn';
import { BODY_TYPES } from './search-params';

/**
 * Vehicle type (spec §5), as a row of cartoon cars above the results rather than chips in the filters.
 * Several can be on at once, e.g. SUV and wagon, so each is a toggle button. Phones and tablets swipe the row
 * sideways; desktops fit it to the page's width.
 */
export function VehicleTypePicker({
  selected,
  onChange,
  className,
}: {
  selected: readonly BodyType[];
  onChange: (next: BodyType[]) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Vehicle type"
      className={cn(
        '-mx-4 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden',
        'lg:mx-0 lg:overflow-visible lg:px-0',
        className,
      )}
    >
      {BODY_TYPES.map((type) => {
        const on = selected.includes(type);
        return (
          <button
            key={type}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? selected.filter((value) => value !== type) : [...selected, type])}
            className={cn(
              'group relative flex w-28 shrink-0 select-none flex-col items-center gap-1.5 rounded-card border px-2 pt-3 pb-2.5 lg:w-auto lg:min-w-0 lg:flex-1',
              'transition-[background-color,border-color,color,scale] duration-120 ease-out active:scale-96',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              on ? 'border-primary bg-primary/8 text-primary' : 'border-line bg-surface text-ink hover:border-ink/30',
            )}
          >
            {/* The car edges forward when the tile is hovered. */}
            <BodyTypeArt
              type={type}
              className="w-full max-w-24 transition-transform duration-320 ease-out group-hover:translate-x-1"
            />
            <span className="text-center text-sm leading-tight font-medium">{BODY_TYPE_LABELS[type]}</span>
            {on && (
              <span className="absolute top-1.5 right-1.5 grid size-5 animate-pop-in place-items-center rounded-full bg-primary text-surface">
                <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
