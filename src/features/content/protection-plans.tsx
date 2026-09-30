import { m } from 'motion/react';
import { Stagger, StaggerItem } from '@/components/motion/reveal';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { formatNzdFromCents } from '@/lib/format';
import { motion } from '@/styles/tokens';
import type { ProtectionPlan } from './policies';

/**
 * The protection plans in force (GET /policies): the one included by default, each daily price, excess and
 * cover summary. The figures come from settings, so the page updates when the insurance partner's final
 * plans are entered (plan §16 item 9).
 */
export function ProtectionPlans({ plans }: { plans: readonly ProtectionPlan[] }) {
  return (
    <Stagger as="ul" className={cn('grid gap-5', plans.length > 2 ? 'md:grid-cols-3' : 'md:grid-cols-2')}>
      {plans.map((plan, index) => {
        const headingId = `plan-${plan.code.toLowerCase()}`;
        return (
          <StaggerItem as="li" key={plan.code} index={index}>
            <Card
              asChild
              spotlight
              className={cn('flex h-full flex-col p-6 sm:p-8', plan.mandatory && 'ring-2 ring-primary')}
            >
              <article aria-labelledby={headingId}>
                <div className="flex min-h-7 items-start justify-between gap-4">
                  <h3 id={headingId} className="headline text-3xl font-medium">
                    {plan.name}
                  </h3>
                  {plan.mandatory && <Badge variant="accent">Included by default</Badge>}
                </div>
                <p className="mt-3 flex-1 text-muted">{plan.coverSummary}</p>
                <dl className="mt-8 grid grid-cols-2 gap-4 border-t border-line pt-6">
                  <div>
                    <dt className="eyebrow text-muted">Daily price</dt>
                    <dd className="mt-1.5 text-ink">
                      <span className="headline text-3xl font-medium tabular-nums">
                        {formatNzdFromCents(plan.dailyPriceCents)}
                      </span>
                      <span className="text-sm text-muted"> a day</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="eyebrow text-muted">Excess</dt>
                    <dd className="mt-1.5 text-ink">
                      <span className="headline text-3xl font-medium tabular-nums">
                        {formatNzdFromCents(plan.excessCents)}
                      </span>
                    </dd>
                  </div>
                </dl>
              </article>
            </Card>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}

export function ProtectionPlansSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-5 md:grid-cols-3">
      <span className="sr-only">Loading the protection plans</span>
      {[0, 1, 2].map((index) => (
        <Card key={index} className="grid gap-4 p-6 sm:p-8">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="mt-4 h-16 w-full" />
        </Card>
      ))}
    </div>
  );
}

/**
 * The most each plan would have you pay towards a covered claim, as bars that grow in on scroll: the lower
 * the excess, the higher the daily price. The bars are decorative; the amounts are in the text.
 */
export function ExcessComparison({ plans }: { plans: readonly ProtectionPlan[] }) {
  const largest = Math.max(1, ...plans.map((plan) => plan.excessCents));

  return (
    <ul className="grid gap-6">
      {plans.map((plan, index) => (
        <li key={plan.code}>
          <div className="flex items-baseline justify-between gap-4">
            <span className="font-semibold">{plan.name}</span>
            <span className="text-sm text-muted">
              You’d pay up to{' '}
              <span className="font-semibold text-ink tabular-nums">
                {formatNzdFromCents(plan.excessCents)}
              </span>
            </span>
          </div>
          <div aria-hidden="true" className="mt-2.5 h-2 overflow-hidden rounded-full bg-ink/6">
            <m.div
              className="h-full origin-left rounded-full bg-primary"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: plan.excessCents / largest }}
              viewport={{ once: true }}
              transition={{
                duration: motion.duration.count,
                ease: motion.ease.out,
                delay: motion.duration.short + index * motion.stagger,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
