import type { ReactNode } from 'react';
import { RidgeLines } from '@/components/brand/ridge-lines';
import { Container } from '@/components/layout/container';
import { SectionHeading } from '@/components/layout/section-heading';
import { Reveal } from '@/components/motion/reveal';

interface CtaBandProps {
  id: string;
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions: ReactNode;
}

/** The closing call to action of a content page: a dark panel with the ridges, one clear next step. */
export function CtaBand({ id, eyebrow, title, description, actions }: CtaBandProps) {
  return (
    <section aria-labelledby={id} className="py-16 sm:py-24 lg:py-28">
      <Container>
        <Reveal>
          <div className="relative isolate overflow-hidden rounded-sheet bg-ink px-6 py-12 text-canvas sm:px-10 sm:py-16 lg:px-16 lg:py-20">
            <RidgeLines className="absolute inset-x-0 bottom-0 -z-10 h-1/2 w-full text-primary/60" />
            <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
              <SectionHeading id={id} tone="dark" eyebrow={eyebrow} title={title} description={description} />
              <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
