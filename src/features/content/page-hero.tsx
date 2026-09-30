import { m } from 'motion/react';
import type { ReactNode } from 'react';
import { LandscapeArt } from '@/components/brand/landscape-art';
import { RidgeLines } from '@/components/brand/ridge-lines';
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
   * `dark`: the NZ landscape at blue hour, for the pages that tell the story (How it works, Safety, About).
   * `primary`: brand blue with ridges, for Become a host. `light`: the canvas with ridges, for reference
   * pages (Insurance, FAQs, Contact, legal).
   */
  tone?: 'dark' | 'primary' | 'light';
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
          <LandscapeArt
            idPrefix="page-hero-art"
            className="h-full w-full origin-[70%_65%] animate-hero-drift"
          />
          <div className="absolute inset-0 bg-linear-to-b from-ink/80 via-ink/55 to-ink/85 lg:bg-linear-to-r lg:from-ink/90 lg:via-ink/55 lg:to-ink/10" />
        </div>
      )}
      {tone === 'primary' && (
        <RidgeLines className="absolute inset-x-0 bottom-0 -z-10 h-2/5 w-full text-black/50" />
      )}
      {tone === 'light' && (
        <RidgeLines className="absolute inset-x-0 bottom-0 -z-10 h-28 w-full text-primary/12 sm:h-36" />
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
