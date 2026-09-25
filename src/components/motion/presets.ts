import type { MotionProps } from 'motion/react';
import type { CSSProperties } from 'react';
import { motion } from '@/styles/tokens';

/*
 * Reusable motion recipes built from the tokens, spread onto `m.*` elements:
 *   <m.div {...fadeUp()} />
 * Scroll-triggered versions live in reveal.tsx (Reveal, Stagger).
 */

/**
 * The place of an item in a CSS `stagger-in` list, for content that appears without Motion (menu links in a
 * sheet):  <li className="stagger-in" style={staggerIndex(index)}>
 */
export function staggerIndex(index: number): CSSProperties {
  return { '--stagger-index': index } as CSSProperties;
}

type Entrance = Pick<MotionProps, 'initial' | 'animate' | 'transition'>;
type Swap = Pick<MotionProps, 'initial' | 'animate' | 'exit' | 'transition'>;

/** Fades up into place when the element mounts. */
export function fadeUp(delay = 0, distance: number = motion.travel.md): Entrance {
  return {
    initial: { opacity: 0, y: distance },
    animate: { opacity: 1, y: 0 },
    transition: { duration: motion.duration.long, ease: motion.ease.out, delay },
  };
}

/**
 * Content that replaces other content in the same place, such as a tab panel: the new content rises in
 * as the old one lifts away. Use inside `<AnimatePresence mode="wait">` with a changing `key`.
 */
export const swapUp: Swap = {
  initial: { opacity: 0, y: motion.travel.sm },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -motion.travel.sm / 2 },
  transition: { duration: motion.duration.medium, ease: motion.ease.out },
};

/**
 * Start times for a hero that builds itself (plan §12.4): the eyebrow, then the headline word by word,
 * then the supporting text, then the main panel just behind it.
 */
export function heroTimeline(wordCount: number) {
  const firstWord = motion.duration.micro;
  const afterWords = firstWord + wordCount * motion.wordStagger;
  return {
    eyebrow: 0,
    word: (index: number) => firstWord + index * motion.wordStagger,
    body: afterWords,
    panel: afterWords + motion.wordStagger,
  };
}
