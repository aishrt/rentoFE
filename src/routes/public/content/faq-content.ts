/*
 * FAQ page copy (plan §9, Days 12–14). The questions themselves come from the database (GET /faqs), where
 * admins edit them (plan §12.6); only the page's framing lives here.
 */

export const hero = {
  eyebrow: 'FAQs',
  title: 'Questions, answered.',
  lead: 'What guests and hosts ask us most, in plain English.',
};

export const audienceTabs = [
  { value: 'ALL', label: 'All' },
  { value: 'GUEST', label: 'Guests' },
  { value: 'HOST', label: 'Hosts' },
] as const;

export const closing = {
  title: 'Still have a question?',
  description: 'Send us a message and our support team will reply by email.',
};
