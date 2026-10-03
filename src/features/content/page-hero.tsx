import { m } from 'motion/react';
import type { ComponentType, ReactNode } from 'react';
import { Container } from '@/components/layout/container';
import { BlurText } from '@/components/motion/blur-text';
import { fadeUp, heroTimeline } from '@/components/motion/presets';
import { cn } from '@/lib/cn';
import { motion } from '@/styles/tokens';

interface PageHeroProps {
  eyebrow: string;
  /** The page's h1. Text rises in word by word; anything else (a loading placeholder) shows as it is. */
  title: ReactNode;
  lead?: ReactNode;
  /** Buttons under the lead. */
  actions?: ReactNode;
  /** A panel beside the text on desktop, under it on phones. */
  aside?: ReactNode;
  /**
   * `dark`: a night scene under an ink veil, for the pages that tell the story (How it works, Safety, About).
   * `primary`: brand blue with art in ink along the bottom, for Become a host. `light`: the canvas with a line
   * pattern in faint primary, for reference pages (Insurance, FAQs, Contact, legal).
   */
  tone?: 'dark' | 'primary' | 'light';
  /**
   * The page's own background, about what the page is for, so no two pages share one: a scene from
   * components/brand/scenes for `dark` and `primary`, a line pattern from components/brand/patterns for `light`.
   * The home hero keeps the landscape for itself.
   */
  art: ComponentType<{ className?: string }>;
  /** Less height, for pages where the content below is the point: contact, legal. */
  compact?: boolean;
  id?: string;
  children?: ReactNode;
}

/**
 * The top of every content page (plan §12.1): an eyebrow, a large serif headline that comes into focus word
 * by word, a short lead and at most two actions, over the brand art. It builds itself in the same order as
 * the home hero (plan §12.4).
 */
export function PageHero({
  eyebrow,
  title,
  lead,
  actions,
  aside,
  tone = 'dark',
  art: Art,
  compact = false,
  id = 'page-heading',
  children,
}: PageHeroProps) {
  const onColour = tone !== 'light';
  const timeline = heroTimeline(typeof title === 'string' ? title.split(' ').length : 4);

  return (
    <section
      aria-labelledby={id}
      className={cn(
        'relative isolate overflow-hidden',
        tone === 'dark' && 'bg-ink text-canvas',
        tone === 'primary' && 'bg-primary text-canvas',
        tone === 'light' && 'border-b border-line text-ink',
      )}
    >
      {tone === 'dark' && (
        <div aria-hidden="true" className="parallax-exit absolute inset-0 -z-10">
          <Art className="h-full w-full origin-[70%_65%] animate-hero-drift" />
          <div className="absolute inset-0 bg-linear-to-b from-ink/80 via-ink/55 to-ink/85 lg:bg-linear-to-r lg:from-ink/90 lg:via-ink/55 lg:to-ink/10" />
        </div>
      )}
      {tone === 'primary' && (
        <Art className="absolute inset-x-0 bottom-0 -z-10 h-36 w-full text-ink sm:h-1/2 lg:h-3/5" />
      )}
      {tone === 'light' && (
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <Art className="size-full text-primary/20" />
          <div className="absolute inset-0 bg-linear-to-b from-canvas/60 via-canvas/40 to-canvas lg:from-transparent lg:via-transparent" />
          <div className="absolute inset-0 hidden bg-linear-to-r from-canvas via-canvas/60 to-transparent lg:block" />
        </div>
      )}

      <Container
        className={cn(
          'grid gap-12',
          compact
            ? 'pt-12 pb-14 sm:pt-16 sm:pb-16 lg:pt-20 lg:pb-20'
            : 'pt-14 pb-20 sm:pt-20 sm:pb-24 lg:pt-24 lg:pb-32',
          aside && 'lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-16',
        )}
      >
        <div className="max-w-3xl">
          <m.p
            className={cn(
              'eyebrow',
              onColour ? 'text-accent' : 'text-primary',
              tone === 'dark' && 'shiny-text',
            )}
            {...fadeUp(timeline.eyebrow, motion.travel.sm)}
          >
            {eyebrow}
          </m.p>
          <h1 id={id} className="headline mt-5 text-title-1 font-medium">
            {typeof title === 'string' ? <BlurText text={title} delay={timeline.word(0)} /> : title}
          </h1>
          {lead && (
            <m.div
              className={cn(
                'mt-6 max-w-xl text-lg leading-relaxed',
                onColour ? 'text-canvas/85' : 'text-muted',
              )}
              {...fadeUp(timeline.body)}
            >
              {lead}
            </m.div>
          )}
          {actions && (
            <m.div className="mt-9 flex flex-wrap gap-3" {...fadeUp(timeline.panel)}>
              {actions}
            </m.div>
          )}
          {children}
        </div>
        {aside && <m.div {...fadeUp(timeline.panel, motion.travel.lg)}>{aside}</m.div>}
      </Container>
    </section>
  );
}
