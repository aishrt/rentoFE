import { ArrowRight, Ticket } from 'lucide-react';
import { Link } from 'react-router';
import { LighthouseArt } from '@/components/brand/scenes/lighthouse-art';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { SectionHeading } from '@/components/layout/section-heading';
import { Magnet } from '@/components/motion/magnet';
import { Reveal, Stagger, StaggerItem } from '@/components/motion/reveal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconBadge } from '@/components/ui/icon-badge';
import { CtaBand } from '@/features/content/cta-band';
import { EmergencyCall } from '@/features/content/emergency-call';
import { PageHero } from '@/features/content/page-hero';
import { seoPage } from '@/seo/pages';
import {
  closing,
  emergencyHeading,
  emergencySteps,
  features,
  featuresHeading,
  hero,
  scenarios,
  tollsAndFines,
} from './safety-content';

function FeaturesSection() {
  return (
    <section aria-labelledby="safety-features-heading" className="py-16 sm:py-24 lg:py-28">
      <Container>
        <Reveal>
          <SectionHeading id="safety-features-heading" {...featuresHeading} />
        </Reveal>
        <Stagger as="ul" className="mt-12 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text, link }, index) => (
            <StaggerItem as="li" key={title} index={index}>
              <IconBadge size="lg" shape="square">
                <Icon />
              </IconBadge>
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-2 leading-relaxed text-muted">{text}</p>
              {link && (
                <Link
                  to={link.to}
                  viewTransition
                  className="mt-3 inline-flex min-h-11 items-center gap-1.5 font-medium text-primary transition-colors duration-120 hover:text-primary-hover"
                >
                  {link.label}
                  <ArrowRight aria-hidden="true" className="nudge-right size-4" />
                </Link>
              )}
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}

function EmergencySection() {
  return (
    <section
      id="emergencies"
      aria-labelledby="emergency-heading"
      className="scroll-mt-20 border-y border-line bg-surface py-16 sm:py-24 lg:py-28"
    >
      <Container>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
          <Reveal>
            <SectionHeading id="emergency-heading" {...emergencyHeading} />
            <EmergencyCall className="mt-8" />
          </Reveal>

          <Stagger as="ol" className="grid content-start gap-10">
            {emergencySteps.map((step, index) => (
              <StaggerItem
                as="li"
                key={step.title}
                index={index}
                className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-5 sm:grid-cols-[3rem_minmax(0,1fr)]"
              >
                <span aria-hidden="true" className="headline text-5xl leading-none font-medium text-primary">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-xl font-semibold">{step.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted">{step.text}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>

        <Stagger as="ul" className="mt-16 grid gap-5 md:grid-cols-3 lg:mt-20">
          {scenarios.map((scenario, index) => (
            <StaggerItem as="li" key={scenario.title} index={index}>
              <Card variant="flat" className="h-full p-6 lg:p-8">
                <h3 className="headline text-2xl font-medium">{scenario.title}</h3>
                <ol className="mt-5 grid list-decimal gap-3 pl-5 marker:font-medium marker:text-primary">
                  {scenario.points.map((point) => (
                    <li key={point} className="pl-1 leading-relaxed text-ink/85">
                      {point}
                    </li>
                  ))}
                </ol>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}

function TollsSection() {
  return (
    <section aria-labelledby="tolls-heading" className="pt-16 sm:pt-24 lg:pt-28">
      <Container>
        <Reveal>
          <div className="grid gap-6 border-b border-line pb-12 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
            <div className="flex items-start gap-4">
              <IconBadge size="lg" shape="square">
                <Ticket />
              </IconBadge>
              <h2 id="tolls-heading" className="headline pt-1.5 text-3xl font-medium">
                {tollsAndFines.title}
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-relaxed text-muted">{tollsAndFines.text}</p>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

/**
 * Safety (plan §9, Days 12–14; spec §22): how members, listings, payments and handovers are checked, and what
 * to do after an accident, theft or breakdown: 111 first, then roadside assistance, then report it.
 */
export function SafetyPage() {
  return (
    <>
      <PageMeta page={seoPage('/safety')} />
      <PageHero
        tone="dark"
        art={LighthouseArt}
        eyebrow={hero.eyebrow}
        title={hero.title}
        lead={<p>{hero.lead}</p>}
        actions={
          <>
            <Button asChild size="lg">
              <a href="#emergencies">If something goes wrong</a>
            </Button>
            <Button asChild size="lg" variant="outline-light">
              <Link to="/insurance" viewTransition>
                Protection plans
              </Link>
            </Button>
          </>
        }
      />
      <FeaturesSection />
      <EmergencySection />
      <TollsSection />
      <CtaBand
        id="safety-next"
        title={closing.title}
        description={closing.description}
        actions={
          <>
            <Magnet>
              <Button variant="accent" size="lg" asChild>
                <Link to="/contact" viewTransition>
                  Contact us
                  <ArrowRight aria-hidden="true" className="nudge-right" />
                </Link>
              </Button>
            </Magnet>
            <Button variant="outline-light" size="lg" asChild>
              <Link to="/faq" viewTransition>
                Read the FAQs
              </Link>
            </Button>
          </>
        }
      />
    </>
  );
}
