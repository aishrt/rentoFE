import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { CoverRings } from '@/components/brand/patterns/cover-rings';
import { SectionError } from '@/components/errors/section-error';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { SectionHeading } from '@/components/layout/section-heading';
import { Magnet } from '@/components/motion/magnet';
import { Reveal, Stagger, StaggerItem } from '@/components/motion/reveal';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePolicies } from '@/features/content/content-api';
import { CtaBand } from '@/features/content/cta-band';
import { PageHero } from '@/features/content/page-hero';
import { includedPlan } from '@/features/content/policies';
import {
  ExcessComparison,
  ProtectionPlans,
  ProtectionPlansSkeleton,
} from '@/features/content/protection-plans';
import { seoPage } from '@/seo/pages';
import { motion } from '@/styles/tokens';
import {
  checkoutHeading,
  checkoutSteps,
  closing,
  excessHeading,
  excessPoints,
  hero,
  partnerNote,
  plansHeading,
} from './insurance-content';

type PoliciesQuery = ReturnType<typeof usePolicies>;

function PlansSection({ policies }: { policies: PoliciesQuery }) {
  const included = policies.data && includedPlan(policies.data.protectionPlans);
  // The insurance partner's number, set by an admin (plan §16, item 9); hidden until it's set.
  const roadside = policies.data?.roadsideAssistance.phone;

  return (
    <section aria-labelledby="plans-heading" className="py-16 sm:py-24 lg:py-28">
      <Container>
        <Reveal>
          <SectionHeading
            id="plans-heading"
            {...plansHeading}
            description={
              included
                ? `${included.name} is included with every trip unless you choose another plan at checkout.`
                : 'Choose the plan that suits your trip at checkout.'
            }
          />
        </Reveal>
        <div className="mt-10 sm:mt-12">
          {policies.isPending && <ProtectionPlansSkeleton />}
          {policies.isError && (
            <SectionError
              title="We couldn’t load the protection plans"
              description="Try again in a moment."
              onRetry={() => policies.refetch()}
            />
          )}
          {policies.data && <ProtectionPlans plans={policies.data.protectionPlans} />}
          {roadside && (
            <p className="mt-6 text-muted">
              Broken down, or a flat battery? Call roadside assistance on{' '}
              <a
                href={`tel:${roadside.replace(/[^\d+]/g, '')}`}
                className="link-underline font-medium whitespace-nowrap text-primary"
              >
                {roadside}
              </a>
              .
            </p>
          )}
        </div>
      </Container>
    </section>
  );
}

function ExcessSection({ policies }: { policies: PoliciesQuery }) {
  return (
    <section
      aria-labelledby="excess-heading"
      className="border-y border-line bg-surface py-16 sm:py-24 lg:py-28"
    >
      <Container className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-20">
        <Reveal>
          <SectionHeading id="excess-heading" {...excessHeading} />
          <ul className="mt-6 grid gap-4 text-lg leading-relaxed text-muted">
            {excessPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={motion.stagger * 2}>
          <Card variant="flat" className="p-6 sm:p-8">
            <p className="eyebrow text-primary">Excess by plan</p>
            <div className="mt-6">
              {policies.isPending && (
                <div aria-busy="true" className="grid gap-6">
                  <span className="sr-only">Loading the excess for each plan</span>
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              )}
              {policies.isError && (
                <p className="text-muted">The excess for each plan will show here once the plans load.</p>
              )}
              {policies.data && <ExcessComparison plans={policies.data.protectionPlans} />}
            </div>
          </Card>
        </Reveal>
      </Container>
    </section>
  );
}

function CheckoutSection() {
  return (
    <section aria-labelledby="checkout-heading" className="py-16 sm:py-24 lg:py-28">
      <Container>
        <Reveal>
          <SectionHeading id="checkout-heading" {...checkoutHeading} />
        </Reveal>
        <Stagger as="ol" className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {checkoutSteps.map((step, index) => (
            <StaggerItem as="li" key={step.title} index={index}>
              <Card spotlight className="h-full p-6">
                <span aria-hidden="true" className="headline text-4xl leading-none font-medium text-primary">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-5 text-lg font-semibold">
                  <span className="sr-only">Step {index + 1}: </span>
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>

        <Reveal>
          <Alert title={partnerNote.title} className="mt-12 max-w-3xl animate-none">
            {partnerNote.text}
          </Alert>
        </Reveal>
      </Container>
    </section>
  );
}

/**
 * Insurance / Protection (plan §9, Days 12–14; spec §22, §23): the plans in force with the one included by
 * default, how the excess works, and choosing a plan at checkout.
 */
export function InsurancePage() {
  const policies = usePolicies();

  return (
    <>
      <PageMeta page={seoPage('/insurance')} />
      <PageHero
        tone="light"
        art={CoverRings}
        eyebrow={hero.eyebrow}
        title={hero.title}
        lead={<p>{hero.lead}</p>}
      />
      <PlansSection policies={policies} />
      <ExcessSection policies={policies} />
      <CheckoutSection />
      <CtaBand
        id="insurance-next"
        title={closing.title}
        description={closing.description}
        actions={
          <>
            <Magnet>
              <Button variant="accent" size="lg" asChild>
                <Link to="/safety" viewTransition>
                  Safety and incidents
                  <ArrowRight aria-hidden="true" className="nudge-right" />
                </Link>
              </Button>
            </Magnet>
            <Button variant="outline-light" size="lg" asChild>
              <Link to="/cars" viewTransition>
                Browse cars
              </Link>
            </Button>
          </>
        }
      />
    </>
  );
}
