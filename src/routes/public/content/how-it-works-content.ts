import {
  BadgeCheck,
  CalendarCheck,
  Camera,
  CarFront,
  ClipboardList,
  CreditCard,
  FileSearch,
  KeyRound,
  Landmark,
  LifeBuoy,
  Receipt,
  Search,
  ShieldCheck,
  Star,
  UserRoundCheck,
  type LucideIcon,
} from 'lucide-react';

/*
 * How it works page copy (plan §9, Days 12–14), drafted by the team from the spec's user journeys (spec §28)
 * and approved by the client later (plan §16 item 18). It moves to the CMS with the other page copy. Fees,
 * cover and eligibility are never stated here: the page reads them from GET /policies.
 */

export interface JourneyStep {
  icon: LucideIcon;
  title: string;
  text: string;
}

export const hero = {
  eyebrow: 'How it works',
  title: 'From a local’s driveway to the open road.',
  lead: 'Rento Vroom connects people who need a car with New Zealanders whose cars would otherwise sit still. Here’s how a trip works, whichever side of the keys you’re on.',
};

export const journeyTabs = [
  { value: 'renting', label: 'Renting a car' },
  { value: 'hosting', label: 'Sharing your car' },
] as const;

export type Journey = (typeof journeyTabs)[number]['value'];

export const journeyHeading = {
  eyebrow: 'Step by step',
  title: 'Every step, start to finish',
  description:
    'Book with the price, the policies and the car’s condition clear at every point, or share your car and earn from the days you don’t need it.',
};

/** The guest journey (spec §28): search to review. */
export const guestJourney: JourneyStep[] = [
  {
    icon: Search,
    title: 'Search and compare',
    text: 'Tell us where you’re headed and when. Compare cars from local hosts side by side, each with its estimated total for your dates in NZD.',
  },
  {
    icon: FileSearch,
    title: 'Check the details',
    text: 'Each listing shows the photos, the host’s rating, the rego and WOF, the fuel and kilometre rules, the cancellation policy and the protection options, all before you sign up.',
  },
  {
    icon: BadgeCheck,
    title: 'Create an account and get verified',
    text: 'Confirm your email and mobile number and add your driver licence. Every member is checked before their first trip.',
  },
  {
    icon: CreditCard,
    title: 'Book and pay in NZD',
    text: 'Pay securely by card, Apple Pay or Google Pay. Instant Book cars are confirmed straight away; other hosts answer your request within 24 hours. You both get a confirmation by email.',
  },
  {
    icon: Camera,
    title: 'Pick up with a photo check-in',
    text: 'Meet your host or have the car delivered. You photograph the car and record the odometer and the fuel or battery level together, so its condition is on record.',
  },
  {
    icon: CarFront,
    title: 'Enjoy the drive',
    text: 'Message your host on Rento Vroom, and report anything that comes up straight from your trip.',
  },
  {
    icon: Star,
    title: 'Return and review',
    text: 'A quick photo check-out closes the trip. Then you review your host, and they review you.',
  },
];

/** The host journey (spec §28): application to review. */
export const hostJourney: JourneyStep[] = [
  {
    icon: UserRoundCheck,
    title: 'Apply to host',
    text: 'Complete your host profile, accept the Host Agreement and verify your identity. It takes a few minutes.',
  },
  {
    icon: ClipboardList,
    title: 'Add your car in six steps',
    text: 'Vehicle details, documents, photos, pricing, availability, and pickup and delivery: one topic per screen, and you can save and come back.',
  },
  {
    icon: ShieldCheck,
    title: 'We review your listing',
    text: 'Our team checks your documents and photos. Once your payouts are set up, your car goes live.',
  },
  {
    icon: CalendarCheck,
    title: 'Accept bookings',
    text: 'Turn on Instant Book, or review each request and answer within 24 hours. Block out any days you need your car.',
  },
  {
    icon: KeyRound,
    title: 'Hand over the keys',
    text: 'Complete the photo check-in with your guest at pickup, and the check-out when the car comes back.',
  },
  {
    icon: Landmark,
    title: 'Get paid',
    text: 'Your earnings are released after the trip starts and paid to your New Zealand bank account.',
  },
  {
    icon: Star,
    title: 'Review your guest',
    text: 'Rate the trip once it’s done. Reviews on both sides help everyone choose with confidence.',
  },
];

export interface Pillar {
  icon: LucideIcon;
  title: string;
  text: string;
  link?: { label: string; to: string };
}

export const pillarsHeading = {
  eyebrow: 'Built in',
  title: 'The details that make it work',
  description:
    'The same protections sit behind every trip, whether you’re renting for a weekend or hosting all year.',
};

export const pillars: Pillar[] = [
  {
    icon: BadgeCheck,
    title: 'Verified members',
    text: 'Guests and hosts confirm their email and mobile number, and we check identity and driver licences. Every listing is reviewed before it goes live.',
    link: { label: 'How we keep trips safe', to: '/safety' },
  },
  {
    icon: ShieldCheck,
    title: 'Protection you choose',
    text: 'Pick a protection plan at checkout, with its daily price and excess shown side by side before you pay.',
    link: { label: 'Compare protection plans', to: '/insurance' },
  },
  {
    icon: Receipt,
    title: 'Clear prices in NZD',
    text: 'Prices are in New Zealand dollars with the mandatory charges included, and the full breakdown shows before you pay. Visitors can see an estimate in their own currency too.',
    link: { label: 'Read the FAQs', to: '/faq' },
  },
  {
    icon: Camera,
    title: 'Photo check-in and check-out',
    text: 'Timestamped photos, odometer and fuel readings at both ends of every trip, so you and the host share one clear record of the car’s condition.',
  },
  {
    icon: LifeBuoy,
    title: 'Support when you need it',
    text: 'Report an incident from your trip and get a case number our team follows through, or send us a message any time.',
    link: { label: 'Contact us', to: '/contact' },
  },
];

export const eligibilityCard = {
  title: 'Who can drive',
  footnote: 'The full rules are shown again before you book.',
};

export const closing = {
  title: 'Ready when you are',
  description: 'Find a car for your next trip, or put yours to work while you don’t need it.',
};
