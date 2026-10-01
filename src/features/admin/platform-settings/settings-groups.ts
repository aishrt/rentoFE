import {
  Banknote,
  Building2,
  CalendarX2,
  IdCard,
  ListChecks,
  Percent,
  Receipt,
  ScanSearch,
  ShieldCheck,
  Star,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { DecisionKey, PlatformSettings } from '@/api/types';
import { formatNzdFromCents } from '@/lib/format';
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

export interface SettingsGroup {
  key: DecisionKey;
  /** The short name, in the settings menu and on the overview. */
  label: string;
  icon: LucideIcon;
  /** The values in force in a few words, for the overview. */
  summary: (settings: PlatformSettings) => string;
  Section: (props: { settings: PlatformSettings }) => ReactNode;
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
const onOff = (on: boolean) => (on ? 'on' : 'off');

/** One group per client decision, in the order of the plan's "Waiting for the client" list (§16). */
export const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    key: 'fees',
    label: 'Fees',
    icon: Percent,
    summary: ({ fees }) =>
      `${fees.guestServiceFeePct}% Guest service fee, ${fees.hostCommissionPct}% Host commission`,
    Section: FeesSection,
  },
  {
    key: 'cancellation',
    label: 'Cancellations',
    icon: CalendarX2,
    summary: ({ cancellation }) => {
      const fallback =
        cancellation.tiers.find((tier) => tier.code === cancellation.defaultTier)?.name ??
        cancellation.defaultTier;
      const fee = cancellation.hostCancellationFeeCents;
      return `${fallback} by default, ${fee > 0 ? `${formatNzdFromCents(fee)} Host cancellation fee` : 'no Host cancellation fee'}`;
    },
    Section: CancellationSection,
  },
  {
    key: 'securityDeposit',
    label: 'Security deposit',
    icon: Banknote,
    summary: ({ securityDeposit }) =>
      securityDeposit.amountCents > 0
        ? `${formatNzdFromCents(securityDeposit.amountCents)} held on the Guest's card`
        : 'No deposit',
    Section: SecurityDepositSection,
  },
  {
    key: 'eligibility',
    label: 'Driver eligibility',
    icon: IdCard,
    summary: ({ eligibility }) =>
      `Drivers ${eligibility.minAge}+, licensed for ${plural(eligibility.minYearsLicensed, 'year')}`,
    Section: EligibilitySection,
  },
  {
    key: 'gst',
    label: 'GST',
    icon: Receipt,
    summary: ({ fees }) => `${fees.gstRatePct}% included in every price`,
    Section: GstSection,
  },
  {
    key: 'protection',
    label: 'Protection and roadside',
    icon: ShieldCheck,
    summary: ({ protectionPlans, roadsideAssistance }) =>
      `${plural(protectionPlans.length, 'plan')}, ${roadsideAssistance.phone ? `roadside on ${roadsideAssistance.phone}` : 'no roadside number yet'}`,
    Section: ProtectionSection,
  },
  {
    key: 'reviewsAndTrips',
    label: 'Reviews and trips',
    icon: Star,
    summary: ({ reviews, trips }) =>
      `Reviews open for ${plural(reviews.windowDays, 'day')}, ${plural(trips.lateReturnGraceMinutes, 'minute')} grace for late returns`,
    Section: ReviewsAndTripsSection,
  },
  {
    key: 'company',
    label: 'Company and brand',
    icon: Building2,
    summary: ({ business }) =>
      `${business.legalName}, ${business.gstNumber ? `GST ${business.gstNumber}` : 'no GST number yet'}`,
    Section: CompanySection,
  },
  {
    key: 'bookingRules',
    label: 'Other booking rules',
    icon: ListChecks,
    summary: ({ bookingRules }) =>
      `Enquiries ${onOff(bookingRules.enquiriesBeforeBooking)}, additional drivers ${onOff(bookingRules.additionalDrivers)}`,
    Section: BookingRulesSection,
  },
  {
    key: 'verificationServices',
    label: 'Licence and plate checks',
    icon: ScanSearch,
    summary: ({ verificationServices }) =>
      `Licence check ${onOff(verificationServices.nzLicenceCheck)}, plate lookup ${onOff(verificationServices.plateLookup)}`,
    Section: VerificationServicesSection,
  },
];

export const isSettingsGroup = (value: string | null): value is DecisionKey =>
  SETTINGS_GROUPS.some((group) => group.key === value);
