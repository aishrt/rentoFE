import { m, useReducedMotion } from 'motion/react';
import { motion } from '@/styles/tokens';

interface CheckDrawProps {
  className?: string;
  /** Seconds to wait after the check scrolls into view. */
  delay?: number;
}

/** A checkmark that draws itself once, when it first scrolls into view. Drawn straight away with reduced motion. */
export function CheckDraw({ className, delay = 0 }: CheckDrawProps) {
  const reduceMotion = useReducedMotion();

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <m.path
        d="M20 6 9 17l-5-5"
        initial={reduceMotion ? false : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: motion.duration.medium, ease: motion.ease.out, delay }}
      />
    </svg>
  );
}
