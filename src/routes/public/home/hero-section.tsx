import { ArrowRight } from 'lucide-react';
import { m } from 'motion/react';
import { Link } from 'react-router';
import { LandscapeArt } from '@/components/brand/landscape-art';
import { Container } from '@/components/layout/container';
import { ErrorBoundary } from '@/components/errors/error-boundary';
import { SectionError } from '@/components/errors/section-error';
import { BlurText } from '@/components/motion/blur-text';
import { fadeUp, heroTimeline } from '@/components/motion/presets';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HeroSearchForm, type SearchPrefill } from '@/features/search/hero-search-form';
import { motion } from '@/styles/tokens';

const HEADLINE = 'Rent a car from local owners across New Zealand.';
const TIMELINE = heroTimeline(HEADLINE.split(' ').length);

/**
 * The cinematic hero (plan §12.4): the landscape drifts slowly, the headline rises and comes into focus one
 * word after another, then the search panel glides up. A glint of light crosses the eyebrow now and then.
 * On desktop the landscape falls behind as the page scrolls. The spec's proposition and Become a Host
 * prompt sit here (spec §4).
 */
export function HeroSection({ prefill }: { prefill?: SearchPrefill }) {
  return (
    <section aria-labelledby="hero-heading" className="relative isolate overflow-hidden bg-ink text-canvas">
      <div aria-hidden="true" className="parallax-exit absolute inset-0 -z-10">
        <LandscapeArt idPrefix="hero-art" className="h-full w-full origin-[65%_60%] animate-hero-drift" />
        <div className="absolute inset-0 bg-linear-to-b from-ink/75 via-ink/40 to-ink/85 lg:bg-linear-to-r lg:from-ink/90 lg:via-ink/45 lg:to-ink/5" />
      </div>

      <Container className="grid gap-10 pt-12 pb-14 sm:pt-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center lg:gap-14 lg:pt-20 lg:pb-24 xl:gap-20">
        <div>
          <m.p className="eyebrow shiny-text text-accent" {...fadeUp(TIMELINE.eyebrow, motion.travel.sm)}>
            Car sharing across Aotearoa
          </m.p>
          <h1 id="hero-heading" className="headline mt-5 text-display font-medium">
            <BlurText text={HEADLINE} delay={TIMELINE.word(0)} />
          </h1>
          <m.p className="mt-6 max-w-lg text-lg leading-relaxed text-canvas/80" {...fadeUp(TIMELINE.body)}>
            City runabouts, family SUVs and EVs for the long way round, booked in minutes from people who live
            here.
          </m.p>
        </div>

        <m.div id="search" className="scroll-mt-24" {...fadeUp(TIMELINE.panel, motion.travel.lg)}>
          <ErrorBoundary
            fallback={({ reset }) => (
              <Card variant="raised" className="p-5 text-ink sm:p-6">
                <h2 className="headline text-2xl font-medium">Find your car</h2>
                <SectionError className="mt-5" title="Search isn't available right now" onRetry={reset} />
              </Card>
            )}
          >
            <HeroSearchForm prefill={prefill} />
          </ErrorBoundary>

          <Card
            variant="tinted"
            className="mt-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:pl-5"
          >
            <p className="text-canvas/85">
              <span className="font-semibold text-canvas">Have a car?</span> Earn money by sharing it.
            </p>
            <Button variant="outline-light" asChild className="shrink-0">
              <Link to="/#hosting">
                Become a Host
                <ArrowRight aria-hidden="true" className="nudge-right" />
              </Link>
            </Button>
          </Card>
        </m.div>
      </Container>
    </section>
  );
}
