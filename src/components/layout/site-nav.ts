export interface NavLinkItem {
  label: string;
  to: string;
}

/**
 * Header navigation (plan §12.6). "Help" opens the FAQs until the help centre arrives in Phase 3 (plan §9).
 */
export const primaryNav: NavLinkItem[] = [
  { label: 'Browse cars', to: '/cars' },
  { label: 'How it works', to: '/how-it-works' },
  { label: 'Become a host', to: '/become-a-host' },
  { label: 'Help', to: '/faq' },
];

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
];

/** Social accounts for the footer (spec §4). Empty until the client supplies them; the footer hides the row. */
export const socialLinks: { label: string; href: string }[] = [];
