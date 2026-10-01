import { ArrowRight } from 'lucide-react';
import { useId } from 'react';
import { Link } from 'react-router';
import type { DecisionKey, PlatformSettingsResponse } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { IconBadge } from '@/components/ui/icon-badge';
import { formatLongDateNz } from '@/lib/format';
import { settingsSearch } from '../settings-view';
import { SETTINGS_GROUPS } from './settings-groups';

interface PlatformOverviewProps extends PlatformSettingsResponse {
  unsaved: ReadonlySet<DecisionKey>;
}

/**
 * The first page of Platform settings: how many of the client's decisions are confirmed, and a card per
 * group with the values in force, each opening that group's settings.
 */
export function PlatformOverview({ settings, updatedAt, updatedBy, unsaved }: PlatformOverviewProps) {
  const headingId = useId();
  const total = SETTINGS_GROUPS.length;
  const pending = SETTINGS_GROUPS.filter(({ key }) => settings.decisions[key].status === 'PENDING').length;
  const confirmed = total - pending;

  return (
    <section aria-labelledby={headingId} className="grid gap-6">
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="eyebrow text-primary">The client&rsquo;s decisions</p>
            <h2 id={headingId} className="mt-2 text-lg font-semibold text-ink">
              {pending > 0
                ? `${pending} of ${total} decisions are still placeholders`
                : 'The client has confirmed every decision'}
            </h2>
            <p className="mt-1 max-w-xl text-sm text-muted">
              The values in force apply straight away to new quotes, listings and pages, confirmed or not.
              Bookings already made keep their terms.
            </p>
          </div>
          <p className="shrink-0 sm:text-right">
            <span className="headline text-stat font-medium text-ink">
              {confirmed}
              <span className="text-muted">/{total}</span>
            </span>
            <span className="block text-sm text-muted">confirmed</span>
          </p>
        </div>
        <div aria-hidden="true" className="mt-6 h-2 overflow-hidden rounded-full bg-ink/6">
          <div
            className="h-full origin-left rounded-full bg-primary transition-transform duration-700 ease-out"
            style={{ transform: `scaleX(${confirmed / total})` }}
          />
        </div>
        {updatedAt && (
          <p className="mt-3 text-sm text-muted">
            Last saved{updatedBy ? ` by ${updatedBy}` : ''} on {formatLongDateNz(new Date(updatedAt))}.
          </p>
        )}
      </Card>

      <ul aria-label="Settings groups" className="grid gap-4 sm:grid-cols-2">
        {SETTINGS_GROUPS.map(({ key, label, icon: Icon, summary }) => {
          const isConfirmed = settings.decisions[key].status === 'CONFIRMED';
          const id = (part: string) => `${headingId}-${key}-${part}`;
          const hasUnsaved = unsaved.has(key);
          return (
            <li key={key}>
              <Card asChild className="lift-card flex h-full flex-col gap-4 p-5 active:scale-98">
                {/* Named by the group alone; its status and values describe it. */}
                <Link
                  to={{ search: settingsSearch(key) }}
                  replace
                  aria-labelledby={id('label')}
                  aria-describedby={[id('status'), id('summary'), hasUnsaved && id('unsaved')]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className="flex items-start justify-between gap-3">
                    <IconBadge size="sm" tone={isConfirmed ? 'solid' : 'soft'}>
                      <Icon />
                    </IconBadge>
                    {isConfirmed ? (
                      <Badge id={id('status')} variant="primary">
                        Confirmed
                      </Badge>
                    ) : (
                      <Badge id={id('status')} variant="outline">
                        Placeholder
                      </Badge>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span id={id('label')} className="block font-semibold text-ink">
                      {label}
                    </span>
                    <span id={id('summary')} className="mt-1 block text-sm text-muted">
                      {summary(settings)}
                    </span>
                  </span>
                  {hasUnsaved ? (
                    <span className="flex items-center gap-2 pr-6 text-sm font-medium text-primary">
                      <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
                      <span id={id('unsaved')}>Unsaved changes</span>
                    </span>
                  ) : (
                    <span aria-hidden="true" className="pr-6 text-sm font-medium text-primary">
                      Change
                    </span>
                  )}
                  {/* A direct child of the link, so it nudges when any part of the card is hovered. */}
                  <ArrowRight
                    aria-hidden="true"
                    className="nudge-right absolute right-5 bottom-5.5 size-4 text-primary"
                  />
                </Link>
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
