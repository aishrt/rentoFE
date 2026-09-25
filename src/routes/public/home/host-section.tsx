import { ArrowRight, Check } from 'lucide-react';
import { m } from 'motion/react';
import { Link } from 'react-router';
import { RidgeLines } from '@/components/brand/ridge-lines';
import { Container } from '@/components/layout/container';
import { SectionHeading } from '@/components/layout/section-heading';
import { Reveal } from '@/components/motion/reveal';
import { Button } from '@/components/ui/button';
import { motion } from '@/styles/tokens';
import { hostPoints, listingSteps } from './home-content';

const COMPLETED_STEPS = 4;

/** An example listing mid-setup. Decorative: the steps are also described in the text beside it. */
function ListingPreview() {
  const progress = COMPLETED_STEPS / listingSteps.length;

  return (
    <div aria-hidden="true" className="relative rounded-sheet bg-surface p-6 text-ink shadow-lift sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-gold-text">Your listing</p>
          <p className="headline mt-1.5 text-2xl font-medium">2021 Toyota RAV4 Hybrid</p>
        </div>
        <span className="rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold text-gold-text">Draft</span>
      </div>

      <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-ink/6">
        <m.div
          className="h-full origin-left rounded-full bg-primary"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: progress }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: motion.ease.out, delay: 0.2 }}
        />
      </div>
      <p className="mt-2 text-xs text-muted">
        {COMPLETED_STEPS} of {listingSteps.length} steps done
      </p>

      <ol className="mt-5 grid gap-2.5">
        {listingSteps.map((step, index) => {
          const done = index < COMPLETED_STEPS;
          return (
            <li key={step} className="flex items-center gap-3 text-sm">
              <span
                className={
                  done
                    ? 'flex size-6 items-center justify-center rounded-full bg-primary text-white'
                    : 'flex size-6 items-center justify-center rounded-full border border-line text-xs text-muted'
                }
              >
                {done ? <Check className="size-3.5" /> : index + 1}
              </span>
              <span className={done ? 'text-ink' : 'text-muted'}>{step}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function HostSection() {
  return (
    <section id="hosting" aria-labelledby="hosting-heading" className="scroll-mt-20 py-16 sm:py-24 lg:py-28">
      <Container>
        <div className="relative isolate overflow-hidden rounded-sheet bg-primary px-6 py-12 text-canvas sm:px-10 sm:py-16 lg:px-16 lg:py-20">
          <RidgeLines className="absolute inset-x-0 bottom-0 -z-10 h-1/3 w-full text-black/60" />
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
            <Reveal>
              <SectionHeading
                id="hosting-heading"
                tone="dark"
                eyebrow="Become a host"
                title="Your car sits idle most of the week. Let it earn."
                description="Share it with verified guests on your terms. You set the price and the dates, and payouts go straight to your bank."
              />
              <ul className="mt-8 grid gap-3">
                {hostPoints.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-canvas/85">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold"
                    >
                      <Check className="size-3.5" />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
              <div className="mt-10 flex flex-wrap gap-3">
                <Button variant="gold" size="lg" asChild className="group">
                  <Link to="/become-a-host" viewTransition>
                    Become a Host
                    <ArrowRight
                      aria-hidden="true"
                      className="transition-transform duration-200 ease-out group-hover:translate-x-0.5"
                    />
                  </Link>
                </Button>
                <Button variant="outline-light" size="lg" asChild>
                  <Link to="/how-it-works" viewTransition>
                    How hosting works
                  </Link>
                </Button>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <ListingPreview />
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
