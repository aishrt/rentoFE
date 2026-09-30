import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Container } from '@/components/layout/container';
import { SectionHeading } from '@/components/layout/section-heading';
import { Reveal } from '@/components/motion/reveal';
import { IconButton } from '@/components/ui/icon-button';
import { featuredVehiclesQuery } from '@/features/vehicles/vehicle-api';
import { VehicleCard } from '@/features/vehicles/vehicle-card';

/*
 * The same row as FeaturedPlaceholder (featured-placeholder.tsx): keep the two in step. They're copied rather
 * than imported, because importing from the homepage's chunk would fold this chunk's needs into it.
 * Up to four cards across on desktop, two on tablets, and most of one on phones so the next one peeks in.
 */
const slideClasses =
  'w-[82%] shrink-0 snap-start sm:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-3*1.25rem)/4)]';
const trackClasses =
  '-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-5 overflow-x-auto px-4 py-5 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:-mx-8 lg:scroll-px-8 lg:px-8 [&::-webkit-scrollbar]:hidden';
const controlClasses = 'border border-line bg-surface shadow-card disabled:opacity-40';

/**
 * Featured vehicles (spec §4): the cars admins picked, or else the best-rated live cars, in a row that scrolls
 * sideways with ◀ ▶ buttons (plan §12.6). Swipe on phones; the row snaps to each card. Loaded as its own
 * chunk when it comes near the screen, and hidden if there are no cars or they can't load.
 */
export function FeaturedVehiclesSection({ placeholder }: { placeholder?: ReactNode }) {
  const featured = useQuery(featuredVehiclesQuery);
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const cars = featured.data ?? [];

  const updateEnds = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setAtStart(track.scrollLeft <= 4);
    setAtEnd(track.scrollLeft + track.clientWidth >= track.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(updateEnds);
    window.addEventListener('resize', updateEnds);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', updateEnds);
    };
  }, [updateEnds, cars.length]);

  if (featured.isPending) return placeholder ?? null;
  if (cars.length === 0) return null;

  const scrollByCard = (direction: 1 | -1) => {
    const track = trackRef.current;
    const card = track?.firstElementChild;
    if (!track || !(card instanceof HTMLElement)) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // One card and its gap (gap-5) at a time.
    track.scrollBy?.({
      left: direction * (card.offsetWidth + 20),
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  };

  return (
    <section aria-labelledby="featured-heading" className="py-16 sm:py-24 lg:py-28">
      <Container>
        <div className="flex items-end justify-between gap-6">
          <Reveal>
            <SectionHeading
              id="featured-heading"
              eyebrow="Featured cars"
              title="Ready when you are"
              description="Some of the best-loved cars from hosts around the country."
            />
          </Reveal>
          <div className="flex shrink-0 gap-2">
            <IconButton
              label="Previous cars"
              disabled={atStart}
              onClick={() => scrollByCard(-1)}
              className={controlClasses}
            >
              <ChevronLeft aria-hidden="true" />
            </IconButton>
            <IconButton
              label="More cars"
              disabled={atEnd}
              onClick={() => scrollByCard(1)}
              className={controlClasses}
            >
              <ChevronRight aria-hidden="true" />
            </IconButton>
          </div>
        </div>

        {/* Swipe on phones; the row snaps to each card. */}
        <div ref={trackRef} onScroll={updateEnds} className={`${trackClasses} mt-8`}>
          {cars.map((car) => (
            <div key={car.id} className={slideClasses}>
              <VehicleCard vehicle={car} className="h-full" />
            </div>
          ))}
        </div>

        <Link
          to="/cars"
          viewTransition
          className="link-underline mt-4 inline-flex items-center gap-1.5 font-medium text-primary"
        >
          Browse all cars
          <ArrowRight aria-hidden="true" className="nudge-right size-4" />
        </Link>
      </Container>
    </section>
  );
}
