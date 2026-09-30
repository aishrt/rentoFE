import { CircleCheck, CircleDashed, Flag } from 'lucide-react';
import type { ListingChecklist } from '@/api/types';
import { ONBOARDING_STEPS } from './listing-labels';
import { ReviewSection } from './review-section';

/**
 * The listing's missing-items check and its flags (plan §9, Days 8–11). Missing items would have stopped
 * the Host submitting, so on a listing under review they come from later changes, such as a photo staff
 * rejected. Flags never block: they're for staff to look at, such as a dark photo or damage without one.
 */
export function ChecklistPanel({ checklist }: { checklist: ListingChecklist }) {
  const steps = [...new Set(checklist.missing.map((item) => item.step))].sort((a, b) => a - b);
  const clear = checklist.missing.length === 0 && checklist.flags.length === 0;

  return (
    <ReviewSection id="checks" title="Checks">
      {clear && (
        <p className="flex items-center gap-2 text-sm text-ink">
          <CircleCheck aria-hidden="true" className="size-4.5 shrink-0 text-success" />
          Nothing is missing and nothing is flagged.
        </p>
      )}

      {checklist.missing.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-ink">Missing</h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {steps.map((step) => (
              <div key={step} className="rounded-control border border-line p-4">
                <h4 className="eyebrow text-muted">
                  Step {step}: {ONBOARDING_STEPS[step] ?? 'Other'}
                </h4>
                <ul className="mt-2 grid gap-1.5 text-sm">
                  {checklist.missing
                    .filter((item) => item.step === step)
                    .map((item) => (
                      <li key={item.field} className="flex items-start gap-2 text-ink">
                        <CircleDashed aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted" />
                        {item.message}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {checklist.flags.length > 0 && (
        <div className={checklist.missing.length > 0 ? 'mt-5' : undefined}>
          <h3 className="text-sm font-semibold text-ink">Flags to look at</h3>
          <ul className="mt-2 grid gap-1.5 text-sm">
            {checklist.flags.map((flag, index) => (
              <li key={`${flag.code}-${index}`} className="flex items-start gap-2 text-ink">
                <Flag aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
                {flag.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </ReviewSection>
  );
}
