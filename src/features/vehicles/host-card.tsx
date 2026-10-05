import { BadgeCheck, Star } from 'lucide-react';
import type { PublicHost } from '@/api/types';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/format';
import { ListingSection } from './listing-section';
import { formatRating } from './vehicle-format';

/**
 * The Host (spec §6: Host rating and trip history), with the trust signals plan §12.1 asks for at each
 * decision: identity verified, rating, completed trips and how reliably they answer requests.
 */
export function HostCard({ host }: { host: PublicHost }) {
  const facts = [
    {
      label: 'Rating',
      value:
        host.rating.count > 0 ? (
          <span className="inline-flex items-center gap-1">
            <Star aria-hidden="true" className="size-3.5 fill-primary text-primary" />
            {formatRating(host.rating.avg)}
            <span className="font-normal text-muted">({formatNumber(host.rating.count)})</span>
          </span>
        ) : (
          'New host'
        ),
    },
    { label: 'Trips', value: formatNumber(host.tripCount) },
    ...(host.responseRate !== undefined ? [{ label: 'Response rate', value: `${host.responseRate}%` }] : []),
  ];

  return (
    <ListingSection id="host" title={`Hosted by ${host.firstName}`}>
      <div className="rounded-card border border-line/80 bg-surface p-5 shadow-card sm:p-6">
        <div className="flex items-center gap-4">
          {host.avatarUrl ? (
            <img
              src={host.avatarUrl}
              alt=""
              width={56}
              height={56}
              loading="lazy"
              className="size-14 shrink-0 rounded-full object-cover"
            />
          ) : (
            <Avatar initials={host.firstName.slice(0, 1).toUpperCase()} className="size-14 text-lg" />
          )}
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-lg font-semibold text-ink">
              {host.firstName}
              {host.verified && (
                <Badge variant="primary">
                  <BadgeCheck aria-hidden="true" />
                  Identity verified
                </Badge>
              )}
            </p>
            <p className="text-sm text-muted">Hosting on Rento Vroom since {host.joinedYear}</p>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-line pt-5">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-xs text-muted">{fact.label}</dt>
              <dd className="mt-0.5 font-semibold text-ink tabular-nums">{fact.value}</dd>
            </div>
          ))}
        </dl>

        {host.bio && <p className="mt-5 leading-relaxed text-ink/85">{host.bio}</p>}
      </div>
    </ListingSection>
  );
}
