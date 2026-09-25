import { AnimatePresence, m } from 'motion/react';
import { useState } from 'react';
import { Container } from '@/components/layout/container';
import { SectionHeading } from '@/components/layout/section-heading';
import { swapUp } from '@/components/motion/presets';
import { Reveal } from '@/components/motion/reveal';
import { Card } from '@/components/ui/card';
import { IconBadge } from '@/components/ui/icon-badge';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { tabId, tabPanelId } from '@/components/ui/tab-ids';
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
            <m.ol key={audience} className="grid gap-5 md:grid-cols-3 lg:gap-8" {...swapUp}>
              {steps.map(({ icon: Icon, title, text }, index) => (
                <Card asChild variant="flat" key={title} className="relative p-6 lg:p-8">
                  <li>
                    <div className="flex items-center justify-between">
                      <span
                        className="headline text-5xl leading-none font-medium text-gold-text"
                        aria-hidden="true"
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <IconBadge size="lg" tone="solid">
                        <Icon />
                      </IconBadge>
                    </div>
                    <h3 className="mt-8 text-lg font-semibold">
                      <span className="sr-only">Step {index + 1}: </span>
                      {title}
                    </h3>
                    <p className="mt-2 text-muted">{text}</p>
                  </li>
                </Card>
              ))}
            </m.ol>
          </AnimatePresence>
        </div>
      </Container>
    </section>
  );
}
