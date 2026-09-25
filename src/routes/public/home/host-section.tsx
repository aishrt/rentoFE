import { ArrowRight } from 'lucide-react';
import { m } from 'motion/react';
import { Link } from 'react-router';
import { RidgeLines } from '@/components/brand/ridge-lines';
import { Container } from '@/components/layout/container';
import { SectionHeading } from '@/components/layout/section-heading';
import { CheckDraw } from '@/components/motion/check-draw';
import { Magnet } from '@/components/motion/magnet';
import { Reveal } from '@/components/motion/reveal';
import { TiltedCard } from '@/components/motion/tilted-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckList } from '@/components/ui/check-list';
import { motion } from '@/styles/tokens';
import { hostPoints, listingSteps } from './home-content';

const COMPLETED_STEPS = 4;

/** The progress bar starts after a short pause; each finished step ticks off shortly after. */
const PROGRESS_DELAY = motion.duration.short;
const FIRST_TICK = PROGRESS_DELAY + motion.duration.medium;

/**
 * An example listing mid-setup. Decorative: the steps are also described in the text beside it. On desktop
 * it tilts towards the mouse with a light across it, like a card held up to look at.
 */
function ListingPreview() {
  const progress = COMPLETED_STEPS / listingSteps.length;

  return (
    <Card spotlight variant="raised" aria-hidden="true" className="p-6 text-ink sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-primary">Your listing</p>
          <p className="headline mt-1.5 text-2xl font-medium">2021 Toyota RAV4 Hybrid</p>
        </div>
        <Badge variant="accent">Draft</Badge>
      </div>

      <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-ink/6">
        <m.div
          className="h-full origin-left rounded-full bg-primary"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: progress }}
          viewport={{ once: true }}
          transition={{ duration: motion.duration.count, ease: motion.ease.out, delay: PROGRESS_DELAY }}
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
                {done ? (
                  <CheckDraw className="size-3.5" delay={FIRST_TICK + index * motion.stagger} />
                ) : (
                  index + 1
                )}
              </span>
              <span className={done ? 'text-ink' : 'text-muted'}>{step}</span>
            </li>
          );
        })}
      </ol>
    </Card>
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
              <CheckList items={hostPoints} tone="dark" className="mt-8" />
              <div className="mt-10 flex flex-wrap gap-3">
                {/* The page's one accent call to action drifts towards the mouse as it comes near. */}
                <Magnet>
                  <Button variant="accent" size="lg" asChild>
                    <Link to="/become-a-host" viewTransition>
                      Become a Host
                      <ArrowRight aria-hidden="true" className="nudge-right" />
                    </Link>
                  </Button>
                </Magnet>
                <Button variant="outline-light" size="lg" asChild>
                  <Link to="/how-it-works" viewTransition>
                    How hosting works
                  </Link>
                </Button>
              </div>
            </Reveal>

            <Reveal delay={motion.stagger * 2}>
              <TiltedCard>
                <ListingPreview />
              </TiltedCard>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
