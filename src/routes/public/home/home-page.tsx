import { useCallback, useState } from 'react';
import { PageMeta } from '@/components/layout/page-meta';
import type { SearchPrefill } from '@/features/search/hero-search-form';
import { DestinationsSection } from './destinations-section';
import { FaqSection } from './faq-section';
import { HeroSection } from './hero-section';
import { HostSection } from './host-section';
import { HowItWorksSection } from './how-it-works-section';
import { SafetySection } from './safety-section';
import { TrustStrip } from './trust-strip';

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
      <HeroSection prefill={prefill} />
      <TrustStrip />
      <DestinationsSection onChoose={chooseDestination} />
      <HowItWorksSection />
      <HostSection />
      <SafetySection />
      <FaqSection />
    </>
  );
}
