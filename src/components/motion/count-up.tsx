import { animate, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { motion } from '@/styles/tokens';

interface CountUpProps {
  value: number;
  format?: (value: number) => string;
  duration?: number;
}

/**
 * Counts a number up from zero (dashboards, plan §12.4). Screen readers get the final value only,
 * never the changing digits.
 */
export function CountUp({ value, format = String, duration = motion.duration.count }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduceMotion = useReducedMotion();
  // Keep the latest formatter without restarting the animation when a new function is passed.
  const formatRef = useRef(format);
  useEffect(() => {
    formatRef.current = format;
  });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduceMotion) {
      node.textContent = formatRef.current(value);
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: motion.ease.out,
      onUpdate: (latest) => {
        node.textContent = formatRef.current(Math.round(latest));
      },
    });
    return () => controls.stop();
  }, [value, duration, reduceMotion]);

  return (
    <>
      <span ref={ref} aria-hidden="true" className="tabular-nums">
        {format(value)}
      </span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}
