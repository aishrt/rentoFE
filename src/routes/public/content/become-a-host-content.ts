import { BadgeCheck, Camera, Landmark, SlidersHorizontal, type LucideIcon } from 'lucide-react';

/*
 * Become a Host page copy (plan §9, Days 12–14), drafted from the spec (§4, §11) and approved by the client
 * later (plan §16 item 18). The earnings figures, documents and photo angles come from GET /policies.
 */

export const hero = {
  eyebrow: 'Become a host',
  // The spec's proposition, word for word (spec §4).
  title: 'Have a car? Earn money by sharing it.',
  lead: 'List it in a guided setup, choose the price and the days it’s free, and hand the keys to verified guests. We look after the bookings, the payments and the condition records.',
};

export interface Benefit {
  icon: LucideIcon;
  title: string;
  text: string;
}

export const benefits: Benefit[] = [
  {
    icon: SlidersHorizontal,
    title: 'Your car, your terms',
    text: 'Set the daily price, weekly and monthly discounts, trip lengths and the days your car is free.',
  },
  {
    icon: BadgeCheck,
    title: 'Verified guests',
    text: 'Every guest confirms their details and driver licence before their first trip.',
  },
  {
    icon: Camera,
    title: 'A record of every handover',
    text: 'Photos, odometer and fuel readings at pickup and return, stored with the booking.',
  },
  {
    icon: Landmark,
    title: 'Paid to your bank',
    text: 'Earnings are released after each trip starts and paid to your New Zealand bank account.',
  },
];

export const estimatorHeading = {
  eyebrow: 'Earnings estimator',
  title: 'What could your car earn?',
  description:
    'Choose your car’s body type and how often it might be booked, and see a typical month after our commission.',
};

export const applicationStep = {
  title: 'First, your host application',
  text: 'A one-off step before your first listing, so guests know who they’re renting from.',
  points: ['Your host profile', 'The Host Agreement', 'An identity check'],
};

/** The six listing steps (spec §11), in the order of the onboarding stepper (plan §12.6). */
export const listingSteps = [
  {
    title: 'Vehicle details',
    text: 'Registration number, make, model, year and variant, fuel type, transmission, seats and doors.',
  },
  {
    title: 'Documents',
    text: 'Upload your car’s documents so our team can check them before the listing goes live.',
  },
  {
    title: 'Photos',
    text: 'Take a clear photo of each required angle. There’s an example for every one.',
  },
  {
    title: 'Pricing',
    text: 'A daily price, optional weekly and monthly discounts, and your shortest and longest trips.',
  },
  {
    title: 'Availability',
    text: 'The days your car is free, the ones you need it, and the notice and preparation time you’d like between trips.',
  },
  {
    title: 'Pickup and delivery',
    text: 'Where guests collect the car, and whether you deliver, to an address or the airport, for a fee you set.',
  },
];

export const afterListing =
  'Then we review your listing. It goes live as soon as it’s approved and your payouts are set up.';

export const closing = {
  title: 'Ready to share your car?',
  description: 'Your application takes a few minutes, and you can save your listing and finish it later.',
};
