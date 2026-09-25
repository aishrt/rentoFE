import { Container } from '@/components/layout/container';
import { Stagger, StaggerItem } from '@/components/motion/reveal';
import { trustPoints } from './home-content';

export function TrustStrip() {
  return (
    <section aria-label="Why people choose Rento Vroom" className="border-b border-line bg-surface">
      <Container>
        <Stagger
          as="ul"
          className="grid grid-cols-1 gap-6 py-8 min-[480px]:grid-cols-2 lg:grid-cols-4 lg:py-10"
        >
          {trustPoints.map(({ icon: Icon, title, text }, index) => (
            <StaggerItem as="li" key={title} index={index} className="flex items-start gap-3.5">
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/8 text-primary"
              >
                <Icon className="size-5" />
              </span>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="mt-0.5 text-sm text-muted">{text}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}
