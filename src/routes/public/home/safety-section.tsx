import { Container } from '@/components/layout/container';
import { SectionHeading } from '@/components/layout/section-heading';
import { Reveal, Stagger, StaggerItem } from '@/components/motion/reveal';
import { IconBadge } from '@/components/ui/icon-badge';
import { safetyFeatures } from './home-content';

export function SafetySection() {
  return (
    <section
      id="safety"
      aria-labelledby="safety-heading"
      className="scroll-mt-20 border-y border-line bg-surface py-16 sm:py-24 lg:py-28"
    >
      <Container>
        <Reveal>
          <SectionHeading
            id="safety-heading"
            eyebrow="Safety and trust"
            title="Built so both sides can relax"
            description="From the first message to the final photo, every trip leaves a clear record."
          />
        </Reveal>

        <Stagger as="ul" className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {safetyFeatures.map(({ icon: Icon, title, text }, index) => (
            <StaggerItem as="li" key={title} index={index}>
              <IconBadge size="lg" shape="square">
                <Icon />
              </IconBadge>
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-muted">{text}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}
