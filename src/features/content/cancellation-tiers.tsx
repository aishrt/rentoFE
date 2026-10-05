import type { PublicPolicies } from '@/api/types';
import { Stagger, StaggerItem } from '@/components/motion/reveal';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNzdFromCents } from '@/lib/format';
import { listOf, refundWindows } from './policies';

type Cancellation = PublicPolicies['cancellation'];

/** A small bar showing how much comes back: full, part or nothing. Decorative; the words say it. */
function RefundMeter({ refundPct }: { refundPct: number }) {
  return (
    <span aria-hidden="true" className="block h-1 w-12 overflow-hidden rounded-full bg-ink/8">
      <span
        className="block h-full origin-left rounded-full bg-primary"
        style={{ transform: `scaleX(${Math.min(100, Math.max(0, refundPct)) / 100})` }}
      />
    </span>
  );
}

/**
 * The cancellation tiers the system applies right now (GET /policies), each with its refund windows. Shown
 * next to the legal text on the Cancellation Policy page, so the page always matches what is charged
 * (plan §9, Days 12–14).
 */
export function CancellationTiers({ cancellation }: { cancellation: Cancellation }) {
  const { tiers, defaultTier, hostSelectableTiers, hostCancellationFeeCents } = cancellation;
  const selectable = tiers.filter((tier) => hostSelectableTiers.includes(tier.code)).map((tier) => tier.name);
  const defaultName = tiers.find((tier) => tier.code === defaultTier)?.name;

  return (
    <div>
      <Stagger as="ul" className="grid gap-5 lg:grid-cols-3">
        {tiers.map((tier, index) => {
          const isDefault = tier.code === defaultTier;
          const headingId = `tier-${tier.code.toLowerCase()}`;
          return (
            <StaggerItem as="li" key={tier.code} index={index}>
              <Card asChild className="flex h-full flex-col p-6 sm:p-7">
                <article aria-labelledby={headingId}>
                  <div className="flex items-start justify-between gap-4">
                    <h3 id={headingId} className="headline text-2xl font-medium">
                      {tier.name}
                    </h3>
                    {isDefault && <Badge variant="primary">Default</Badge>}
                  </div>
                  <p className="mt-2 text-muted">{tier.summary}</p>

                  <table className="mt-6 w-full text-sm">
                    <caption className="sr-only">Refunds under the {tier.name} policy</caption>
                    <thead>
                      <tr className="border-b border-line">
                        <th scope="col" className="eyebrow pb-2 text-left text-muted">
                          When you cancel
                        </th>
                        <th scope="col" className="eyebrow pb-2 text-right text-muted">
                          Refund
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {refundWindows(tier).map((window) => (
                        <tr key={window.when}>
                          <th scope="row" className="py-3 pr-4 text-left align-top font-normal text-ink/85">
                            {window.when}
                          </th>
                          <td className="py-3 text-right align-top">
                            <span className="flex flex-col items-end gap-1.5">
                              <span className="font-semibold whitespace-nowrap text-ink">
                                {window.refund}
                              </span>
                              <RefundMeter refundPct={window.refundPct} />
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </article>
              </Card>
            </StaggerItem>
          );
        })}
      </Stagger>

      <ul className="mt-8 grid max-w-3xl gap-2 text-muted">
        <li>
          Each listing shows its policy before you book, and you’ll see exactly what would be refunded before
          you confirm a cancellation.
        </li>
        {selectable.length > 1 && defaultName && (
          <li>
            Hosts choose {listOf(selectable, 'or')} for each car. {defaultName} applies unless they choose
            another.
          </li>
        )}
        <li>If your host cancels a confirmed booking, you get a full refund.</li>
        {hostCancellationFeeCents > 0 && (
          <li>
            A host who cancels a confirmed booking pays a {formatNzdFromCents(hostCancellationFeeCents)} fee.
          </li>
        )}
      </ul>
    </div>
  );
}

export function CancellationTiersSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-5 lg:grid-cols-3">
      <span className="sr-only">Loading the cancellation tiers</span>
      {[0, 1, 2].map((index) => (
        <Card key={index} className="grid gap-4 p-6 sm:p-7">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="mt-2 h-32 w-full" />
        </Card>
      ))}
    </div>
  );
}
