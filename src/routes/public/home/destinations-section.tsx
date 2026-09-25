import { ArrowUpRight } from 'lucide-react';
import { RidgeLines } from '@/components/brand/ridge-lines';
import { Container } from '@/components/layout/container';
import { SectionHeading } from '@/components/layout/section-heading';
import { Reveal, Stagger, StaggerItem } from '@/components/motion/reveal';
import { IconBadge } from '@/components/ui/icon-badge';
import { cn } from '@/lib/cn';
import { destinations } from './home-content';

interface DestinationsSectionProps {
  /** Fills the search form with the chosen place. City landing pages replace this in Phase 2 (plan §9). */
  onChoose: (place: string) => void;
}

export function DestinationsSection({ onChoose }: DestinationsSectionProps) {
  return (
    <section
      id="destinations"
      aria-labelledby="destinations-heading"
      className="scroll-mt-20 py-16 sm:py-24 lg:py-28"
    >
      <Container>
        <Reveal>
          <SectionHeading
            id="destinations-heading"
            eyebrow="Popular destinations"
            title="Where will you drive next?"
            description="Pick a place to start your search. Collect from a local host, or have the car waiting at the airport."
          />
        </Reveal>

        <Stagger
          as="ul"
          className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2 lg:gap-5"
        >
          {destinations.map((destination, index) => {
            const featured = index === 0;
            return (
              <StaggerItem
                as="li"
                key={destination.name}
                index={index}
                className={cn(featured && 'sm:col-span-2 lg:col-span-1 lg:row-span-2')}
              >
                <button
                  type="button"
                  onClick={() => onChoose(destination.name)}
                  aria-label={`Search cars in ${destination.name}`}
                  className={cn(
                    'lift-card group flex h-full w-full flex-col rounded-card p-6 text-left text-canvas active:scale-98',
                    featured ? 'min-h-72 lg:min-h-[30rem] lg:p-8' : 'min-h-56',
                    destination.tone,
                  )}
                >
                  {/*
                   * Clipped on its own layer, so the hover shadow outside the tile stays visible. On desktop the
                   * ridges drift with the scroll (plan §12.4); they start a little lower so no gap opens beneath.
                   */}
                  <span aria-hidden="true" className="absolute inset-0 overflow-hidden rounded-card">
                    <RidgeLines className="parallax absolute inset-x-0 bottom-0 h-2/5 w-full origin-bottom text-black transition-transform duration-700 ease-out group-hover:scale-104 lg:-bottom-3" />
                  </span>
                  <span className="relative flex items-start justify-between gap-4">
                    <span className="eyebrow text-gold">{destination.region}</span>
                    <IconBadge
                      tone="on-dark"
                      className="transition-transform duration-320 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    >
                      <ArrowUpRight />
                    </IconBadge>
                  </span>
                  <span className="relative mt-auto pt-10">
                    <span
                      className={cn(
                        'headline block leading-none font-medium',
                        featured ? 'text-5xl lg:text-6xl' : 'text-4xl',
                      )}
                    >
                      {destination.name}
                    </span>
                    {destination.maoriName && (
                      <span className="mt-2 block text-sm text-canvas/70">{destination.maoriName}</span>
                    )}
                    <span
                      className={cn('mt-3 block max-w-sm text-canvas/85', featured ? 'text-base' : 'text-sm')}
                    >
                      {destination.tagline}
                    </span>
                  </span>
                </button>
              </StaggerItem>
            );
          })}
        </Stagger>
      </Container>
    </section>
  );
}
