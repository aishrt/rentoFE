import type { ComponentType } from 'react';
import { useSearchParams } from 'react-router';
import { SegmentedTabs, type TabOption } from '@/components/ui/segmented-tabs';
import { tabId, tabPanelId } from '@/components/ui/tab-ids';
import { DestinationsPanel } from '@/features/admin/content/destinations';
import { FaqsPanel } from '@/features/admin/content/faqs';
import { FeaturedCarsPanel } from '@/features/admin/content/featured-cars';
import { FooterLinksPanel } from '@/features/admin/content/footer-links';
import { HelpArticlesPanel } from '@/features/admin/content/help-articles';
import { HeroTextPanel } from '@/features/admin/content/hero-text';
import { HomepageReviewsPanel } from '@/features/admin/content/homepage-reviews';
import { LegalPagesPanel } from '@/features/admin/content/legal-pages';
import { AdminPageHeader } from '@/features/admin/ops/admin-page-header';

const TAB_PREFIX = 'content';

type Tab = 'featured' | 'headline' | 'reviews' | 'legal' | 'destinations' | 'footer' | 'faqs' | 'help';

const TABS = [
  { value: 'featured', label: 'Featured cars' },
  { value: 'headline', label: 'Headline' },
  { value: 'reviews', label: 'Customer reviews' },
  { value: 'legal', label: 'Legal pages' },
  { value: 'destinations', label: 'Destinations' },
  { value: 'footer', label: 'Footer links' },
  { value: 'faqs', label: 'FAQs' },
  { value: 'help', label: 'Help articles' },
] as const satisfies readonly TabOption<Tab>[];

/** The tab is in the address (?tab=faqs), so a link can open it. */
const tabFrom = (value: string | null): Tab =>
  TABS.find((tab) => tab.value === value?.toLowerCase())?.value ?? 'featured';

const PANELS: Record<Tab, ComponentType> = {
  featured: FeaturedCarsPanel,
  headline: HeroTextPanel,
  reviews: HomepageReviewsPanel,
  legal: LegalPagesPanel,
  destinations: DestinationsPanel,
  footer: FooterLinksPanel,
  faqs: FaqsPanel,
  help: HelpArticlesPanel,
};

/**
 * The website's content (spec §18; plan §9, Days 19–23; §12.6), admin only: the homepage's featured cars,
 * headline and customer reviews, the legal pages, destination pages, the footer's links, FAQs and help
 * articles. The API clears the website's cache on each save, so changes show there within a minute.
 */
export function AdminContentPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = tabFrom(searchParams.get('tab'));
  const Panel = PANELS[tab];

  const changeTab = (next: Tab) =>
    setSearchParams(next === 'featured' ? {} : { tab: next }, { replace: true });

  return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader
        eyebrow="Platform"
        title="Content"
        description="What the website shows: the homepage’s featured cars, headline and customer reviews, the legal pages, destination pages, the footer’s links, FAQs and help articles. Changes show on the website within a minute of saving."
      />

      {/*
        Eight tabs are wider than a phone, and than a tablet: they scroll sideways there. The padding leaves room for the tabs'
        shadow, which the scroller would clip, and the negative margins take that room back.
      */}
      <div className="scrollbar-subtle relative -mx-4 mt-6 -mb-6 overflow-x-auto px-4 pt-2 pb-6">
        <SegmentedTabs
          idPrefix={TAB_PREFIX}
          label="Content"
          options={TABS}
          value={tab}
          onChange={changeTab}
          className="min-w-max sm:w-fit"
        />
      </div>

      <div
        role="tabpanel"
        id={tabPanelId(TAB_PREFIX, tab)}
        aria-labelledby={tabId(TAB_PREFIX, tab)}
        className="mt-6"
      >
        <Panel />
      </div>
    </div>
  );
}
