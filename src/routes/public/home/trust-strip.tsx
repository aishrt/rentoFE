import { Container } from '@/components/layout/container';
import { Stagger, StaggerItem } from '@/components/motion/reveal';
import { IconBadge } from '@/components/ui/icon-badge';
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
              <IconBadge>
                <Icon />
              </IconBadge>
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
