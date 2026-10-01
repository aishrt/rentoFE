import type { ReactNode } from 'react';
import type { DecisionKey, PlatformSettings } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatLongDateNz } from '@/lib/format';
import { CancellationSection } from './cancellation-section';
import { FeesSection, GstSection, SecurityDepositSection } from './money-sections';
import { ProtectionSection } from './protection-section';
import {
  BookingRulesSection,
  CompanySection,
  EligibilitySection,
  ReviewsAndTripsSection,
  VerificationServicesSection,
} from './rules-sections';
import { usePlatformSettings } from './settings-api';

/** The cards in the order of the plan's "Waiting for the client" list, with the names in the summary. */
const SECTIONS: {
  key: DecisionKey;
  label: string;
  Section: (props: { settings: PlatformSettings }) => ReactNode;
}[] = [
  { key: 'fees', label: 'Fees', Section: FeesSection },
  { key: 'cancellation', label: 'Cancellations', Section: CancellationSection },
  { key: 'securityDeposit', label: 'Security deposit', Section: SecurityDepositSection },
  { key: 'eligibility', label: 'Driver eligibility', Section: EligibilitySection },
  { key: 'gst', label: 'GST', Section: GstSection },
  { key: 'protection', label: 'Protection and roadside', Section: ProtectionSection },
  { key: 'reviewsAndTrips', label: 'Reviews and trips', Section: ReviewsAndTripsSection },
  { key: 'company', label: 'Company and brand', Section: CompanySection },
  { key: 'bookingRules', label: 'Other booking rules', Section: BookingRulesSection },
  {
    key: 'verificationServices',
    label: 'Licence check and plate lookup',
    Section: VerificationServicesSection,
  },
];

/**
 * The admin's Platform settings tab (plan §3 `platformSettings`, §16): the values that wait for the
 * client's decisions, which checkout, listings and the public pages read from the database. Admin only;
 * the API refuses everyone else.
 */
export function PlatformSettingsTab() {
  const query = usePlatformSettings();

  if (query.isPending) {
    return (
      <div aria-busy="true" className="grid gap-6">
        <span className="sr-only">Loading the platform settings</span>
        <Skeleton className="h-40 rounded-card" />
        <Skeleton className="h-96 rounded-card" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <Alert
        variant="danger"
        role="alert"
        title="We couldn't load the platform settings"
        action={
          <Button variant="secondary" size="sm" onClick={() => query.refetch()} loading={query.isFetching}>
            Try again
          </Button>
        }
      >
        {query.error.message}
      </Alert>
    );
  }

  const { settings, updatedAt, updatedBy } = query.data;
  const pending = SECTIONS.filter(({ key }) => settings.decisions[key].status === 'PENDING');

  return (
    <div className="grid gap-6">
      <Alert
        variant={pending.length > 0 ? 'info' : 'success'}
        title={
          pending.length > 0
            ? `${pending.length} of ${SECTIONS.length} decisions are still placeholders`
            : 'The client has confirmed every decision'
        }
      >
        <p>
          The values in force apply straight away to new quotes, listings and pages, confirmed or not.
          Bookings already made keep their terms.
          {updatedAt &&
            ` Last saved${updatedBy ? ` by ${updatedBy}` : ''} on ${formatLongDateNz(new Date(updatedAt))}.`}
        </p>
        {pending.length > 0 && (
          <ul aria-label="Waiting for the client" className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {pending.map(({ key, label }) => (
              <li key={key}>
                <a href={`#settings-${key}`} className="link-underline font-medium text-primary">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Alert>

      {SECTIONS.map(({ key, Section }) => (
        <Section key={key} settings={settings} />
      ))}
    </div>
  );
}
