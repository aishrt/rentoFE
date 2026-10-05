import { HeartHandshake, MapPin, Mountain, Receipt, type LucideIcon } from 'lucide-react';

/*
 * About Us copy (plan §9, Days 12–14). Placeholder text drafted by the team from the spec (§1, §29) until the
 * client writes or approves their own (plan §16 item 18). No founders, figures or history are claimed.
 */

export const hero = {
  eyebrow: 'About Rento Vroom',
  title: 'Cars from the people who live here.',
  lead: 'Rento Vroom is a New Zealand marketplace where local owners share their cars with locals and visitors. More choice for drivers, a fair return for owners, and trust built into every trip.',
};

export const story = {
  eyebrow: 'The idea',
  statement: 'Most cars spend their days parked. We think they could be heading for the hills.',
  paragraphs: [
    'All over Aotearoa, good cars wait in driveways while visitors queue at rental counters and locals go looking for a ute for the weekend. Rento Vroom brings the two together: owners earn from a car they already have, and drivers get more choice, often closer to where they are.',
    'We look after the parts that build trust between strangers: checking who’s who, taking payments securely, recording the car’s condition at every handover, and helping when something goes wrong.',
  ],
};

export interface Value {
  icon: LucideIcon;
  title: string;
  text: string;
}

export const valuesHeading = {
  eyebrow: 'What we stand for',
  title: 'Local, open and fair',
};

export const values: Value[] = [
  {
    icon: MapPin,
    title: 'Local first',
    text: 'Every car belongs to someone who lives here, so local knowledge often comes with the keys.',
  },
  {
    icon: Mountain,
    title: 'Made for New Zealand',
    text: 'NZ addresses and driver licences, rego and WOF on every listing, times in NZ time and prices in New Zealand dollars.',
  },
  {
    icon: HeartHandshake,
    title: 'Trust on both sides',
    text: 'Verified members, reviews in both directions and a condition record for every trip.',
  },
  {
    icon: Receipt,
    title: 'Honest pricing',
    text: 'Prices in NZD with the mandatory charges included, and the full breakdown before you pay.',
  },
];

export const closing = {
  title: 'Come along for the ride',
  description: 'Find a car for your next trip, or share yours and earn when you’re not using it.',
};
