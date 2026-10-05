import { ArrowRight, TriangleAlert } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { ConnectionArcs } from '@/components/brand/patterns/connection-arcs';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { Reveal } from '@/components/motion/reveal';
import { Card } from '@/components/ui/card';
import { IconBadge } from '@/components/ui/icon-badge';
import { ContactForm } from '@/features/content/contact-form';
import { EmergencyCall } from '@/features/content/emergency-call';
import { PageHero } from '@/features/content/page-hero';
import { seoPage } from '@/seo/pages';
import { motion } from '@/styles/tokens';
import { hero, quickAnswers, tripProblem } from './contact-content';

/** Contact Us (plan §9, Days 12–14): the form creates a support ticket; urgent help is one tap away beside it. */
export function ContactPage() {
  const [params] = useSearchParams();

  return (
    <>
      <PageMeta page={seoPage('/contact')} />
      <PageHero
        tone="light"
        art={ConnectionArcs}
        compact
        eyebrow={hero.eyebrow}
        title={hero.title}
        lead={<p>{hero.lead}</p>}
      />

      <section aria-label="Send us a message" className="py-12 sm:py-16 lg:py-20">
        <Container className="grid gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-12">
          <Reveal>
            <Card className="p-6 sm:p-8 lg:p-10">
              <ContactForm
                initialCategory={params.get('category')}
                initialBookingRef={params.get('booking')}
              />
            </Card>
          </Reveal>

          <Reveal delay={motion.stagger * 2}>
            <aside aria-label="Urgent help and quick answers" className="grid content-start gap-5">
              <EmergencyCall />

              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <IconBadge>
                    <TriangleAlert />
                  </IconBadge>
                  <div>
                    <h2 className="text-lg font-semibold">{tripProblem.title}</h2>
                    <p className="mt-1.5 leading-relaxed text-muted">{tripProblem.text}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-lg font-semibold">{quickAnswers.title}</h2>
                <ul className="mt-3 grid">
                  {quickAnswers.links.map((link) => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        viewTransition
                        className="flex min-h-11 items-center justify-between gap-3 font-medium text-primary transition-colors duration-120 hover:text-primary-hover"
                      >
                        {link.label}
                        <ArrowRight aria-hidden="true" className="nudge-right size-4" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            </aside>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
