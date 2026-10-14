import type { PublicPolicies } from '@/api/types';

/**
 * The roadside assistance number for a booking: its protection plan's own, when the insurer gives one, or
 * else the platform-wide number (plan §16, item 9). Empty until either is set.
 */
export function roadsidePhone(policies: PublicPolicies | undefined, planCode?: string): string {
  const plan = planCode
    ? policies?.protectionPlans.find((candidate) => candidate.code === planCode)
    : undefined;
  return plan?.roadsidePhone || policies?.roadsideAssistance.phone || '';
}
