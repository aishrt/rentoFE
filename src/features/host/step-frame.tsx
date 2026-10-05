import { ArrowLeft, ArrowRight, CircleAlert } from 'lucide-react';
import { useEffect, useId, useRef, type FormEventHandler, type ReactNode } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import type { SaveProblem, StepTarget } from './use-step-save';
import { STEP_COUNT } from './vehicle-labels';

interface StepFrameProps {
  /** 1–6, or undefined for the review. */
  step?: number;
  title: string;
  description?: ReactNode;
  /** Continue: saves and moves on. */
  onSubmit: FormEventHandler<HTMLFormElement>;
  /** Saves and goes back a step; left out on the first step. */
  onBack?: () => void;
  /** Saves and returns to the Host home. */
  onExit: () => void;
  continueLabel?: string;
  savingTo: StepTarget | null;
  problem: SaveProblem | null;
  /** What's still missing on this step, from the listing checklist. */
  missing?: readonly string[];
  children: ReactNode;
}

const isStep = (target: StepTarget | null, kind: 'back' | 'exit' | 'continue', step?: number) => {
  if (!target) return false;
  if (kind === 'exit') return target === 'exit';
  if (typeof target !== 'object')
    return kind === 'continue' && (target === 'review' || target === 'overview');
  return kind === 'back' ? target.step < (step ?? 0) : target.step > (step ?? 0);
};

/**
 * One onboarding step (plan §12.6: one topic per screen): its heading, anything that needs fixing, the
 * fields, and a footer with Back, Save & exit and Continue that stays at the bottom of the screen, where a
 * thumb can reach it on a phone. The heading takes focus when the step appears, so screen readers hear
 * where they are.
 */
export function StepFrame({
  step,
  title,
  description,
  onSubmit,
  onBack,
  onExit,
  continueLabel = 'Continue',
  savingTo,
  problem,
  missing,
  children,
}: StepFrameProps) {
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const problemRef = useRef<HTMLDivElement>(null);
  const saving = savingTo !== null;

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    // A problem without a field to focus is scrolled into view instead.
    if (problem && problem.items.length > 0)
      problemRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [problem]);

  return (
    <form noValidate onSubmit={onSubmit} aria-labelledby={headingId}>
      <div className="grid gap-8">
        <header>
          {step && (
            // On phones the stepper already says "Step 2 of 6".
            <p className="eyebrow hidden text-primary sm:block">
              Step {step} of {STEP_COUNT}
            </p>
          )}
          <h2
            id={headingId}
            ref={headingRef}
            tabIndex={-1}
            className={cn('headline text-title-3 font-medium text-balance outline-none', step && 'sm:mt-2')}
          >
            {title}
          </h2>
          {description && <div className="mt-2 max-w-2xl text-muted">{description}</div>}
        </header>

        {missing && missing.length > 0 && (
          <div className="flex gap-3 rounded-control border border-warning/40 bg-warning/8 p-4 text-sm text-ink">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4.5 shrink-0 text-warning" />
            <div>
              <p className="font-semibold">Still needed here before you can submit</p>
              <ul className="mt-1 list-disc pl-5 text-ink/85">
                {missing.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {problem && (
          <div ref={problemRef}>
            <Alert variant="danger" role="alert" title={problem.title}>
              {problem.items.length > 0 && (
                <ul className="list-disc pl-5">
                  {problem.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </Alert>
          </div>
        )}

        {children}
      </div>

      <div
        className={cn(
          'glass sticky bottom-0 z-20 -mx-4 mt-10 border-t border-line px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]',
          'sm:bottom-4 sm:mx-0 sm:rounded-card sm:border sm:px-4 sm:pb-3 sm:shadow-card',
        )}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          {onBack && (
            <Button
              variant="ghost"
              onClick={onBack}
              disabled={saving}
              loading={isStep(savingTo, 'back', step)}
              className="px-3 sm:px-4"
            >
              {!isStep(savingTo, 'back', step) && <ArrowLeft aria-hidden="true" className="nudge-left" />}
              Back
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Button
              variant="secondary"
              onClick={onExit}
              disabled={saving}
              loading={isStep(savingTo, 'exit')}
              className="px-4"
            >
              Save & exit
            </Button>
            <Button
              type="submit"
              disabled={saving}
              loading={isStep(savingTo, 'continue', step)}
              className="px-4 sm:px-5"
            >
              {continueLabel}
              {!isStep(savingTo, 'continue', step) && (
                <ArrowRight aria-hidden="true" className="nudge-right" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
