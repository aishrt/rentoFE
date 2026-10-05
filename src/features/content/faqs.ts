import type { Faq } from '@/api/types';

/** Who the FAQ page is showing questions for: everyone, guests or hosts. */
export type FaqFilter = 'ALL' | 'GUEST' | 'HOST';

/** Guests see the guest questions and the ones for everyone; hosts likewise. */
export function filterFaqs(faqs: readonly Faq[], filter: FaqFilter): Faq[] {
  if (filter === 'ALL') return [...faqs];
  return faqs.filter((faq) => faq.audience === filter || faq.audience === 'ALL');
}

export interface FaqGroup {
  category: string;
  /** For the section's heading and anchor, e.g. "getting-started". */
  id: string;
  faqs: Faq[];
}

/** Groups questions by category, keeping the order the team set in the admin (first appearance). */
export function groupFaqs(faqs: readonly Faq[]): FaqGroup[] {
  const groups = new Map<string, FaqGroup>();
  for (const faq of faqs) {
    const category = faq.category.trim() || 'General';
    let group = groups.get(category);
    if (!group) {
      const slug =
        category
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || 'general';
      group = { category, id: `faq-${slug}`, faqs: [] };
      groups.set(category, group);
    }
    group.faqs.push(faq);
  }
  return [...groups.values()];
}

/** FAQPage structured data (schema.org), so search engines can show the answers (plan §9, Days 12–14). */
export function faqPageJsonLd(faqs: readonly Faq[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}
