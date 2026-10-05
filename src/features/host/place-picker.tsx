import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Building2, Check, MapPin, Mountain, Plane, type LucideIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import { client, unwrap } from '@/api/client';
import type { PlaceSuggestion } from '@/api/types';
import { Input } from '@/components/ui/input';
import { Popover } from '@/components/ui/popover';
import { assignRef } from '@/lib/assign-ref';
import type { PlaceChoice } from './place-choice';

type PlaceType = PlaceSuggestion['type'];

const ICONS: Partial<Record<PlaceType, LucideIcon>> = {
  CITY: Building2,
  SUBURB: MapPin,
  AIRPORT: Plane,
  DESTINATION: Mountain,
};

/** How long typing pauses before suggestions are fetched, in ms. */
const DEBOUNCE = 200;

function useDebounced<Value>(value: Value, delay: number): Value {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

interface PlacePickerProps {
  value: PlaceChoice;
  onValueChange: (value: PlaceChoice) => void;
  onBlur?: () => void;
  /** Which of our places to offer, e.g. only airports. */
  types: readonly PlaceType[];
  placeholder?: string;
  /** Heads the list before anything is typed. */
  listLabel: string;
  leadingIcon?: ReactNode;
  name?: string;
  ref?: Ref<HTMLInputElement>;
}

/**
 * Chooses one of our NZ places (plan §3, `places`): a suburb or town for an address, whose coordinates
 * become where the car is found in search, or an airport for airport delivery. It works like the site's
 * Combobox: the list opens as you type or on a click, arrows move, Enter chooses, Escape closes, and focus
 * stays in the field. The street is typed beside it, so it asks for our places only, never Google's addresses.
 */
export function PlacePicker({
  value,
  onValueChange,
  onBlur,
  types,
  placeholder,
  listLabel,
  leadingIcon = <MapPin />,
  name,
  ref,
}: PlacePickerProps) {
  const listId = useId();
  const anchorRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [active, setActive] = useState(-1);
  const text = typing ? value.label.trim() : '';
  const query = useDebounced(text, DEBOUNCE);

  const suggestions = useQuery({
    queryKey: ['places', 'suggest', query, 'ours'],
    // Only our places: the street is typed, so Google's addresses would be fetched (and billed) for nothing.
    queryFn: async ({ signal }) =>
      (
        await unwrap(
          client.GET('/places/suggest', { params: { query: { q: query, oursOnly: true } }, signal }),
        )
      ).suggestions,
    enabled: open,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });

  const options = open ? (suggestions.data ?? []).filter((place) => types.includes(place.type)) : [];
  const settled = query === text && !suggestions.isFetching && suggestions.isSuccess;
  const noMatches = open && settled && text.length > 0 && options.length === 0;
  const expanded = open && (options.length > 0 || noMatches);
  const optionId = (index: number) => `${listId}-${index}`;

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

  const choose = (place: PlaceSuggestion) => {
    const city = place.type === 'SUBURB' ? (place.city ?? place.secondary?.split(',')[0]?.trim()) : undefined;
    onValueChange({
      // "Ponsonby, Auckland": a suburb with its city, as saved addresses show it.
      label: city ? `${place.label}, ${city}` : place.label,
      id: place.id,
      type: place.type,
      name: place.name,
      secondary: place.secondary,
      code: place.code,
      city: place.city,
      region: place.region,
      lat: place.lat,
      lng: place.lng,
    });
    setTyping(false);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const last = options.length - 1;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const down = event.key === 'ArrowDown';
      if (!expanded) {
        setOpen(true);
        setActive(down ? 0 : last);
      } else if (options.length > 0) {
        setActive((current) =>
          down ? (current >= last ? 0 : current + 1) : current <= 0 ? last : current - 1,
        );
      }
    } else if (event.key === 'Enter' && expanded) {
      // Enter chooses the highlighted place, or the only one, instead of submitting the step.
      const place = options[active] ?? (options.length === 1 ? options[0] : undefined);
      if (place) {
        event.preventDefault();
        choose(place);
      }
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
    }
  };

  const status = !open
    ? ''
    : options.length > 0
      ? `${options.length} ${options.length === 1 ? 'place' : 'places'} suggested. Use the up and down arrows to choose.`
      : noMatches
        ? 'No places match.'
        : '';

  return (
    <div ref={anchorRef}>
      <Input
        ref={(node) => assignRef(ref, node)}
        name={name}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={expanded ? listId : undefined}
        aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        value={value.label}
        onChange={(event) => {
          // Typing replaces a chosen place, so its coordinates no longer apply.
          onValueChange({ label: event.target.value });
          setTyping(true);
          setActive(-1);
          setOpen(true);
        }}
        onClick={() => setOpen(true)}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        leadingIcon={leadingIcon}
      />
      <span aria-live="polite" className="sr-only">
        {status}
      </span>
      <Popover
        ref={popoverRef}
        open={expanded}
        onOpenChange={setOpen}
        anchorRef={anchorRef}
        matchWidth
        className="scrollbar-subtle max-h-80 p-1.5"
      >
        {!typing && options.length > 0 && (
          <p aria-hidden="true" className="eyebrow px-2.5 pt-2 pb-1.5 text-muted">
            {listLabel}
          </p>
        )}
        <ul id={listId} role="listbox" aria-label={typing ? 'Suggested places' : listLabel}>
          {options.map((place, index) => {
            const Icon = ICONS[place.type] ?? MapPin;
            return (
              <li
                key={place.id}
                id={optionId(index)}
                role="option"
                aria-selected={index === active}
                data-active={index === active || undefined}
                onMouseDown={(event) => event.preventDefault()}
                onPointerMove={() => setActive(index)}
                onClick={() => choose(place)}
                className="group/option flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-control px-2.5 py-1.5 text-sm text-ink transition-colors duration-120 data-active:bg-ink/5"
              >
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-inner bg-primary/8 text-primary transition-colors duration-120 group-data-active/option:bg-primary group-data-active/option:text-surface [&_svg]:size-4"
                >
                  <Icon />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{place.label}</span>
                  {place.secondary && (
                    <span className="block truncate text-xs text-muted">{place.secondary}</span>
                  )}
                </span>
                {place.id === value.id && (
                  <Check aria-hidden="true" className="size-4 shrink-0 text-primary" />
                )}
              </li>
            );
          })}
        </ul>
        {noMatches && (
          <p className="px-2.5 py-3 text-sm text-muted">
            We don't have “{text}” yet. Try the nearest suburb or town.
          </p>
        )}
      </Popover>
    </div>
  );
}
