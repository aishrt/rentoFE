import { CircleCheck, Star } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError } from '@/api/client';
import type { Booking } from '@/api/types';
import { PageBackdrop } from '@/components/brand/page-backdrop';
import { TripRoute } from '@/components/brand/patterns/trip-route';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { Alert } from '@/components/ui/alert';
import { BackLink } from '@/components/ui/back-link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { IconBadge } from '@/components/ui/icon-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { RequireSignedIn } from '@/features/auth/require-signed-in';
import { useBookingDetail } from '@/features/booking/booking-api';
import { formatNzDate, formatTripSpan } from '@/features/booking/booking-format';
import { useMyReviews, useSubmitReview } from '@/features/reviews/reviews-api';
import { StarInput } from '@/features/reviews/star-input';

type Scores = { overall: number; communication: number; pickupReturn: number; detail: number };

function ReviewForm({ booking }: { booking: Booking }) {
  const guest = booking.role === 'GUEST';
  const other = guest ? booking.host.firstName : booking.guest.firstName;
  const submit = useSubmitReview();
  const reviews = useMyReviews();
  const [scores, setScores] = useState<Scores>({ overall: 0, communication: 0, pickupReturn: 0, detail: 0 });
  const [body, setBody] = useState('');
  const [tried, setTried] = useState(false);
  const back = guest ? `/trips/${booking.ref}` : `/host/bookings/${booking.ref}`;

  const already = reviews.data?.written.find((review) => review.bookingRef === booking.ref);
  const waiting = reviews.data?.toWrite.find((item) => item.bookingRef === booking.ref);

  if (submit.isSuccess || already) {
    const review = submit.data ?? already!;
    return (
      <EmptyState
        className="mx-auto py-10"
        titleAs="h2"
        visual={
          <IconBadge size="xl">
            <CircleCheck />
          </IconBadge>
        }
        title="Thanks for your review"
        description={
          review.moderation === 'HELD'
            ? 'Our team checks it before it’s published, as it may include contact details, a link or strong language.'
            : review.status === 'PUBLISHED'
              ? `It’s published, together with ${other}’s review of you.`
              : `It’s published once ${other} reviews you too${review.revealAt ? `, or on ${formatNzDate(review.revealAt)}` : ''}, so neither of you sees the other’s first.`
        }
        actions={
          <Button asChild>
            <Link to="/account/reviews">Your reviews</Link>
          </Button>
        }
      />
    );
  }
  if (reviews.data && !waiting) {
    return (
      <EmptyState
        className="mx-auto py-10"
        titleAs="h2"
        visual={
          <IconBadge size="xl">
            <Star />
          </IconBadge>
        }
        title="This trip can’t be reviewed"
        description={
          booking.status === 'COMPLETED'
            ? 'The time to review it has passed.'
            : 'You can review a trip once it’s completed.'
        }
        actions={
          <Button asChild variant="secondary">
            <Link to={back}>Back to the booking</Link>
          </Button>
        }
      />
    );
  }

  const missing = (score: number) => (tried && score === 0 ? 'Choose a rating' : undefined);
  const send = () => {
    setTried(true);
    if (Object.values(scores).some((score) => score === 0)) return;
    submit.mutate({
      bookingRef: booking.ref,
      overall: scores.overall,
      communication: scores.communication,
      pickupReturn: scores.pickupReturn,
      ...(guest ? { cleanliness: scores.detail } : { care: scores.detail }),
      ...(body.trim() && { body: body.trim() }),
    });
  };
  const fieldErrors = submit.error instanceof ApiError ? submit.error.fields : undefined;

  return (
    <Card className="grid gap-6 p-5 sm:p-7">
      <StarInput
        legend={guest ? 'Overall, how was the trip?' : `Overall, how was ${other} as a guest?`}
        value={scores.overall}
        onChange={(overall) => setScores((current) => ({ ...current, overall }))}
        error={missing(scores.overall)}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <StarInput
          legend="Communication"
          value={scores.communication}
          onChange={(communication) => setScores((current) => ({ ...current, communication }))}
          error={missing(scores.communication)}
        />
        <StarInput
          legend="Pick-up and return"
          value={scores.pickupReturn}
          onChange={(pickupReturn) => setScores((current) => ({ ...current, pickupReturn }))}
          error={missing(scores.pickupReturn)}
        />
        <StarInput
          legend={guest ? 'Cleanliness and condition of the car' : 'Care of the car'}
          value={scores.detail}
          onChange={(detail) => setScores((current) => ({ ...current, detail }))}
          error={missing(scores.detail) ?? fieldErrors?.cleanliness ?? fieldErrors?.care}
        />
      </div>
      <Field
        label="Your review (optional)"
        description={
          guest
            ? 'What should other guests know about the car and the host? Please leave out phone numbers, emails and links.'
            : 'What should other hosts know about this guest? Please leave out phone numbers, emails and links.'
        }
      >
        <Textarea rows={5} maxLength={1000} value={body} onChange={(event) => setBody(event.target.value)} />
      </Field>
      <p className="text-sm text-muted">
        {other} can’t see your review until they’ve written theirs, or the time to review runs out
        {waiting ? ` on ${formatNzDate(waiting.closesAt)}` : ''}.
      </p>
      {submit.isError && (
        <Alert variant="danger" role="alert">
          {submit.error.message}
        </Alert>
      )}
      <Button size="lg" loading={submit.isPending} onClick={send} className="justify-self-start">
        Publish review
      </Button>
    </Card>
  );
}

function WriteReview({ bookingRef }: { bookingRef: string }) {
  const booking = useBookingDetail(bookingRef);
  if (booking.isError) {
    return (
      <Alert variant="danger" role="alert" title="We couldn’t find that trip">
        {booking.error.message}
      </Alert>
    );
  }
  if (!booking.data) return <ReviewSkeleton />;
  const data = booking.data;
  const guest = data.role === 'GUEST';
  return (
    <div className="grid gap-6">
      <div>
        <BackLink to={guest ? `/trips/${data.ref}` : `/host/bookings/${data.ref}`}>
          Back to the booking
        </BackLink>
        <p className="eyebrow mt-4 text-primary">
          {data.vehicle.title} · {formatTripSpan(data.start, data.end)}
        </p>
        <h1 className="headline mt-2 text-title-3 font-medium">
          {guest ? `Review ${data.host.firstName} and the car` : `Review ${data.guest.firstName}`}
        </h1>
      </div>
      <ReviewForm booking={data} />
    </div>
  );
}

function ReviewSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-6">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-96 rounded-card" />
    </div>
  );
}

/** Writing a review of a completed trip (spec §16): the Guest reviews the Host and car, the Host the Guest. */
export function WriteReviewPage() {
  const { ref = '' } = useParams();
  return (
    <Container className="max-w-3xl py-8 sm:py-12">
      <PageBackdrop art={TripRoute} />
      <PageMeta title="Write a review" noindex />
      <RequireSignedIn fallback={<ReviewSkeleton />}>
        {() => <WriteReview key={ref} bookingRef={ref.toUpperCase()} />}
      </RequireSignedIn>
    </Container>
  );
}
