import { useSearchParams } from 'react-router';
import { SegmentedTabs, type TabOption } from '@/components/ui/segmented-tabs';
import { tabId, tabPanelId } from '@/components/ui/tab-ids';
import { FaqsPanel } from '@/features/admin/content/faqs';
import { HelpArticlesPanel } from '@/features/admin/content/help-articles';
import { AdminPageHeader } from '@/features/admin/ops/admin-page-header';

const TAB_PREFIX = 'help';

type Tab = 'faqs' | 'articles';

const TABS = [
  { value: 'faqs', label: 'FAQs' },
  { value: 'articles', label: 'Help articles' },
] as const satisfies readonly TabOption<Tab>[];

/** The tab is in the address (?tab=articles), so a link can open it. */
const tabFrom = (value: string | null): Tab => (value?.toLowerCase() === 'articles' ? 'articles' : 'faqs');

/**
 * FAQs and help articles (spec §18; plan §6.2, §12.6), the admin's: the questions on the FAQ pages and the
 * homepage, and the help centre's articles. The API clears the website's cache on each save, so changes
 * show there within a minute.
 */
export function AdminHelpPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = tabFrom(searchParams.get('tab'));

  const changeTab = (next: Tab) => setSearchParams(next === 'faqs' ? {} : { tab: next }, { replace: true });

  return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader
        eyebrow="Platform"
        title="FAQs & help"
        description="The questions on the FAQ pages, with those picked for the homepage, and the help centre’s articles. Changes show on the website within a minute of saving."
      />

      <div className="mt-6 flex">
        <SegmentedTabs
          idPrefix={TAB_PREFIX}
          label="FAQs and help"
          options={TABS}
          value={tab}
          onChange={changeTab}
          className="w-full sm:w-auto"
        />
      </div>

      <div
        role="tabpanel"
        id={tabPanelId(TAB_PREFIX, tab)}
        aria-labelledby={tabId(TAB_PREFIX, tab)}
        className="mt-6"
      >
        {tab === 'faqs' ? <FaqsPanel /> : <HelpArticlesPanel />}
      </div>
    </div>
  );
}
