import { useSearchParams } from 'react-router';
import { PageMeta } from '@/components/layout/page-meta';
import { SegmentedTabs, type TabOption } from '@/components/ui/segmented-tabs';
import { tabId, tabPanelId } from '@/components/ui/tab-ids';
import { PlatformSettingsTab } from '@/features/admin/platform-settings/platform-settings-tab';
import { TwoFactorSection } from '@/features/admin/two-factor-section';
import { useSession } from '@/features/auth/use-session';

const TAB_PREFIX = 'settings';

const TABS = [
  { value: 'account', label: 'Your sign-in' },
  { value: 'platform', label: 'Platform settings' },
] as const satisfies readonly TabOption<string>[];

type Tab = (typeof TABS)[number]['value'];

/**
 * Staff portal settings: everyone's own sign-in security, and for the admin, the platform settings that
 * wait for the client's decisions (plan §16). The tab is in the address (?tab=platform), so a link can
 * open it.
 */
export function AdminSettingsPage() {
  const session = useSession();
  const isAdmin = session.data?.roles.includes('ADMIN') ?? false;
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: Tab = isAdmin && searchParams.get('tab') === 'platform' ? 'platform' : 'account';

  const changeTab = (next: Tab) =>
    setSearchParams(next === 'account' ? {} : { tab: next }, { replace: true });

  const account = (
    <div className="grid gap-6">
      <TwoFactorSection />
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl">
      <PageMeta title="Settings · Staff portal" noindex />

      <header className="animate-fade-up">
        <p className="eyebrow text-primary">{isAdmin ? 'Platform' : 'Your account'}</p>
        <h1 className="headline mt-2 text-title-3 font-medium">Settings</h1>
        <p className="mt-2 text-muted">
          {isAdmin
            ? 'How you sign in, and the fees, policies and rules the website uses.'
            : `How you sign in to the staff portal${session.data ? ` as ${session.data.email}` : ''}.`}
        </p>
      </header>

      {isAdmin && (
        <SegmentedTabs
          idPrefix={TAB_PREFIX}
          label="Settings"
          options={TABS}
          value={tab}
          onChange={changeTab}
          className="mt-8 w-full sm:w-auto"
        />
      )}
      {/* The same element either way, so the sign-in settings aren't rebuilt once the session loads. */}
      <div
        role={isAdmin ? 'tabpanel' : undefined}
        id={isAdmin ? tabPanelId(TAB_PREFIX, tab) : undefined}
        aria-labelledby={isAdmin ? tabId(TAB_PREFIX, tab) : undefined}
        className={isAdmin ? 'mt-6' : 'mt-8'}
      >
        {tab === 'platform' ? <PlatformSettingsTab /> : account}
      </div>
    </div>
  );
}
