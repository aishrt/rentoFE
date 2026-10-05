import {
  BadgeCheck,
  Camera,
  FileCheck,
  LockKeyhole,
  MessagesSquare,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

/*
 * Safety page copy (plan §9, Days 12–14; spec §22), drafted by the team and approved by the client later
 * (plan §16 item 18). The roadside assistance number comes from the insurance partner (plan §16 item 9) and
 * is shown in each booking and protection plan, so this page points there instead of printing it.
 */

export const hero = {
  eyebrow: 'Safety',
  title: 'Trust, built into every trip.',
  lead: 'Checks before the first trip, a clear record at every handover, and a team to help if something goes wrong.',
};

export interface SafetyFeature {
  icon: LucideIcon;
  title: string;
  text: string;
  link?: { label: string; to: string };
}

export const featuresHeading = {
  eyebrow: 'How we keep trips safe',
  title: 'Peace of mind on both sides of the keys',
  description:
    'The same checks and records sit behind every booking, from the first message to the final photo.',
};

export const features: SafetyFeature[] = [
  {
    icon: BadgeCheck,
    title: 'Verified guests and hosts',
    text: 'Everyone confirms their email and mobile number. We check identity and driver licences before a first trip, and identity before a first listing.',
  },
  {
    icon: FileCheck,
    title: 'Checked listings',
    text: 'Hosts upload their car’s documents, and our team reviews every listing, its photos and its rego and WOF before it goes live.',
  },
  {
    icon: Camera,
    title: 'Condition records',
    text: 'Timestamped photos, odometer and fuel or battery readings at check-in and check-out, kept with the booking.',
  },
  {
    icon: LockKeyhole,
    title: 'Secure payments',
    text: 'Card details are handled by our payment provider and never stored on Rento Vroom.',
  },
  {
    icon: MessagesSquare,
    title: 'Messages on the platform',
    text: 'Keep your conversations on Rento Vroom, so there’s a record if you need it. You can report or block anyone who makes you uneasy.',
  },
  {
    icon: ShieldCheck,
    title: 'Clear protection',
    text: 'The cover and the excess for each protection plan are shown before you book, and again in your trip.',
    link: { label: 'Compare protection plans', to: '/insurance' },
  },
];

export const emergencyHeading = {
  eyebrow: 'If something goes wrong',
  title: 'Three steps, in this order',
  description:
    'Accidents, thefts and breakdowns are rare, but it helps to know what to do before you need to.',
};

export const emergencySteps = [
  {
    title: 'Call 111 in an emergency',
    text: 'If anyone is hurt or in danger, or a crime is happening, call 111 for police, fire or ambulance. Everything else can wait.',
  },
  {
    title: 'Call roadside assistance',
    text: 'If the car breaks down or won’t start, call roadside assistance. You’ll find the number in your booking and in your protection plan.',
  },
  {
    title: 'Report it from your trip',
    text: 'Open your trip and choose Report an incident. Add photos and what happened, and you’ll get a case number. Our support team works with you and the other side from there.',
  },
];

export const scenarios = [
  {
    title: 'After an accident',
    points: [
      'Stop somewhere safe and check everyone is OK. Call 111 if anyone is hurt or the road is blocked.',
      'Swap names, phone numbers and insurance details with any other driver involved.',
      'Take photos of the scene and the damage, then report the incident from your trip.',
    ],
  },
  {
    title: 'If the car is stolen',
    points: [
      'Call 111 if it’s happening now. Otherwise, report it to the police on 105 or online.',
      'Let the host know through your trip’s messages.',
      'Report the incident from your trip, with the police reference number.',
    ],
  },
  {
    title: 'If it breaks down',
    points: [
      'Move off the road if you can, turn on the hazard lights and stay clear of traffic.',
      'Call roadside assistance: the number is in your booking and your protection plan.',
      'Message your host, and report it from your trip so we can help with the rest.',
    ],
  },
];

export const tollsAndFines = {
  title: 'Tolls and fines',
  text: 'Notices for unpaid tolls and for traffic or parking offences go to the car’s registered owner, usually the host. The host reports them to us with the notice, and we give the issuing authority the driver’s details or charge the guest where the Guest Agreement allows. If your route has a toll road, pay the toll yourself, as you would in your own car.',
};

export const closing = {
  title: 'Questions about safety?',
  description: 'Our support team is here for guests and hosts alike.',
};
