import { Check } from 'lucide-react';
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Input } from './input';
import { Popover } from './popover';

type ComboboxProps = Omit<ComponentProps<'input'>, 'value' | 'defaultValue' | 'onChange'> & {
  value: string;
  onValueChange: (value: string) => void;
  /** Suggestions. Any text can still be entered. */
  options: readonly string[];
  leadingIcon?: ReactNode;
  /** A control inside the input on the right, as for Input. */
  trailing?: ReactNode;
  /** An icon beside each suggestion, e.g. a plane for airports. */
  optionIcon?: (option: string) => ReactNode;
  /** Names the list for screen readers, and heads it before anything is typed. */
  listLabel?: string;
};

/** Lower case without accents, so "taupo" finds "Taupō". */
const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Suggestions containing the text: those starting with it first, then those with a word starting with it. */
function filterOptions(options: readonly string[], query: string): readonly string[] {
  const needle = fold(query.trim());
  if (!needle) return options;
  return options
    .map((option) => {
      const folded = fold(option);
      const at = folded.indexOf(needle);
      const rank = at === 0 ? 0 : at > 0 && /[\s(]/.test(folded.charAt(at - 1)) ? 1 : 2;
      return { option, rank: at < 0 ? -1 : rank };
    })
    .filter(({ rank }) => rank >= 0)
    .sort((a, b) => a.rank - b.rank)
    .map(({ option }) => option);
}

/** The suggestion with the typed part in bold. */
function highlight(option: string, query: string): ReactNode {
  const needle = fold(query.trim());
  const folded = fold(option);
  const at = needle ? folded.indexOf(needle) : -1;
  // Folding keeps lengths for precomposed letters such as "ō"; if it didn't, skip the highlight.
  if (at < 0 || folded.length !== option.length) return option;
  return (
    <>
      {option.slice(0, at)}
      <mark className="bg-transparent font-semibold text-inherit">
        {option.slice(at, at + needle.length)}
      </mark>
      {option.slice(at + needle.length)}
    </>
  );
}

/**
 * A text input with a themed list of suggestions under it, in place of a native <datalist>. The list opens
 * as you type, on a click, or with the down arrow; arrows move through it, Enter chooses, Escape closes, and
 * focus stays in the input throughout (the WAI-ARIA combobox pattern with list autocomplete). Accents are
 * ignored when matching.
 */
export function Combobox({
  value,
  onValueChange,
  options,
  leadingIcon,
  trailing,
  optionIcon,
  listLabel = 'Suggestions',
  onKeyDown,
  onClick,
  ref,
  ...props
}: ComboboxProps) {
  const listId = useId();
  const anchorRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  // Suggestions are filtered by what was typed, but not by a suggestion that was just chosen.
  const [filtering, setFiltering] = useState(false);
  const [active, setActive] = useState(-1);
  const matches = useMemo(
    () => (filtering ? filterOptions(options, value) : options),
    [filtering, options, value],
  );
  const expanded = open && matches.length > 0;
  const optionId = (index: number) => `${listId}-${index}`;

  const choose = (option: string) => {
    onValueChange(option);
    setFiltering(false);
    setOpen(false);
  };

  useEffect(() => {
    const popover = popoverRef.current;
    const option = active >= 0 ? document.getElementById(`${listId}-${active}`) : null;
    if (!expanded || !popover || !option) return;
    const top = option.offsetTop;
    const bottom = top + option.offsetHeight;
    if (top < popover.scrollTop) popover.scrollTop = top;
    else if (bottom > popover.scrollTop + popover.clientHeight)
      popover.scrollTop = bottom - popover.clientHeight;
  }, [expanded, active, listId]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const last = matches.length - 1;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const down = event.key === 'ArrowDown';
      if (!expanded) {
        setOpen(true);
        setActive(event.altKey ? -1 : down ? 0 : last);
      } else {
        setActive((current) =>
          down ? (current >= last ? 0 : current + 1) : current <= 0 ? last : current - 1,
        );
      }
    } else if (event.key === 'Enter' && expanded && active >= 0 && matches[active]) {
      // Otherwise Enter submits the form with the text as typed.
      event.preventDefault();
      choose(matches[active]);
    }
  };

  return (
    <div ref={anchorRef}>
      <Input
        {...props}
        ref={ref}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={expanded ? listId : undefined}
        aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
        autoComplete="off"
        value={value}
        onChange={(event) => {
          onValueChange(event.target.value);
          setFiltering(true);
          setActive(-1);
          setOpen(true);
        }}
        onClick={(event) => {
          onClick?.(event);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        leadingIcon={leadingIcon}
        trailing={trailing}
      />
      <Popover
        ref={popoverRef}
        open={expanded}
        onOpenChange={setOpen}
        anchorRef={anchorRef}
        matchWidth
        className="scrollbar-subtle max-h-80 p-1.5"
      >
        {!filtering && (
          <p aria-hidden="true" className="eyebrow px-2.5 pt-2 pb-1.5 text-muted">
            {listLabel}
          </p>
        )}
        <ul id={listId} role="listbox" aria-label={listLabel}>
          {matches.map((option, index) => (
            <li
              key={option}
              id={optionId(index)}
              role="option"
              aria-selected={index === active}
              data-active={index === active || undefined}
              // Keeps focus in the input while a suggestion is pressed.
              onMouseDown={(event) => event.preventDefault()}
              onPointerMove={() => setActive(index)}
              onClick={() => choose(option)}
              className="group/option flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-control px-2.5 text-sm text-ink transition-colors duration-120 data-active:bg-ink/5"
            >
              {optionIcon && (
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-inner bg-primary/8 text-primary transition-colors duration-120 group-data-active/option:bg-primary group-data-active/option:text-surface [&_svg]:size-4"
                >
                  {optionIcon(option)}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate">{highlight(option, filtering ? value : '')}</span>
              {option === value && <Check aria-hidden="true" className="size-4 shrink-0 text-primary" />}
            </li>
          ))}
        </ul>
      </Popover>
    </div>
  );
}
