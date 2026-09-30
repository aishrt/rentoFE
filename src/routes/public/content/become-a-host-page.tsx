import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import type { PublicPolicies } from '@/api/types';
import { SectionError } from '@/components/errors/section-error';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { SectionHeading } from '@/components/layout/section-heading';
import { Magnet } from '@/components/motion/magnet';
import { Reveal, Stagger, StaggerItem } from '@/components/motion/reveal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckList } from '@/components/ui/check-list';
import { IconBadge } from '@/components/ui/icon-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionSkeleton } from '@/features/content/accordion';
import { useFaqs, usePolicies } from '@/features/content/content-api';
import { CtaBand } from '@/features/content/cta-band';
import { EarningsEstimator, EarningsEstimatorSkeleton } from '@/features/content/earnings-estimator';
import { PageHero } from '@/features/content/page-hero';
import { documentLabels, photoAngleLabels } from '@/features/content/policies';
import { formatNzdFromCents, formatNumber } from '@/lib/format';
import { seoPage } from '@/seo/pages';
import { motion } from '@/styles/tokens';
import {
  afterListing,
  applicationStep,
  benefits,
  closing,
  estimatorHeading,
  hero,
  listingSteps,
} from './become-a-host-content';

/** Where a new host starts: the Host application (plan §12.6, Host onboarding). */
const APPLY_PATH = '/host/apply';

type PoliciesQuery = ReturnType<typeof usePolicies>;

function BenefitsStrip() {
  return (
    <section aria-label="Why host with Rento Vroom" className="border-b border-line bg-surface">
      <Container>
        <Stagger as="ul" className="grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4 lg:py-12">
          {benefits.map(({ icon: Icon, title, text }, index) => (
            <StaggerItem as="li" key={title} index={index} className="flex items-start gap-4">
              <IconBadge>
                <Icon />
              </IconBadge>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}

function EstimatorSection({ policies }: { policies: PoliciesQuery }) {
  return (
    <section
      id="estimator"
      aria-labelledby="estimator-heading"
      className="scroll-mt-20 py-16 sm:py-24 lg:py-28"
    >
      <Container>
        <Reveal>
          <SectionHeading id="estimator-heading" {...estimatorHeading} />
        </Reveal>
        <Reveal delay={motion.stagger * 2} className="mt-10 sm:mt-12">
          {policies.isPending && <EarningsEstimatorSkeleton />}
          {policies.isError && (
            <SectionError
              title="We couldn’t load the estimator"
              description="Try again in a moment."
              onRetry={() => policies.refetch()}
            />
          )}
          {policies.data && (
            <EarningsEstimator
              estimator={policies.data.hostEstimator}
              hostCommissionPct={policies.data.fees.hostCommissionPct}
            />
          )}
        </Reveal>
      </Container>
    </section>
  );
}

function HowHostingWorks() {
  return (
    <section
      aria-labelledby="hosting-steps-heading"
      className="border-y border-line bg-surface py-16 sm:py-24 lg:py-28"
    >
      <Container>
        <Reveal>
          <SectionHeading
            id="hosting-steps-heading"
            eyebrow="How hosting works"
            title="From application to first booking"
            description="Apply once, then add your car in six short steps. You can save and come back at any point."
          />
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,2.15fr)]">
          <Reveal>
            <div className="relative isolate flex h-full flex-col overflow-hidden rounded-card bg-ink p-6 text-canvas inset-shadow-highlight lg:p-8">
              <p className="eyebrow text-accent">Before you list</p>
              <h3 className="headline mt-3 text-2xl font-medium">{applicationStep.title}</h3>
              <p className="mt-3 text-canvas/85">{applicationStep.text}</p>
              <CheckList items={applicationStep.points} tone="dark" className="mt-6" />
            </div>
          </Reveal>

          <Stagger as="ol" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listingSteps.map((step, index) => (
              <StaggerItem as="li" key={step.title} index={index}>
                <Card spotlight variant="flat" className="h-full p-6">
                  <span
                    aria-hidden="true"
                    className="headline text-4xl leading-none font-medium text-primary"
                  >
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
        </div>

        <Reveal>
          <p className="mt-8 max-w-2xl text-muted">{afterListing}</p>
        </Reveal>
      </Container>
    </section>
  );
}

/** Documents, photo angles and price limits, straight from the listing rules in force. */
function Requirements({ vehicles }: { vehicles: PublicPolicies['vehicles'] }) {
  return (
    <div className="grid gap-10 sm:grid-cols-2 sm:gap-12">
      <div>
        <h3 className="text-lg font-semibold">Documents</h3>
        <CheckList items={vehicles.requiredDocuments.map((type) => documentLabels[type])} className="mt-4" />
        {vehicles.vinOrChassisRequired && (
          <p className="mt-4 text-sm text-muted">You’ll also need the car’s VIN or chassis number.</p>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold">Photos</h3>
        <p className="mt-2 text-sm text-muted">
          One clear photo of each, at least {formatNumber(vehicles.minPhotoWidthPx)} ×{' '}
          {formatNumber(vehicles.minPhotoHeightPx)} pixels. Most phone cameras are well above that.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {vehicles.requiredPhotoAngles.map((angle) => (
            <li key={angle} className="rounded-full border border-line bg-canvas px-3.5 py-1.5 text-sm">
              {photoAngleLabels[angle]}
            </li>
          ))}
        </ul>
      </div>

      <dl className="grid gap-6 border-t border-line pt-8 sm:col-span-2 sm:grid-cols-2">
        <div>
          <dt className="eyebrow text-muted">Daily price</dt>
          <dd className="mt-1.5 text-lg">
            From {formatNzdFromCents(vehicles.dailyPriceCents.min)} to{' '}
            {formatNzdFromCents(vehicles.dailyPriceCents.max)} a day, set by you
          </dd>
        </div>
        {vehicles.maxDiscountPct > 0 && (
          <div>
            <dt className="eyebrow text-muted">Weekly and monthly discounts</dt>
            <dd className="mt-1.5 text-lg">Up to {vehicles.maxDiscountPct}%, if you’d like to offer them</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

function RequirementsSection({ policies }: { policies: PoliciesQuery }) {
  return (
    <section aria-labelledby="requirements-heading" className="py-16 sm:py-24 lg:py-28">
      <Container className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
        <Reveal>
          <SectionHeading
            id="requirements-heading"
            eyebrow="What you’ll need"
            title="Have these to hand"
            description="Everything our team checks before your car goes live. It helps to gather it before you start."
          />
        </Reveal>
        <Reveal delay={motion.stagger * 2}>
          <Card className="p-6 sm:p-8 lg:p-10">
            {policies.isPending && (
              <div aria-busy="true" className="grid gap-4">
                <span className="sr-only">Loading what you’ll need</span>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-16 w-full" />
              </div>
            )}
            {policies.isError && (
              <SectionError
                title="We couldn’t load the listing requirements"
                description="Try again in a moment."
                onRetry={() => policies.refetch()}
              />
            )}
            {policies.data && <Requirements vehicles={policies.data.vehicles} />}
          </Card>
        </Reveal>
      </Container>
    </section>
  );
}

function HostFaqSection() {
  const faqs = useFaqs('HOST');

  return (
    <section
      aria-labelledby="host-faq-heading"
      className="border-y border-line bg-surface py-16 sm:py-24 lg:py-28"
    >
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <Reveal>
          <SectionHeading
            id="host-faq-heading"
            eyebrow="Host FAQs"
            title="Hosting questions, answered"
            description={
              <>
                More in our{' '}
                <Link to="/faq" viewTransition className="link-underline font-medium text-primary">
                  FAQs
                </Link>
                , or{' '}
                <Link to="/contact" viewTransition className="link-underline font-medium text-primary">
                  get in touch
                </Link>
                .
              </>
            }
          />
        </Reveal>
        <Reveal delay={motion.stagger * 2}>
          {faqs.isPending && <AccordionSkeleton />}
          {faqs.isError && (
            <SectionError
              title="We couldn’t load the questions"
              description="Try again in a moment."
              onRetry={() => faqs.refetch()}
            />
          )}
          {faqs.data && (
            <Accordion
              items={faqs.data.map((faq) => ({
                id: faq.id,
                title: faq.question,
                content: <p>{faq.answer}</p>,
              }))}
            />
          )}
        </Reveal>
      </Container>
    </section>
  );
}

/**
 * Become a Host (plan §9, Days 12–14; spec §4, §11): the proposition, an earnings estimate from the client's
 * assumptions, how onboarding works, what's needed, and the host FAQs. "Start your listing" opens the Host
 * application.
 */
export function BecomeAHostPage() {
  const policies = usePolicies();

  return (
    <>
      <PageMeta page={seoPage('/become-a-host')} />
      <PageHero
        tone="primary"
        eyebrow={hero.eyebrow}
        title={hero.title}
        lead={<p>{hero.lead}</p>}
        actions={
          <>
            {/* The page's one accent call to action drifts towards the mouse. */}
            <Magnet>
              <Button variant="accent" size="lg" asChild>
                <Link to={APPLY_PATH} viewTransition>
                  Start your listing
                  <ArrowRight aria-hidden="true" className="nudge-right" />
                </Link>
              </Button>
            </Magnet>
            <Button variant="outline-light" size="lg" asChild>
              <a href="#estimator">Estimate your earnings</a>
            </Button>
          </>
        }
      />
      <BenefitsStrip />
      <EstimatorSection policies={policies} />
      <HowHostingWorks />
      <RequirementsSection policies={policies} />
      <HostFaqSection />
      <CtaBand
        id="become-a-host-next"
        title={closing.title}
        description={closing.description}
        actions={
          <>
            <Button size="lg" asChild>
              <Link to={APPLY_PATH} viewTransition>
                Start your listing
                <ArrowRight aria-hidden="true" className="nudge-right" />
              </Link>
            </Button>
            <Button variant="outline-light" size="lg" asChild>
              <Link to="/host-agreement" viewTransition>
                Read the Host Agreement
              </Link>
            </Button>
          </>
        }
      />
    </>
  );
}
