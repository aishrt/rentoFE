import {
  BadgeCheck,
  Camera,
  CarFront,
  CircleDollarSign,
  ClipboardCheck,
  KeyRound,
  LifeBuoy,
  LockKeyhole,
  MessagesSquare,
  Receipt,
  Search,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

/*
 * Homepage copy. Admins will edit most of it through the CMS (`cmsBlocks`, `destinations`, `faqs`,
 * plan §12.6); until then it lives here. Claims stay general on purpose: fees, protection and
 * eligibility details are confirmed with the client first (plan §16).
 */

export interface Feature {
  icon: LucideIcon;
  title: string;
  text: string;
}

export const trustPoints: Feature[] = [
  { icon: BadgeCheck, title: 'Verified members', text: 'Identity and licence checks for guests and hosts' },
  { icon: Receipt, title: 'All-in NZD pricing', text: 'Mandatory fees included in every price' },
  { icon: Camera, title: 'Photo check-in', text: 'A timestamped condition record for every trip' },
  { icon: LifeBuoy, title: 'Help on the road', text: 'Report an issue straight from your trip' },
];

export interface Destination {
  name: string;
  maoriName?: string;
  region: string;
  tagline: string;
  /** Tailwind gradient classes for the tile. */
  tone: string;
}

/** The five launch destinations (MILESTONES.md, Phase 4). */
export const destinations: Destination[] = [
  {
    name: 'Queenstown',
    maoriName: 'Tāhuna',
    region: 'Otago',
    tagline: 'Alpine roads, lakes and the ski fields, all within an hour or two.',
    tone: 'from-[#14493D] via-[#0E3B32] to-[#08120F]',
  },
  {
    name: 'Auckland',
    maoriName: 'Tāmaki Makaurau',
    region: 'Auckland',
    tagline: 'Harbour city, island ferries and wild west coast beaches.',
    tone: 'from-[#1C4A55] to-[#0A1513]',
  },
  {
    name: 'Christchurch',
    maoriName: 'Ōtautahi',
    region: 'Canterbury',
    tagline: 'The gateway to Arthur’s Pass and the Southern Alps.',
    tone: 'from-[#34473C] to-[#0A1310]',
  },
  {
    name: 'Wellington',
    maoriName: 'Te Whanganui-a-Tara',
    region: 'Wellington',
    tagline: 'The harbour capital, with the Wairarapa wine trail next door.',
    tone: 'from-[#243C4B] to-[#0A1214]',
  },
  {
    name: 'Rotorua',
    region: 'Bay of Plenty',
    tagline: 'Geothermal valleys, lakes and redwood forest trails.',
    tone: 'from-[#4B3B22] to-[#110F0A]',
  },
];

export interface Step {
  icon: LucideIcon;
  title: string;
  text: string;
}

export const guestSteps: Step[] = [
  {
    icon: Search,
    title: 'Search and compare',
    text: 'Tell us where and when. Compare cars from local hosts, each with a clear all-in price in NZD.',
  },
  {
    icon: ShieldCheck,
    title: 'Book and get verified',
    text: 'Book in a few taps. Everyone is verified before the keys change hands.',
  },
  {
    icon: CarFront,
    title: 'Hit the road',
    text: 'Meet your host or have the car delivered, complete a quick photo check-in, and go.',
  },
];

export const hostSteps: Step[] = [
  {
    icon: ClipboardCheck,
    title: 'List your car',
    text: 'Add your car’s details, documents and photos in a guided setup. We review every listing.',
  },
  {
    icon: KeyRound,
    title: 'Set your terms',
    text: 'You choose the daily price, the dates it’s available and where guests can collect it.',
  },
  {
    icon: CircleDollarSign,
    title: 'Earn from each trip',
    text: 'Accept bookings, hand over the keys and get paid out to your New Zealand bank account.',
  },
];

export const hostPoints = [
  'You set the daily price and any weekly or monthly discounts',
  'Block out the days you need your car',
  'Photo check-in and check-out on every trip',
  'Payouts straight to your NZ bank account',
];

export const listingSteps = [
  'Vehicle details',
  'Documents',
  'Photos',
  'Pricing',
  'Availability',
  'Pickup & delivery',
];

export const safetyFeatures: Feature[] = [
  {
    icon: BadgeCheck,
    title: 'Verified guests and hosts',
    text: 'Email, mobile, identity and driver licence checks before a first trip or a first listing.',
  },
  {
    icon: LockKeyhole,
    title: 'Secure payments',
    text: 'Card details are handled by our payment provider and never stored on Rento Vroom.',
  },
  {
    icon: Camera,
    title: 'Condition records',
    text: 'Timestamped photos, odometer and fuel readings at check-in and check-out.',
  },
  {
    icon: MessagesSquare,
    title: 'Messages in one place',
    text: 'Chat with your host or guest on the platform, so there’s a record if you need it.',
  },
  {
    icon: ShieldCheck,
    title: 'Clear protection options',
    text: 'What’s covered, and the excess you’d pay, shown before you book.',
  },
  {
    icon: LifeBuoy,
    title: 'Support when it counts',
    text: 'Report an incident from your trip and get a case number our team follows through.',
  },
];

export const faqs = [
  {
    question: 'How is Rento Vroom different from a rental company?',
    answer:
      'Every car belongs to a local host, not a rental fleet. You get a wider choice, from city hatchbacks to family SUVs and EVs, and you can often collect nearby or have the car delivered.',
  },
  {
    question: 'Who can rent a car?',
    answer:
      'You need a valid driver licence and to complete our verification checks before your first trip. Visitors are welcome: if your overseas licence isn’t in English, bring an International Driving Permit or an approved translation. The full eligibility rules are shown before you book.',
  },
  {
    question: 'What does the price include?',
    answer:
      'Every price is in NZD and includes all mandatory charges. Optional extras, like delivery to your door, are listed separately before you pay.',
  },
  {
    question: 'How do I list my car?',
    answer:
      'Choose Become a Host, tell us about yourself, then add your car in six guided steps: details, documents, photos, pricing, availability and pickup options. Our team reviews each listing before it goes live.',
  },
  {
    question: 'What if something goes wrong on a trip?',
    answer:
      'In an emergency, call 111 first. Then report the incident from your trip in the app: you’ll get a case number, and our support team works with both sides using the check-in and check-out records.',
  },
];
