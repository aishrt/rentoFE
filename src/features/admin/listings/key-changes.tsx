import { ArrowRight } from 'lucide-react';
import type { AdminVehicle } from '@/api/types';
import { formatDateNz } from './listing-format';
import { KEY_DETAIL_LABELS } from './listing-labels';
import { ReviewSection } from './review-section';

type KeyChange = AdminVehicle['keyChanges'][number];

/**
 * The key details a Host changed on a live listing, which sent it back for review (plan §3, changes to live
 * listings): each one as it was while live and as it is now, to check against the registration papers.
 * Kept until the listing is approved or rejected.
 */
export function KeyChangesSection({ changes, className }: { changes: KeyChange[]; className?: string }) {
  return (
    <ReviewSection
      id="key-changes"
      title="Key details changed"
      className={className}
      description="The Host changed these on the live listing, so it’s back for review. Check the new details against the registration papers and photos before you approve it."
    >
      <div className="scrollbar-subtle relative overflow-x-auto">
        <table className="w-full min-w-md text-left text-sm">
          <caption className="sr-only">Key details: what they were while live, and what they are now</caption>
          <thead className="text-xs text-muted">
            <tr>
              <th scope="col" className="pb-2 pr-4 font-semibold">
                Detail
              </th>
              <th scope="col" className="pb-2 pr-4 font-semibold">
                While live
              </th>
              <th scope="col" className="pb-2 pr-4 font-semibold">
                <span className="sr-only">Changed to</span>
              </th>
              <th scope="col" className="pb-2 pr-4 font-semibold">
                Now
              </th>
              <th scope="col" className="pb-2 font-semibold">
                Changed
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {changes.map((change) => (
              <tr key={change.field}>
                <th scope="row" className="py-2.5 pr-4 font-medium text-ink">
                  {KEY_DETAIL_LABELS[change.field]}
                </th>
                <td className="py-2.5 pr-4 break-all text-muted">
                  {change.before ? <s className="decoration-muted/60">{change.before}</s> : 'Not given'}
                </td>
                <td className="py-2.5 pr-4">
                  <ArrowRight aria-hidden="true" className="size-4 text-muted" />
                </td>
                <td className="py-2.5 pr-4 font-semibold break-all text-ink">
                  {change.after ?? <span className="font-normal text-muted">Removed</span>}
                </td>
                <td className="py-2.5 whitespace-nowrap text-muted">{formatDateNz(change.changedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ReviewSection>
  );
}
