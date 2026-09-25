import { m, type Variants } from 'motion/react';
import type { ReactNode } from 'react';
import { motion } from '@/styles/tokens';

const VIEWPORT = { once: true, margin: '0px 0px -12% 0px' } as const;

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

/** Fades content up once as it scrolls into view. */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: motion.travel.md }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: motion.duration.long, ease: motion.ease.out, delay }}
    >
      {children}
    </m.div>
  );
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: motion.travel.md },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: motion.duration.long,
      ease: motion.ease.out,
      // Only the first few items wait their turn, so long lists never feel slow (plan §12.4).
      delay: Math.min(index, motion.staggerLimit - 1) * motion.stagger,
    },
  }),
};

type ContainerTag = 'div' | 'ul' | 'ol';
type ItemTag = 'div' | 'li';

interface StaggerProps {
  children: ReactNode;
  className?: string;
  as?: ContainerTag;
}

/** Container whose `StaggerItem` children fade up one after another as it scrolls into view. */
export function Stagger({ children, className, as = 'div' }: StaggerProps) {
  const Component = m[as] as typeof m.div;
  return (
    <Component className={className} initial="hidden" whileInView="visible" viewport={VIEWPORT}>
      {children}
    </Component>
  );
}

interface StaggerItemProps {
  children: ReactNode;
  index: number;
  className?: string;
  as?: ItemTag;
}

export function StaggerItem({ children, index, className, as = 'div' }: StaggerItemProps) {
  const Component = m[as] as typeof m.div;
  return (
    <Component className={className} variants={itemVariants} custom={index}>
      {children}
    </Component>
  );
}
