import { m } from 'motion/react';
import { motion } from '@/styles/tokens';

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** One column of 0–9, clipped to a single line and rolled so `digit` shows. */
function DigitRoll({ digit }: { digit: number }) {
  return (
    <span className="inline-flex h-[1lh] flex-col overflow-hidden">
      <m.span
        className="flex flex-col"
        initial={{ y: '0%' }}
        animate={{ y: `${-digit * 10}%` }}
        transition={{ duration: motion.duration.count, ease: motion.ease.out }}
      >
        {DIGITS.map((value) => (
          <span key={value}>{value}</span>
        ))}
      </m.span>
    </span>
  );
}

interface CounterProps {
  value: number;
  format?: (value: number) => string;
}

/**
 * A figure whose digits roll into place like an odometer (adapted from React Bits' Counter): up from zero
 * when it first appears, then from the old value to the new one when it changes. Separators and currency
 * signs stay still. Screen readers get the final value only, never the rolling digits; with reduced motion
 * the digits don't roll.
 */
export function Counter({ value, format = String }: CounterProps) {
  const text = format(value);
  const characters = [...text];

  return (
    <>
      <span aria-hidden="true" className="inline-flex tabular-nums">
        {characters.map((character, index) => {
          // Keyed from the right, so each digit keeps its column when the number gains or loses digits.
          const place = characters.length - index;
          return /\d/.test(character) ? (
            <DigitRoll key={`digit-${place}`} digit={Number(character)} />
          ) : (
            <span key={`mark-${place}`}>{character}</span>
          );
        })}
      </span>
      <span className="sr-only">{text}</span>
    </>
  );
}
