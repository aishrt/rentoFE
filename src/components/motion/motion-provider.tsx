import { LazyMotion, MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';
import { motion } from '@/styles/tokens';

const loadFeatures = () => import('./motion-features').then((module) => module.default);

/**
 * Loads Motion's small `domAnimation` feature set in a separate chunk (plan §12.5) and applies the
 * reduced-motion preference: with it on, movement becomes a simple fade (plan §12.4). `strict` makes
 * us use the light `m` components everywhere.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig
        reducedMotion="user"
        transition={{ duration: motion.duration.medium, ease: motion.ease.out }}
      >
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
