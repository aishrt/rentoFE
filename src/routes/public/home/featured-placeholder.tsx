import { Container } from '@/components/layout/container';

// The same row as the featured section's (featured-vehicles-section.tsx): keep the two in step.
const slideClasses =
  'w-[82%] shrink-0 snap-start sm:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-3*1.25rem)/4)]';
const trackClasses = '-mx-4 flex gap-5 overflow-hidden px-4 py-5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8';

/**
 * Holds the featured cars' place, at their size, while the section's chunk and cars load. Plain markup, so
 * the homepage's first load doesn't carry the card's code (plan §12.5).
 */
export function FeaturedPlaceholder() {
  return (
    <section aria-hidden="true" className="py-16 sm:py-24 lg:py-28">
      <Container>
        <div className="skeleton h-4 w-28 rounded-md" />
        <div className="skeleton mt-4 h-10 w-80 max-w-full rounded-md" />
        <div className={`${trackClasses} mt-8`}>
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className={`${slideClasses} rounded-card border border-line/80 bg-surface shadow-card`}
            >
              <div className="skeleton aspect-4/3 rounded-t-card" />
              <div className="p-4">
                <div className="skeleton h-5 w-3/5 rounded-md" />
                <div className="skeleton mt-2 h-4 w-2/5 rounded-md" />
                <div className="skeleton mt-2 h-4 w-1/2 rounded-md" />
                <div className="skeleton mt-8 h-5 w-1/3 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
