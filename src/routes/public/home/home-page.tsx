import { lazy, type ReactNode } from 'react';
import { ErrorBoundary } from '@/components/errors/error-boundary';
import { PageMeta } from '@/components/layout/page-meta';
import { seoPage } from '@/seo/pages';
import { DestinationsSection } from './destinations-section';
import { FaqSection } from './faq-section';
import { FeaturedPlaceholder } from './featured-placeholder';
import { HeroSection } from './hero-section';
import { HostSection } from './host-section';
import { HowItWorksSection } from './how-it-works-section';
import { SafetySection } from './safety-section';
import { TrustStrip } from './trust-strip';
import { WhenNear } from './when-near';

// Their own chunks, with the car card's code, loaded as they come near the screen (plan §12.5).
const FeaturedVehiclesSection = lazy(() =>
  import('./featured-vehicles-section').then((module) => ({ default: module.FeaturedVehiclesSection })),
);
const ReviewsSection = lazy(() =>
  import('./reviews-section').then((module) => ({ default: module.ReviewsSection })),
);

/** A section that disappears if it fails to render, so the rest of the homepage still works. */
function Isolated({ children }: { children: ReactNode }) {
  return <ErrorBoundary fallback={null}>{children}</ErrorBoundary>;
}

/*
 * Homepage (spec §4), in the order of plan §12.6: search, featured vehicles, destinations, how it works,
 * hosting, safety, customer reviews (hidden until the threshold in settings is reached) and FAQs.
 */
export function HomePage() {
  return (
    <>
      <PageMeta page={seoPage('/')} />
      {/* The hero guards its search form itself, with a message, since search is what visitors came for. */}
      <HeroSection />
      <Isolated>
        <TrustStrip />
      </Isolated>
      <Isolated>
        <WhenNear placeholder={<FeaturedPlaceholder />}>
          <FeaturedVehiclesSection placeholder={<FeaturedPlaceholder />} />
        </WhenNear>
      </Isolated>
      <Isolated>
        <DestinationsSection />
      </Isolated>
      <Isolated>
        <HowItWorksSection />
      </Isolated>
      <Isolated>
        <HostSection />
      </Isolated>
      <Isolated>
        <SafetySection />
      </Isolated>
      <Isolated>
        <WhenNear>
          <ReviewsSection />
        </WhenNear>
      </Isolated>
      <Isolated>
        <FaqSection />
      </Isolated>
    </>
  );
}
