import { m, type Variants } from 'motion/react';
import { Fragment } from 'react';
import { motion } from '@/styles/tokens';

const wordVariants: Variants = {
  hidden: { opacity: 0, y: motion.travel.md, filter: `blur(${motion.blur}px)` },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    // Drop the filter once sharp, so the finished words don't keep a stacking context for nothing.
    transitionEnd: { filter: 'none' },
    transition: { duration: motion.duration.long, ease: motion.ease.out, delay },
  }),
};

interface BlurTextProps {
  text: string;
  /** Seconds before the first word starts; the rest follow `motion.wordStagger` apart. */
  delay?: number;
}

/**
 * Words that rise in and come into focus one after another (adapted from React Bits' BlurText). It renders
 * only the words, so put it inside the heading that owns the styles and id. Each word is its own
 * inline-block, so the line still wraps (and balances) naturally. With reduced motion the words fade in
 * without moving.
 */
export function BlurText({ text, delay = 0 }: BlurTextProps) {
  return text.split(' ').map((word, index) => (
    <Fragment key={index}>
      <m.span
        className="inline-block"
        variants={wordVariants}
        initial="hidden"
        animate="visible"
        custom={delay + index * motion.wordStagger}
      >
        {word}
      </m.span>{' '}
    </Fragment>
  ));
}
