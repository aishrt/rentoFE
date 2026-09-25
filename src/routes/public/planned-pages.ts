export interface PlannedPage {
  path: string;
  title: string;
  description: string;
}

/**
 * Public routes that are linked from the header, footer or forms but built in later milestones
 * (plan §9). Each shows a "coming soon" page so no link dead-ends. Remove a page from this list
 * when its real route is added.
 */
export const plannedPages: PlannedPage[] = [
  {
    path: '/cars',
    title: 'Browse cars',
    description: 'Every car on Rento Vroom, with filters for price, seats, EVs, delivery and more.',
  },
  {
    path: '/search',
    title: 'Search results',
    description: 'Cars available for your dates, with the estimated total for each one.',
  },
  {
    path: '/how-it-works',
    title: 'How it works',
    description: 'A step-by-step guide to renting a car and to sharing yours.',
  },
  {
    path: '/become-a-host',
    title: 'Become a host',
    description: 'Share your car on your terms and earn when you are not using it.',
  },
  {
    path: '/safety',
    title: 'Safety',
    description: 'How we verify members, record each trip and help if something goes wrong.',
  },
  {
    path: '/insurance',
    title: 'Insurance and protection',
    description: 'The protection options for each trip, and what they cover.',
  },
  { path: '/faq', title: 'FAQs', description: 'Answers to the most common questions from guests and hosts.' },
  {
    path: '/help',
    title: 'Help centre',
    description: 'Guides for guests and hosts, and a way to contact our support team.',
  },
  { path: '/about', title: 'About us', description: 'The people and the idea behind Rento Vroom.' },
  {
    path: '/contact',
    title: 'Contact us',
    description: 'Send us a message and our support team will get back to you.',
  },
  {
    path: '/signup',
    title: 'Create an account',
    description: 'Sign up to book cars from local hosts, or to list your own.',
  },
  {
    path: '/forgot-password',
    title: 'Reset your password',
    description: 'We will email you a link to choose a new password.',
  },
  { path: '/terms', title: 'Terms and conditions', description: 'The terms for using Rento Vroom.' },
  {
    path: '/privacy',
    title: 'Privacy policy',
    description: 'How we collect, use and protect your personal information.',
  },
  {
    path: '/cancellation-policy',
    title: 'Cancellation policy',
    description: 'What happens when a guest or host cancels a trip.',
  },
  {
    path: '/host-agreement',
    title: 'Host agreement',
    description: 'The agreement between Rento Vroom and hosts.',
  },
  {
    path: '/guest-agreement',
    title: 'Guest agreement',
    description: 'The agreement between Rento Vroom and guests.',
  },
];
