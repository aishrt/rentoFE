import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Building2, Check, CircleAlert, MapPin, Mountain, Plane, type LucideIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import { ApiError, client, unwrap } from '@/api/client';
import type { PlaceDetails, PlaceSuggestion } from '@/api/types';
import { Input } from '@/components/ui/input';
import { Popover } from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import { newSessionToken } from '@/features/search/place';
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

const toChoice = (place: PlaceSuggestion | PlaceDetails): PlaceChoice => {
  const city = place.type === 'SUBURB' ? (place.city ?? place.secondary?.split(',')[0]?.trim()) : undefined;
  return {
    // "Ponsonby, Auckland": a suburb with its city, as saved addresses show it.
    label: city ? `${place.label}, ${city}` : place.label,
    id: place.id,
    type: place.type,
    name: place.name,
    secondary: place.secondary,
    code: place.code,
    city: place.city,
    region: place.region,
    ...('suburb' in place && place.suburb && { suburb: place.suburb }),
    ...('postcode' in place && place.postcode && { postcode: place.postcode }),
    ...('address' in place && place.address && { address: place.address }),
    lat: place.lat,
    lng: place.lng,
  };
};

interface PlacePickerProps {
  value: PlaceChoice;
  onValueChange: (value: PlaceChoice) => void;
  onBlur?: () => void;
  /**
   * Which places to offer, e.g. only airports. With `ADDRESS`, Google's addresses come too (plan §1.2), and
   * a chosen one is looked up for its coordinates and parts before it's passed on.
   */
  types: readonly PlaceType[];
  placeholder?: string;
  /** Heads the list before anything is typed. */
  listLabel: string;
  leadingIcon?: ReactNode;
  name?: string;
  ref?: Ref<HTMLInputElement>;
}

/**
 * Chooses a place (plan §3, `places`): a street address from Google, or one of our NZ suburbs and towns, whose
 * coordinates become where the car is found in search or where it's delivered; or one of our airports for
 * airport delivery. It works like the site's Combobox: the list opens as you type or on a click, arrows move,
 * Enter chooses, Escape closes, and focus stays in the field. Without `ADDRESS` it asks for our places only,
 * so Google isn't asked (and billed) for nothing.
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
  // One token per search, so Google bills the typing and the chosen address as one session (plan §1.2).
  const sessionToken = useRef<string | null>(null);
  const latestValue = useRef(value);
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [active, setActive] = useState(-1);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const text = typing ? value.label.trim() : '';
  const query = useDebounced(text, DEBOUNCE);
  const addresses = types.includes('ADDRESS');

  useEffect(() => {
    latestValue.current = value;
  }, [value]);

  const suggestions = useQuery({
    queryKey: ['places', 'suggest', query, addresses ? 'addresses' : 'ours'],
    queryFn: async ({ signal }) =>
      (
        await unwrap(
          client.GET('/places/suggest', {
            params: {
              query: addresses
                ? { q: query, sessionToken: sessionToken.current ?? undefined }
                : { q: query, oursOnly: true },
            },
            signal,
          }),
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

  const openList = () => {
    if (addresses) sessionToken.current ??= newSessionToken();
    setOpen(true);
  };

  const choose = (place: PlaceSuggestion) => {
    const choice = toChoice(place);
    onValueChange(choice);
    setTyping(false);
    setOpen(false);
    setActive(-1);
    setLookupError(null);
    const token = sessionToken.current ?? undefined;
    sessionToken.current = null;
    if (choice.lat !== undefined && choice.lng !== undefined) return;

    // Google's addresses come without coordinates. Ask with the same token, so it's still one session.
    setLookingUp(true);
    void unwrap(
      client.GET('/places/{id}', { params: { path: { id: place.id }, query: { sessionToken: token } } }),
    )
      .then(({ place: details }) => {
        if (latestValue.current.id === place.id) onValueChange(toChoice(details));
      })
      .catch((error: unknown) => {
        if (latestValue.current.id !== place.id) return;
        setLookupError(
          error instanceof ApiError
            ? error.message
            : "We couldn't look up that address just now. Please try again, or choose a town or suburb.",
        );
      })
      .finally(() => setLookingUp(false));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const last = options.length - 1;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const down = event.key === 'ArrowDown';
      if (!expanded) {
        openList();
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
        aria-busy={lookingUp || undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        value={value.label}
        onChange={(event) => {
          // Typing replaces a chosen place, so its coordinates no longer apply.
          onValueChange({ label: event.target.value });
          setTyping(true);
          setActive(-1);
          setLookupError(null);
          openList();
        }}
        onClick={openList}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        leadingIcon={leadingIcon}
        trailing={
          lookingUp ? (
            <span className="pointer-events-none flex items-center pr-3 text-muted">
              <Spinner label="Finding that address" />
            </span>
          ) : undefined
        }
      />
      {lookupError && (
        <p role="alert" className="mt-1.5 flex animate-fade-in items-start gap-1.5 text-sm text-danger">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{lookupError}</span>
        </p>
      )}
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
                  <span className="block truncate">
                    {place.type === 'ADDRESS' ? place.name : place.label}
                  </span>
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
            {addresses
              ? `No places match “${text}”. Check the spelling, or try the suburb or town.`
              : `We don't have “${text}” yet. Try the nearest suburb or town.`}
          </p>
        )}
      </Popover>
    </div>
  );
}
