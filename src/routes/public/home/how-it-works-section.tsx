import { AnimatePresence, m } from 'motion/react';
import { useState } from 'react';
import { Container } from '@/components/layout/container';
import { SectionHeading } from '@/components/layout/section-heading';
import { Reveal } from '@/components/motion/reveal';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { tabId, tabPanelId } from '@/components/ui/tab-ids';
import { motion } from '@/styles/tokens';
import { guestSteps, hostSteps } from './home-content';

const TABS = [
  { value: 'renting', label: 'Renting a car' },
  { value: 'hosting', label: 'Sharing your car' },
] as const;

type Audience = (typeof TABS)[number]['value'];

const TAB_PREFIX = 'how-it-works';

export function HowItWorksSection() {
  const [audience, setAudience] = useState<Audience>('renting');
  const steps = audience === 'renting' ? guestSteps : hostSteps;

  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="scroll-mt-20 border-y border-line bg-surface py-16 sm:py-24 lg:py-28"
    >
      <Container>
        <Reveal className="flex flex-col items-center text-center">
          <SectionHeading
            id="how-it-works-heading"
            align="center"
            eyebrow="How it works"
            title="Three steps, whichever side of the keys you're on"
          />
          <SegmentedTabs
            idPrefix={TAB_PREFIX}
            label="Show steps for"
            options={TABS}
            value={audience}
            onChange={setAudience}
            className="mt-8 w-full max-w-sm"
          />
        </Reveal>

        <div
          role="tabpanel"
          id={tabPanelId(TAB_PREFIX, audience)}
          aria-labelledby={tabId(TAB_PREFIX, audience)}
          className="mt-12"
        >
          <AnimatePresence mode="wait" initial={false}>
            <m.ol
              key={audience}
              className="grid gap-5 md:grid-cols-3 lg:gap-8"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: motion.duration.medium, ease: motion.ease.out }}
            >
              {steps.map(({ icon: Icon, title, text }, index) => (
                <li key={title} className="relative rounded-card border border-line bg-canvas p-6 lg:p-8">
                  <div className="flex items-center justify-between">
                    <span
                      className="headline text-5xl leading-none font-medium text-gold-text"
                      aria-hidden="true"
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span
                      aria-hidden="true"
                      className="flex size-11 items-center justify-center rounded-full bg-primary text-white"
                    >
                      <Icon className="size-5" />
                    </span>
                  </div>
                  <h3 className="mt-8 text-lg font-semibold">
                    <span className="sr-only">Step {index + 1}: </span>
                    {title}
                  </h3>
                  <p className="mt-2 text-muted">{text}</p>
                </li>
              ))}
            </m.ol>
          </AnimatePresence>
        </div>
      </Container>
    </section>
  );
}
