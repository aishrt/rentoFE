import { useRef, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';
import { tabId, tabPanelId } from './tab-ids';

export interface TabOption<Value extends string> {
  value: Value;
  label: string;
}

interface SegmentedTabsProps<Value extends string> {
  /** Used to link each tab to its panel: `${idPrefix}-tab-${value}` and `${idPrefix}-panel-${value}`. */
  idPrefix: string;
  label: string;
  options: readonly TabOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  className?: string;
}

/**
 * Accessible tabs (arrow keys, Home/End) with an indicator that slides between options
 * using transform only (plan §12.4). The caller renders the matching role="tabpanel".
 */
export function SegmentedTabs<Value extends string>({
  idPrefix,
  label,
  options,
  value,
  onChange,
  className,
}: SegmentedTabsProps<Value>) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  const select = (index: number) => {
    const option = options[(index + options.length) % options.length];
    if (!option) return;
    onChange(option.value);
    tabRefs.current[options.indexOf(option)]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = {
      ArrowRight: activeIndex + 1,
      ArrowLeft: activeIndex - 1,
      Home: 0,
      End: options.length - 1,
    };
    const next = keys[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(next);
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn('relative grid rounded-full border border-line bg-surface p-1 shadow-card', className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 rounded-full bg-primary transition-transform duration-320 ease-out"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={tabId(idPrefix, option.value)}
            aria-selected={selected}
            aria-controls={tabPanelId(idPrefix, option.value)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative z-10 h-11 rounded-full px-5 text-sm font-medium transition-colors duration-200',
              selected ? 'text-white' : 'text-muted hover:text-ink',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
