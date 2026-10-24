export interface NavLinkItem {
  label: string;
  to: string;
}

/** Header navigation (plan §12.6). */
export const primaryNav: NavLinkItem[] = [
  { label: 'Browse cars', to: '/cars' },
  { label: 'How it works', to: '/how-it-works' },
  { label: 'Become a host', to: '/become-a-host' },
  { label: 'Help', to: '/help' },
];

/** Drops the Become a host link for a Host whose application is approved. */
export function visibleNav<T extends { to: string }>(items: T[], approvedHost: boolean): T[] {
  return approvedHost ? items.filter((item) => item.to !== '/become-a-host') : items;
}

/** The footer's links at launch; admins change them on the staff portal's Content page (plan §12.6). */
export const footerNav: { title: string; links: NavLinkItem[] }[] = [
  {
    title: 'Rent',
    links: [
      { label: 'Browse cars', to: '/cars' },
      { label: 'How it works', to: '/how-it-works' },
      { label: 'Safety', to: '/safety' },
      { label: 'Insurance & protection', to: '/insurance' },
    ],
  },
  {
    title: 'Host',
    links: [
      { label: 'Become a host', to: '/become-a-host' },
      { label: 'Host agreement', to: '/host-agreement' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Help centre', to: '/help' },
      { label: 'FAQs', to: '/faq' },
      { label: 'Contact us', to: '/contact' },
      { label: 'About us', to: '/about' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms & conditions', to: '/terms' },
      { label: 'Privacy policy', to: '/privacy' },
      { label: 'Cancellation policy', to: '/cancellation-policy' },
      { label: 'Guest agreement', to: '/guest-agreement' },
    ],
  },
  {
    title: 'Policies',
    links: [
      { label: 'Community guidelines', to: '/community-guidelines' },
      { label: 'Refund policy', to: '/refund-policy' },
      { label: 'Vehicle eligibility', to: '/vehicle-eligibility' },
      { label: 'Driver eligibility', to: '/driver-eligibility' },
      { label: 'Payment & fees', to: '/payment-and-fees' },
      { label: 'Damage & claims', to: '/damage-and-claims' },
      { label: 'Security deposit', to: '/security-deposit' },
      { label: 'Prohibited uses', to: '/prohibited-uses' },
      { label: 'Late returns & charges', to: '/late-returns-and-charges' },
    ],
  },
];

/**
 * Social accounts for the footer and Contact Us (spec §4), at launch. Admins can change them on the Content
 * page; the footer hides the row when there are none.
 */
export const socialLinks: { label: string; href: string }[] = [
  { label: 'Instagram', href: 'https://www.instagram.com/rento_vroom' },
];
