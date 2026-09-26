import { useCallback, useState, type ReactNode } from 'react';
import { ErrorBoundary } from '@/components/errors/error-boundary';
import { PageMeta } from '@/components/layout/page-meta';
import type { SearchPrefill } from '@/features/search/hero-search-form';
import { DestinationsSection } from './destinations-section';
import { FaqSection } from './faq-section';
import { HeroSection } from './hero-section';
import { HostSection } from './host-section';
import { HowItWorksSection } from './how-it-works-section';
import { SafetySection } from './safety-section';
import { TrustStrip } from './trust-strip';

/** A section that disappears if it fails to render, so the rest of the homepage still works. */
function Isolated({ children }: { children: ReactNode }) {
  return <ErrorBoundary fallback={null}>{children}</ErrorBoundary>;
}

/*
 * Homepage (spec §4). Featured vehicles and customer reviews join once listings and reviews exist
 * (Phase 2 and 3); reviews stay hidden until the threshold in settings is reached (plan §12.6).
 */
export function HomePage() {
  const [prefill, setPrefill] = useState<SearchPrefill>();

  const chooseDestination = useCallback((where: string) => {
    setPrefill({ where, nonce: Date.now() });
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document
      .getElementById('search')
      ?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  }, []);

  return (
    <>
      <PageMeta description="Rent a car from local owners across New Zealand, or earn money by sharing your own car. All prices in NZD." />
      {/* The hero guards its search form itself, with a message, since search is what visitors came for. */}
      <HeroSection prefill={prefill} />
      <Isolated>
        <TrustStrip />
      </Isolated>
      <Isolated>
        <DestinationsSection onChoose={chooseDestination} />
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
        <FaqSection />
      </Isolated>
    </>
  );
}
