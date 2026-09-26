import { Check } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import { assignRef } from '@/lib/assign-ref';
import { cn } from '@/lib/cn';
import { PickerTrigger } from './picker-trigger';
import { Popover } from './popover';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  options: readonly SelectOption[];
  placeholder?: string;
  /** Shown on the left of the field, like an Input's `leadingIcon`. */
  icon: ReactNode;
  /** Names the list for screen readers, e.g. "Pick-up times". */
  listLabel: string;
  align?: 'start' | 'end';
  /** A chevron on the right that turns while open. On by default. */
  chevron?: boolean;
  id?: string;
  name?: string;
  disabled?: boolean;
  className?: string;
  ref?: Ref<HTMLButtonElement>;
}

/** How long typed letters count as one search, in ms. */
const TYPEAHEAD_RESET = 700;

/** Scrolls the list just enough to show the option, or centres it (on opening). */
function revealOption(list: HTMLElement, option: HTMLElement, centre: boolean) {
  const top = option.offsetTop;
  const bottom = top + option.offsetHeight;
  if (centre) list.scrollTop = top - (list.clientHeight - option.offsetHeight) / 2;
  else if (top < list.scrollTop) list.scrollTop = top;
  else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
}

/**
 * A themed dropdown for choosing one option, used in place of the native <select> (which the browser draws
 * in its own style). Opens with a click or the arrow keys; in the list, arrows, Home, End and Page keys move,
 * typing jumps to a match, and Enter or Space chooses (the WAI-ARIA listbox pattern).
 */
export function Select({
  value,
  onChange,
  onBlur,
  options,
  placeholder = 'Choose…',
  icon,
  listLabel,
  align,
  chevron = true,
  ref,
  ...props
}: SelectProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const typeahead = useRef({ text: '', at: 0 });
  const selectedIndex = options.findIndex((option) => option.value === value);
  const optionId = (index: number) => `${listId}-${index}`;

  const show = () => {
    setActive(Math.max(selectedIndex, 0));
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  const choose = (index: number) => {
    const option = options[index];
    if (option) onChange(option.value);
    close();
  };

  // On opening, focus moves into the list with the chosen option in the middle of the view.
  useEffect(() => {
    const list = listRef.current;
    if (!open || !list) return;
    list.focus({ preventScroll: true });
    const selected = list.querySelector<HTMLElement>('[aria-selected="true"]');
    if (selected) revealOption(list, selected, true);
  }, [open]);

  useEffect(() => {
    const list = listRef.current;
    const option = document.getElementById(`${listId}-${active}`);
    if (open && list && option) revealOption(list, option, false);
  }, [open, active, listId]);

  const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = options.length - 1;
    const moves: Record<string, number | undefined> = {
      ArrowDown: Math.min(active + 1, last),
      ArrowUp: Math.max(active - 1, 0),
      Home: 0,
      End: last,
      PageDown: Math.min(active + 8, last),
      PageUp: Math.max(active - 8, 0),
    };
    const next = moves[event.key];
    if (next !== undefined) {
      event.preventDefault();
      setActive(next);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(active);
    } else if (event.key === 'Tab') {
      event.preventDefault();
      close();
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const recent = event.timeStamp - typeahead.current.at < TYPEAHEAD_RESET;
      const text = (recent ? typeahead.current.text : '') + event.key.toLowerCase();
      typeahead.current = { text, at: event.timeStamp };
      const match = options.findIndex((option) => option.label.toLowerCase().startsWith(text));
      if (match >= 0) setActive(match);
    }
  };

  return (
    <>
      <PickerTrigger
        {...props}
        ref={(node) => {
          triggerRef.current = node;
          assignRef(ref, node);
        }}
        icon={icon}
        open={open}
        chevron={chevron}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        display={options[selectedIndex]?.label}
        placeholder={placeholder}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
          event.preventDefault();
          show();
        }}
        onBlur={onBlur}
      />
      <Popover
        ref={listRef}
        open={open}
        onOpenChange={setOpen}
        anchorRef={triggerRef}
        returnFocusRef={triggerRef}
        align={align}
        matchWidth
        id={listId}
        role="listbox"
        tabIndex={-1}
        aria-label={listLabel}
        aria-activedescendant={optionId(active)}
        onKeyDown={onListKeyDown}
        className="scrollbar-subtle max-h-72 p-1.5 outline-none"
      >
        {options.map((option, index) => {
          const selected = index === selectedIndex;
          return (
            <div
              key={option.value}
              id={optionId(index)}
              role="option"
              aria-selected={selected}
              data-active={index === active || undefined}
              onPointerMove={() => setActive(index)}
              onClick={() => choose(index)}
              className={cn(
                'flex min-h-11 cursor-pointer select-none items-center justify-between gap-3 rounded-control px-3 text-sm tabular-nums text-ink',
                'transition-colors duration-120 data-active:bg-ink/5',
                selected && 'font-semibold text-primary',
              )}
            >
              <span className="truncate">{option.label}</span>
              {selected && <Check aria-hidden="true" className="size-4 shrink-0" />}
            </div>
          );
        })}
      </Popover>
    </>
  );
}
