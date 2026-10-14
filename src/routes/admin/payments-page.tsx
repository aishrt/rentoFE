import { useSearchParams } from 'react-router';
import { SegmentedTabs, type TabOption } from '@/components/ui/segmented-tabs';
import { tabId, tabPanelId } from '@/components/ui/tab-ids';
import { PaymentsPanel } from '@/features/admin/finance/payments-panel';
import { PayoutsPanel } from '@/features/admin/finance/payouts-panel';
import { AdminPageHeader } from '@/features/admin/ops/admin-page-header';
import { TestPaymentSection } from '@/features/admin/test-payment-section';
import { useSession } from '@/features/auth/use-session';

const TAB_PREFIX = 'payments';

type Tab = 'payments' | 'payouts' | 'test';

const TABS = [
  { value: 'payments', label: 'Payments' },
  { value: 'payouts', label: 'Payouts' },
  { value: 'test', label: 'Stripe test' },
] as const satisfies readonly TabOption<Tab>[];

/** The tab is in the address (?tab=payouts), so the overview's queues can link to it. */
const tabFrom = (value: string | null): Tab => TABS.find((tab) => tab.value === value)?.value ?? 'payments';

/**
 * Payments and payouts in the staff portal (spec §18; plan §12.6): Guests' payments with their refunds
 * and disputes, Host payouts with their holds, and the admin's Stripe test payment. Support staff need
 * the refunds permission for the lists.
 */
export function AdminPaymentsPage() {
  const session = useSession();
  const isAdmin = session.data?.roles.includes('ADMIN') ?? false;
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = tabFrom(searchParams.get('tab'));
  // The Stripe test is the admin's; anyone sent to it by a link still sees why they can't run it.
  const tabs = isAdmin || tab === 'test' ? TABS : TABS.filter((option) => option.value !== 'test');

  const changeTab = (next: Tab) =>
    setSearchParams(next === 'payments' ? {} : { tab: next }, { replace: true });

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        eyebrow="Finance"
        title="Payments & payouts"
        description="Guests pay by card, Apple Pay or Google Pay through Stripe, always in NZD. Hosts are paid after each trip."
      />

      <div className="mt-8 flex">
        <SegmentedTabs
          idPrefix={TAB_PREFIX}
          label="Payments and payouts"
          options={tabs}
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
        {tab === 'payments' && <PaymentsPanel />}
        {tab === 'payouts' && <PayoutsPanel />}
        {tab === 'test' && (
          <div className="max-w-3xl">
            <TestPaymentSection />
          </div>
        )}
      </div>
    </div>
  );
}
