import { ArrowRight } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router';
import { SectionError } from '@/components/errors/section-error';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { SectionHeading } from '@/components/layout/section-heading';
import { Magnet } from '@/components/motion/magnet';
import { swapUp } from '@/components/motion/presets';
import { Reveal, Stagger, StaggerItem } from '@/components/motion/reveal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconBadge } from '@/components/ui/icon-badge';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { tabId, tabPanelId } from '@/components/ui/tab-ids';
import { usePolicies } from '@/features/content/content-api';
import { CtaBand } from '@/features/content/cta-band';
import { EligibilitySummary, EligibilitySummarySkeleton } from '@/features/content/eligibility-summary';
import { PageHero } from '@/features/content/page-hero';
import { seoPage } from '@/seo/pages';
import {
  closing,
  eligibilityCard,
  guestJourney,
  hero,
  hostJourney,
  journeyHeading,
  journeyTabs,
  pillars,
  pillarsHeading,
  type Journey,
  type JourneyStep,
} from './how-it-works-content';

const TAB_PREFIX = 'journey';

/** One journey as a timeline: an icon for each step, joined by a hairline. */
function JourneySteps({ steps }: { steps: JourneyStep[] }) {
  return (
    <ol className="grid">
      {steps.map(({ icon: Icon, title, text }, index) => (
        <li
          key={title}
          className="relative grid grid-cols-[3rem_minmax(0,1fr)] gap-x-5 pb-10 last:pb-0 sm:grid-cols-[3.5rem_minmax(0,1fr)] sm:gap-x-7"
        >
          {index < steps.length - 1 && (
            <span
              aria-hidden="true"
              className="absolute top-12 bottom-0 left-6 w-px bg-line sm:top-14 sm:left-7"
            />
          )}
          <span
            aria-hidden="true"
            className="relative flex size-12 items-center justify-center rounded-full bg-surface text-primary shadow-card ring-1 ring-line sm:size-14 [&_svg]:size-5"
          >
            <Icon />
          </span>
          <div className="pt-1 sm:pt-2">
            <p className="eyebrow text-primary">Step {index + 1}</p>
            <h3 className="mt-1.5 text-xl font-semibold">{title}</h3>
            <p className="mt-2 max-w-xl leading-relaxed text-muted">{text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function JourneySection() {
  const [journey, setJourney] = useState<Journey>('renting');

  return (
    <section aria-labelledby="journey-heading" className="py-16 sm:py-24 lg:py-28">
      <Container className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading id="journey-heading" {...journeyHeading} />
          <SegmentedTabs
            idPrefix={TAB_PREFIX}
            label="Show the steps for"
            options={journeyTabs}
            value={journey}
            onChange={setJourney}
            className="mt-8 w-full max-w-sm"
          />
        </Reveal>

        <div
          role="tabpanel"
          id={tabPanelId(TAB_PREFIX, journey)}
          aria-labelledby={tabId(TAB_PREFIX, journey)}
        >
          <AnimatePresence mode="wait" initial={false}>
            <m.div key={journey} {...swapUp}>
              <JourneySteps steps={journey === 'renting' ? guestJourney : hostJourney} />
            </m.div>
          </AnimatePresence>
        </div>
      </Container>
    </section>
  );
}

/** Who can drive, from the eligibility rules in force (GET /policies). */
function EligibilityCard() {
  const policies = usePolicies();

  return (
    <div className="flex h-full flex-col rounded-card bg-primary p-6 text-canvas inset-shadow-highlight lg:p-8">
      <h3 className="headline text-2xl font-medium">{eligibilityCard.title}</h3>
      <div className="mt-6 flex-1">
        {policies.isPending && <EligibilitySummarySkeleton />}
        {policies.isError && (
          <SectionError
            title="We couldn’t load the driver rules"
            description="Try again in a moment."
            onRetry={() => policies.refetch()}
            className="bg-surface"
          />
        )}
        {policies.data && <EligibilitySummary eligibility={policies.data.eligibility} tone="dark" />}
      </div>
      <p className="mt-6 text-sm text-canvas/85">{eligibilityCard.footnote}</p>
    </div>
  );
}

function PillarsSection() {
  return (
    <section
      aria-labelledby="pillars-heading"
      className="border-y border-line bg-surface py-16 sm:py-24 lg:py-28"
    >
      <Container>
        <Reveal>
          <SectionHeading id="pillars-heading" {...pillarsHeading} />
        </Reveal>

        <Stagger as="ul" className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map(({ icon: Icon, title, text, link }, index) => (
            <StaggerItem as="li" key={title} index={index}>
              <Card spotlight variant="flat" className="flex h-full flex-col p-6 lg:p-8">
                <IconBadge size="lg" shape="square">
                  <Icon />
                </IconBadge>
                <h3 className="mt-6 text-lg font-semibold">{title}</h3>
                <p className="mt-2 flex-1 leading-relaxed text-muted">{text}</p>
                {link && (
                  <Link
                    to={link.to}
                    viewTransition
                    className="mt-5 inline-flex min-h-11 items-center gap-1.5 self-start font-medium text-primary transition-colors duration-120 hover:text-primary-hover"
                  >
                    {link.label}
                    <ArrowRight aria-hidden="true" className="nudge-right size-4" />
                  </Link>
                )}
              </Card>
            </StaggerItem>
          ))}
          <StaggerItem as="li" index={pillars.length}>
            <EligibilityCard />
          </StaggerItem>
        </Stagger>
      </Container>
    </section>
  );
}

/** How It Works (plan §9, Days 12–14; spec §3, §28): both journeys, what protects them, and where to start. */
export function HowItWorksPage() {
  return (
    <>
      <PageMeta page={seoPage('/how-it-works')} />
      <PageHero
        tone="dark"
        eyebrow={hero.eyebrow}
        title={hero.title}
        lead={<p>{hero.lead}</p>}
        actions={
          <>
            <Button asChild size="lg">
              <Link to="/cars" viewTransition>
                Browse cars
                <ArrowRight aria-hidden="true" className="nudge-right" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline-light">
              <Link to="/become-a-host" viewTransition>
                Become a host
              </Link>
            </Button>
          </>
        }
      />
      <JourneySection />
      <PillarsSection />
      <CtaBand
        id="how-it-works-next"
        title={closing.title}
        description={closing.description}
        actions={
          <>
            {/* The page's one accent call to action drifts towards the mouse. */}
            <Magnet>
              <Button variant="accent" size="lg" asChild>
                <Link to="/cars" viewTransition>
                  Browse cars
                  <ArrowRight aria-hidden="true" className="nudge-right" />
                </Link>
              </Button>
            </Magnet>
            <Button variant="outline-light" size="lg" asChild>
              <Link to="/become-a-host" viewTransition>
                Become a host
              </Link>
            </Button>
          </>
        }
      />
    </>
  );
}
