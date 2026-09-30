import { Check } from 'lucide-react';
import { m } from 'motion/react';
import { cn } from '@/lib/cn';
import { motion } from '@/styles/tokens';

/** Where a step stands: done, done but something is still missing, or not reached yet. */
export type StepState = 'complete' | 'attention' | 'upcoming';

export interface StepperStep {
  label: string;
  state: StepState;
}

interface StepperProps {
  steps: readonly StepperStep[];
  /** The step on screen, from 0. `steps.length` once every step is behind (a review page). */
  current: number;
  /** Makes each step a button, e.g. to save the current step and jump to that one. */
  onSelect?: (index: number) => void;
  /** Names the list for screen readers, e.g. "Listing progress". */
  label: string;
  /** What the step after the last one is called on phones, e.g. "Review". */
  finishedLabel?: string;
  className?: string;
}

const STATE_TEXT: Record<StepState, string> = {
  complete: 'done',
  attention: 'something is missing',
  upcoming: 'not started',
};

/** What a screen reader hears after the step's name, e.g. "step 2 of 6, current step, something is missing". */
function stateText(state: StepState, isCurrent: boolean): string {
  if (!isCurrent) return STATE_TEXT[state];
  return state === 'attention' ? 'current step, something is missing' : 'current step';
}

/**
 * Progress through a multi-step form (plan §12.3, §12.6): numbered steps joined by a line that fills to
 * the current one, a tick on finished steps and an amber mark on steps with something missing. On phones
 * only the current step's name shows, with "Step 2 of 6"; the circles stay 44 px touch targets.
 */
export function Stepper({
  steps,
  current,
  onSelect,
  label,
  finishedLabel = 'Review',
  className,
}: StepperProps) {
  const count = steps.length;
  const finished = current >= count;
  const progress = count > 1 ? Math.min(current, count - 1) / (count - 1) : 1;
  // The track runs from the middle of the first column to the middle of the last.
  const inset = `${50 / count}%`;

  return (
    <nav aria-label={label} className={className}>
      <div className="mb-2 flex items-baseline justify-between gap-3 sm:hidden" aria-hidden="true">
        <p className="text-sm font-semibold text-ink">{finished ? finishedLabel : steps[current]?.label}</p>
        <p className="text-sm text-muted tabular-nums">
          {finished ? `All ${count} steps` : `Step ${current + 1} of ${count}`}
        </p>
      </div>
      <div className="relative">
        <div
          aria-hidden="true"
          className="absolute top-5.5 h-0.5 rounded-full bg-line"
          style={{ left: inset, right: inset }}
        >
          <m.div
            className="h-full origin-left rounded-full bg-primary"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: finished ? 1 : progress }}
            transition={{ duration: motion.duration.count, ease: motion.ease.out }}
          />
        </div>
        <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
          {steps.map((step, index) => {
            const isCurrent = index === current;
            const Tag = onSelect ? 'button' : 'div';
            return (
              <li key={step.label} className="flex justify-center">
                <Tag
                  {...(onSelect && { type: 'button' as const, onClick: () => onSelect(index) })}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={cn(
                    'group/step flex min-w-11 flex-col items-center gap-1.5 rounded-control px-1 outline-offset-2',
                    onSelect && 'cursor-pointer focus-visible:outline-2 focus-visible:outline-primary',
                  )}
                >
                  <span className="flex size-11 items-center justify-center">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'relative flex size-8 items-center justify-center rounded-full text-sm font-semibold tabular-nums',
                        'transition-[background-color,color,scale] duration-200 ease-out',
                        onSelect && 'group-hover/step:scale-105 group-active/step:scale-95',
                        isCurrent
                          ? 'bg-primary text-surface shadow-card ring-4 ring-primary/15 inset-shadow-highlight'
                          : step.state === 'complete'
                            ? 'bg-primary/10 text-primary'
                            : step.state === 'attention'
                              ? 'border-2 border-warning bg-surface text-ink'
                              : 'border border-line bg-surface text-muted',
                        // An amber dot marks a step with something missing, even while it's the current one.
                        step.state === 'attention' &&
                          'after:absolute after:-top-0.5 after:-right-0.5 after:size-2.5 after:rounded-full after:bg-warning after:ring-2 after:ring-surface',
                      )}
                    >
                      {step.state === 'complete' && !isCurrent ? (
                        <Check className="size-4" strokeWidth={2.5} />
                      ) : (
                        index + 1
                      )}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'sr-only text-center text-xs sm:not-sr-only',
                      isCurrent ? 'font-semibold text-ink' : 'text-muted',
                      onSelect && !isCurrent && 'transition-colors duration-120 group-hover/step:text-ink',
                    )}
                  >
                    {step.label}
                    <span className="sr-only">{`, step ${index + 1} of ${count}, ${stateText(step.state, isCurrent)}`}</span>
                  </span>
                </Tag>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
