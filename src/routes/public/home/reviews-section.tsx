import { useQuery } from '@tanstack/react-query';
import { Quote } from 'lucide-react';
import { client, unwrap } from '@/api/client';
import { Container } from '@/components/layout/container';
import { SectionHeading } from '@/components/layout/section-heading';
import { Reveal, Stagger, StaggerItem } from '@/components/motion/reveal';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { RatingStars } from '@/components/ui/rating-stars';

const monthYear = new Intl.DateTimeFormat('en-NZ', {
  month: 'long',
  year: 'numeric',
  timeZone: 'Pacific/Auckland',
});

/**
 * Customer reviews (spec §4): real, published reviews picked for the homepage. The section stays hidden
 * until there are enough of them (the threshold in settings, plan §12.6), and quietly hides if they can't
 * load. Loaded as its own chunk when it comes near the screen.
 */
export function ReviewsSection() {
  const featured = useQuery({
    queryKey: ['reviews', 'featured'],
    queryFn: ({ signal }) => unwrap(client.GET('/reviews/featured', { signal })),
    staleTime: 5 * 60_000,
  });
  const reviews = featured.data?.show ? featured.data.reviews : [];
  if (reviews.length === 0) return null;

  return (
    <section aria-labelledby="reviews-heading" className="scroll-mt-20 py-16 sm:py-24 lg:py-28">
      <Container>
        <Reveal>
          <SectionHeading
            id="reviews-heading"
            eyebrow="Customer reviews"
            title="Trips people loved"
            description="What guests said after their trips, in their own words."
          />
        </Reveal>

        <Stagger as="ul" className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review, index) => (
            <StaggerItem as="li" key={review.id} index={index}>
              <Card asChild spotlight className="h-full p-6 lg:p-7">
                <figure className="flex flex-col">
                  <div className="flex items-center justify-between gap-4">
                    <RatingStars value={review.overall} />
                    <Quote aria-hidden="true" className="size-6 text-primary/25" />
                  </div>
                  <blockquote className="mt-5 flex-1 text-lg leading-relaxed text-ink">
                    <p>“{review.body}”</p>
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-3 border-t border-line pt-5">
                    <Avatar initials={review.author.firstName.slice(0, 1).toUpperCase()} />
                    <div className="min-w-0 text-sm">
                      <p className="font-semibold text-ink">{review.author.firstName}</p>
                      <p className="truncate text-muted">
                        {[review.vehicleTitle, review.city].filter(Boolean).join(' · ')} ·{' '}
                        {monthYear.format(new Date(review.createdAt))}
                      </p>
                    </div>
                  </figcaption>
                </figure>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}
