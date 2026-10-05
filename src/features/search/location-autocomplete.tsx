import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Check, MapPin, Plane, X } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { client, unwrap } from '@/api/client';
import type { PlaceSuggestion } from '@/api/types';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Popover } from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import { assignRef } from '@/lib/assign-ref';
import { cn } from '@/lib/cn';
import type { PlaceType, PlaceValue } from './place';
import { useDebouncedValue } from './use-debounced-value';

// A plane for airports, a pin for everything else: each extra icon would be one more download on the homepage.
const placeIcon = (type: PlaceType) => (type === 'AIRPORT' ? Plane : MapPin);

/** How long typing pauses before suggestions are fetched, in ms. */
const DEBOUNCE = 200;

/** One token per search, so Google Places bills the typing and the chosen place as one session (plan §1.2). */
function newSessionToken(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  );
}

/** Lower case without accents, so "taupo" matches "Taupō". */
const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** The suggestion with the typed part in bold. */
function highlight(label: string, query: string): ReactNode {
  const needle = fold(query.trim());
  const folded = fold(label);
  const at = needle ? folded.indexOf(needle) : -1;
  // Folding keeps lengths for precomposed letters such as "ō"; if it didn't, skip the highlight.
  if (at < 0 || folded.length !== label.length) return label;
  return (
    <>
      {label.slice(0, at)}
      <mark className="bg-transparent font-semibold text-inherit">{label.slice(at, at + needle.length)}</mark>
      {label.slice(at + needle.length)}
    </>
  );
}

const toPlace = (suggestion: PlaceSuggestion): PlaceValue => ({
  label: suggestion.label,
  id: suggestion.id,
  type: suggestion.type,
  code: suggestion.code,
  lat: suggestion.lat,
  lng: suggestion.lng,
});

type LocationAutocompleteProps = Omit<
  ComponentProps<'input'>,
  'value' | 'defaultValue' | 'onChange' | 'type' | 'role'
> & {
  value: PlaceValue;
  onValueChange: (value: PlaceValue) => void;
  /** After a suggestion is chosen, e.g. to move on to the dates. */
  onChoose?: (place: PlaceValue) => void;
  /** Heads the list before anything is typed. */
  listLabel?: string;
};

/**
 * "Where are you going?" (spec §4, §21): NZ cities, suburbs, airports and destinations from our own places,
 * then street addresses from Google Places once it's set up, as you type. It works like the site's Combobox
 * (the WAI-ARIA combobox pattern): the list opens as you type, on a click or with the down arrow; arrows move
 * through it, Enter chooses and Escape closes, and focus stays in the field. A screen reader hears how many
 * places are suggested.
 *
 * The value holds the text and, once a suggestion is chosen, its id, type, coordinates and airport code.
 * Any text can still be searched: the API matches it to its best place.
 */
export function LocationAutocomplete({
  value,
  onValueChange,
  onChoose,
  listLabel = 'Popular places',
  onKeyDown,
  onClick,
  placeholder = 'City, airport or destination',
  ref,
  ...props
}: LocationAutocompleteProps) {
  const listId = useId();
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const sessionToken = useRef<string | null>(null);
  const latestValue = useRef(value);
  const [open, setOpen] = useState(false);
  // Suggestions follow the text only while typing; after a choice, the list shows popular places again.
  const [typing, setTyping] = useState(false);
  const [active, setActive] = useState(-1);
  const text = typing ? value.label.trim() : '';
  const query = useDebouncedValue(text, DEBOUNCE);

  useEffect(() => {
    latestValue.current = value;
  }, [value]);

  const suggestions = useQuery({
    queryKey: ['places', 'suggest', query],
    queryFn: async ({ signal }) =>
      (
        await unwrap(
          client.GET('/places/suggest', {
            params: { query: { q: query, sessionToken: sessionToken.current ?? undefined } },
            signal,
          }),
        )
      ).suggestions,
    enabled: open,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });

  const options = open ? (suggestions.data ?? []) : [];
  const settled = query === text && !suggestions.isFetching && suggestions.isSuccess;
  const noMatches = open && settled && text.length > 0 && options.length === 0;
  const expanded = open && (options.length > 0 || noMatches);
  // The first suggestions for what's typed are still on their way: say so rather than show nothing.
  const searching = open && text.length > 0 && options.length === 0 && !noMatches;
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

  const openList = () => {
    sessionToken.current ??= newSessionToken();
    setOpen(true);
  };

  const choose = (suggestion: PlaceSuggestion) => {
    const place = toPlace(suggestion);
    onValueChange(place);
    setTyping(false);
    setOpen(false);
    setActive(-1);
    const token = sessionToken.current ?? undefined;
    sessionToken.current = null;
    if (place.lat === undefined || place.lng === undefined) {
      // Street addresses come without coordinates. Ask with the same token, so it's still one session.
      void unwrap(
        client.GET('/places/{id}', {
          params: { path: { id: suggestion.id }, query: { sessionToken: token } },
        }),
      )
        .then(({ place: details }) => {
          if (latestValue.current.id === place.id)
            onValueChange({ ...place, lat: details.lat, lng: details.lng, code: details.code ?? place.code });
        })
        // Without coordinates the search still works from the label.
        .catch(() => {});
    }
    onChoose?.(place);
  };

  const clear = () => {
    onValueChange({ label: '' });
    setTyping(false);
    setActive(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const last = options.length - 1;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const down = event.key === 'ArrowDown';
      if (!expanded) {
        openList();
        setActive(event.altKey ? -1 : down ? 0 : last);
      } else if (options.length > 0) {
        setActive((current) =>
          down ? (current >= last ? 0 : current + 1) : current <= 0 ? last : current - 1,
        );
      }
    } else if (event.key === 'Enter' && expanded && active >= 0 && options[active]) {
      // Otherwise Enter submits the form with the text as typed.
      event.preventDefault();
      choose(options[active]);
    } else if (event.key === 'Escape' && open) {
      // Closes just the list, not a sheet the field sits in.
      event.preventDefault();
      setOpen(false);
    }
  };

  const status = !open
    ? ''
    : options.length > 0
      ? `${options.length} ${options.length === 1 ? 'place' : 'places'} suggested. Use the up and down arrows to choose.`
      : noMatches
        ? 'No places match. You can still search for what you typed.'
        : '';

  return (
    <div ref={anchorRef}>
      <Input
        {...props}
        ref={(node) => {
          inputRef.current = node;
          assignRef(ref, node);
        }}
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
          onValueChange({ label: event.target.value });
          setTyping(true);
          setActive(-1);
          openList();
        }}
        onClick={(event) => {
          onClick?.(event);
          openList();
        }}
        onKeyDown={handleKeyDown}
        leadingIcon={<MapPin />}
        trailing={
          // Always rendered so the input never remounts; hidden (and out of the tab order) when empty.
          <IconButton
            size="inset"
            label="Clear location"
            onClick={clear}
            className={cn(
              'transition-[opacity,scale,visibility,background-color,color]',
              value.label ? 'visible opacity-100' : 'invisible scale-90 opacity-0',
            )}
          >
            <X aria-hidden="true" />
          </IconButton>
        }
      />
      <span aria-live="polite" className="sr-only">
        {status}
      </span>
      <Popover
        ref={popoverRef}
        open={expanded || searching}
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
          {options.map((suggestion, index) => {
            const Icon = placeIcon(suggestion.type);
            return (
              <li
                key={suggestion.id}
                id={optionId(index)}
                role="option"
                aria-selected={index === active}
                data-active={index === active || undefined}
                // Keeps focus in the input while a suggestion is pressed.
                onMouseDown={(event) => event.preventDefault()}
                onPointerMove={() => setActive(index)}
                onClick={() => choose(suggestion)}
                className="group/option flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-control px-2.5 py-1.5 text-sm text-ink transition-colors duration-120 data-active:bg-ink/5"
              >
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-inner bg-primary/8 text-primary transition-colors duration-120 group-data-active/option:bg-primary group-data-active/option:text-surface [&_svg]:size-4"
                >
                  <Icon />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{highlight(suggestion.label, text)}</span>
                  {suggestion.secondary && (
                    <span className="block truncate text-xs text-muted">{suggestion.secondary}</span>
                  )}
                </span>
                {suggestion.id === value.id && (
                  <Check aria-hidden="true" className="size-4 shrink-0 text-primary" />
                )}
              </li>
            );
          })}
        </ul>
        {searching && (
          <p className="flex items-center gap-2.5 px-2.5 py-3 text-sm text-muted">
            <Spinner />
            Looking for places…
          </p>
        )}
        {noMatches && (
          <p className="px-2.5 py-3 text-sm text-muted">
            No places match “{text}”. Search anyway, and we'll look for the closest match.
          </p>
        )}
      </Popover>
    </div>
  );
}
