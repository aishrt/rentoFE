import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { HarbourArt } from '@/components/brand/scenes/harbour-art';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { SectionHeading } from '@/components/layout/section-heading';
import { Magnet } from '@/components/motion/magnet';
import { Reveal, Stagger, StaggerItem } from '@/components/motion/reveal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconBadge } from '@/components/ui/icon-badge';
import { CtaBand } from '@/features/content/cta-band';
import { PageHero } from '@/features/content/page-hero';
import { seoPage } from '@/seo/pages';
import { motion } from '@/styles/tokens';
import { closing, hero, story, values, valuesHeading } from './about-content';

function StorySection() {
  return (
    <section aria-labelledby="story-heading" className="py-16 sm:py-24 lg:py-32">
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-20">
        <Reveal>
          <p className="eyebrow text-primary">{story.eyebrow}</p>
          <h2 id="story-heading" className="headline mt-4 text-title-2 font-medium">
            {story.statement}
          </h2>
        </Reveal>
        <Reveal
          delay={motion.stagger * 2}
          className="grid content-end gap-5 text-lg leading-relaxed text-muted"
        >
          {story.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </Reveal>
      </Container>
    </section>
  );
}

function ValuesSection() {
  return (
    <section
      aria-labelledby="values-heading"
      className="border-y border-line bg-surface py-16 sm:py-24 lg:py-28"
    >
      <Container>
        <Reveal>
          <SectionHeading id="values-heading" {...valuesHeading} />
        </Reveal>
        <Stagger as="ul" className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {values.map(({ icon: Icon, title, text }, index) => (
            <StaggerItem as="li" key={title} index={index}>
              <Card spotlight variant="flat" className="h-full p-6 lg:p-7">
                <IconBadge size="lg" tone="solid">
                  <Icon />
                </IconBadge>
                <h3 className="headline mt-8 text-2xl font-medium">{title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{text}</p>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}

/** About Us (plan §9, Days 12–14): the idea and the values behind Rento Vroom. Copy awaits the client (§16 item 18). */
export function AboutPage() {
  return (
    <>
      <PageMeta page={seoPage('/about')} />
      <PageHero
        tone="dark"
        art={HarbourArt}
        eyebrow={hero.eyebrow}
        title={hero.title}
        lead={<p>{hero.lead}</p>}
      />
      <StorySection />
      <ValuesSection />
      <CtaBand
        id="about-next"
        title={closing.title}
        description={
          <>
            {closing.description} Questions or ideas?{' '}
            <Link to="/contact" viewTransition className="link-underline font-medium text-canvas">
              Get in touch
            </Link>
            .
          </>
        }
        actions={
          <>
            <Magnet>
              <Button variant="accent" size="lg" asChild>
                <Link to="/cars" viewTransition>
                  Browse cars
                  <ArrowRight aria-hidden="true" className="nudge-right" />
                </Link>
              </Button>
            </Magnet>
            <Button variant="outline-light" size="lg" asChild>
              <Link to="/become-a-host" viewTransition>
                Become a host
              </Link>
            </Button>
          </>
        }
      />
    </>
  );
}
