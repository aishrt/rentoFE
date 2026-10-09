import { BadgeCheck, Star, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError } from '@/api/client';
import type { PublicProfile, Review } from '@/api/types';
import { PageBackdrop } from '@/components/brand/page-backdrop';
import { DotGrid } from '@/components/brand/patterns/dot-grid';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { BackLink } from '@/components/ui/back-link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PersonAvatar } from '@/features/messages/person-avatar';
import { ReportLink } from '@/features/reviews/report-link';
import { ReportReviewButton } from '@/features/reviews/report-review-button';
import { ReviewCard } from '@/features/reviews/review-card';
import { useMemberProfile } from '@/features/reviews/reviews-api';
import { formatRating } from '@/features/vehicles/vehicle-format';
import { formatNumber } from '@/lib/format';

type Rating = PublicProfile['asGuest']['rating'];

function RatingValue({ rating, none }: { rating: Rating; none: string }) {
  if (rating.count === 0) return <>{none}</>;
  return (
    <span className="inline-flex items-center gap-1">
      <Star aria-hidden="true" className="size-3.5 fill-primary text-primary" />
      {formatRating(rating.avg)}
      <span className="font-normal text-muted">
        ({formatNumber(rating.count)}
        <span className="sr-only"> {rating.count === 1 ? 'review' : 'reviews'}</span>)
      </span>
    </span>
  );
}

/** What the member's record says in one role: their rating, trips and, for a Host, response rate. */
function RoleFacts({ title, facts }: { title: string; facts: { label: string; value: ReactNode }[] }) {
  return (
    <div className="grid gap-3">
      <h2 className="eyebrow text-muted">{title}</h2>
      <dl className="grid grid-cols-3 gap-4">
        {facts.map((fact) => (
          <div key={fact.label} className="min-w-0">
            <dt className="text-xs text-muted">{fact.label}</dt>
            <dd className="mt-0.5 font-semibold text-ink tabular-nums">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ReviewSection({
  id,
  title,
  description,
  reviews,
  empty,
}: {
  id: string;
  title: string;
  description: string;
  reviews: Review[];
  empty: string;
}) {
  return (
    <section aria-labelledby={id} className="grid gap-4">
      <div>
        <h2 id={id} className="text-title-3 font-semibold text-ink">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      {reviews.length === 0 ? (
        <p className="rounded-card border border-dashed border-line px-5 py-6 text-center text-sm text-muted">
          {empty}
        </p>
      ) : (
        <ul className="grid gap-4">
          {reviews.map((review) => (
            <li key={review.id}>
              <ReviewCard
                review={review}
                show="author"
                action={
                  <ReportReviewButton reviewId={review.id} author={review.author} className="-mt-2 -mr-2" />
                }
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Member({ memberId }: { memberId: string }) {
  const member = useMemberProfile(memberId);

  if (member.isError) {
    const missing = member.error instanceof ApiError && member.error.status === 404;
    return (
      <EmptyState
        className="mx-auto py-10"
        visual={
          <IconBadge size="xl">
            <UserRound />
          </IconBadge>
        }
        title={missing ? 'We couldn’t find this member' : 'We couldn’t load this profile'}
        description={
          missing
            ? 'The link may be wrong, or they may no longer be a member of Rento Vroom.'
            : member.error.message
        }
        actions={
          missing ? (
            <Button asChild>
              <Link to="/cars">Browse cars</Link>
            </Button>
          ) : (
            <Button onClick={() => void member.refetch()}>Try again</Button>
          )
        }
      />
    );
  }
  if (!member.data) return <MemberSkeleton />;

  const { profile, reviews } = member.data;
  const name = profile.firstName;
  const fromGuests = reviews.filter((review) => review.direction === 'GUEST_TO_HOST');
  const fromHosts = reviews.filter((review) => review.direction === 'HOST_TO_GUEST');

  return (
    <div className="grid gap-10">
      <Card className="grid gap-6 p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <PersonAvatar name={name} photoUrl={profile.avatarUrl} className="size-20 text-xl" />
          <div className="min-w-0">
            <h1 className="headline truncate text-title-2 font-medium">{name}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
              {profile.verified && (
                <Badge variant="primary">
                  <BadgeCheck aria-hidden="true" />
                  Identity verified
                </Badge>
              )}
              <span>Member since {profile.joinedYear}</span>
            </p>
          </div>
          <ReportLink
            targetType="USER"
            targetId={profile.id}
            subject={name}
            label={`Report ${name}`}
            ownerId={profile.id}
            className="text-muted sm:ml-auto sm:self-start"
          />
        </div>
        <div className="grid gap-6 border-t border-line pt-6 sm:grid-cols-2">
          {profile.asHost && (
            <RoleFacts
              title="As a host"
              facts={[
                { label: 'Rating', value: <RatingValue rating={profile.asHost.rating} none="New host" /> },
                { label: 'Trips', value: formatNumber(profile.asHost.tripCount) },
                ...(profile.asHost.responseRate !== undefined
                  ? [{ label: 'Response rate', value: `${profile.asHost.responseRate}%` }]
                  : []),
              ]}
            />
          )}
          <RoleFacts
            title="As a guest"
            facts={[
              { label: 'Rating', value: <RatingValue rating={profile.asGuest.rating} none="New guest" /> },
              { label: 'Trips', value: formatNumber(profile.asGuest.tripCount) },
            ]}
          />
        </div>
      </Card>

      {(profile.asHost || fromGuests.length > 0) && (
        <ReviewSection
          id="reviews-as-host"
          title="Reviews from guests"
          description={`What guests said about ${name} as a host.`}
          reviews={fromGuests}
          empty={`No guest has reviewed ${name} yet.`}
        />
      )}
      <ReviewSection
        id="reviews-as-guest"
        title="Reviews from hosts"
        description={`What hosts said about ${name} as a guest.`}
        reviews={fromHosts}
        empty={`No host has reviewed ${name} yet.`}
      />
    </div>
  );
}

function MemberSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-10">
      <span className="sr-only">Loading the profile</span>
      <Skeleton className="h-64 rounded-card" />
      <div className="grid gap-4">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-36 rounded-card" />
      </div>
    </div>
  );
}

/**
 * A member's public profile (plan §6.2, §11): only their first name, photo, whether their identity is
 * verified, the year they joined, and their rating and trips as a guest and as a host (with a host's
 * response rate), then the published reviews about them in each role. Open to visitors, as the listing that
 * links to a Host's profile is, and kept out of search results.
 */
export function MemberPage() {
  const { id = '' } = useParams();
  return (
    <Container className="py-8 sm:py-12">
      <PageBackdrop art={DotGrid} />
      <PageMeta title="Member profile" noindex />
      <div className="mx-auto grid max-w-3xl gap-6">
        <BackLink to="/" previous>
          Back
        </BackLink>
        <Member key={id} memberId={id} />
      </div>
    </Container>
  );
}
