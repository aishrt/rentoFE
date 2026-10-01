import { useSearchParams } from 'react-router';
import { PageMeta } from '@/components/layout/page-meta';
import { PlatformSettingsPanel } from '@/features/admin/platform-settings/platform-settings-panel';
import { UnsavedChangesContext, useUnsavedGroups } from '@/features/admin/platform-settings/unsaved-changes';
import { SettingsNav } from '@/features/admin/settings-nav';
import { readSettingsView, type SettingsView } from '@/features/admin/settings-view';
import { TwoFactorSection } from '@/features/admin/two-factor-section';
import { useSession } from '@/features/auth/use-session';
import { cn } from '@/lib/cn';

/**
 * Staff portal settings: everyone's own sign-in security, and for the admin, the platform settings that
 * wait for the client's decisions (plan §16), laid out as a small dashboard with its own menu. The page
 * shown is in the address (?tab=platform&section=fees), so a link can open it.
 */
export function AdminSettingsPage() {
  const session = useSession();
  const isAdmin = session.data?.roles.includes('ADMIN') ?? false;
  const [searchParams] = useSearchParams();
  const view: SettingsView = isAdmin ? readSettingsView(searchParams) : 'account';
  const [unsaved, reportUnsaved] = useUnsavedGroups();

  return (
    <div className={cn('mx-auto max-w-3xl', isAdmin && 'xl:max-w-6xl')}>
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

      <div
        className={cn(
          'mt-8',
          isAdmin && 'xl:grid xl:grid-cols-[17rem_minmax(0,1fr)] xl:items-start xl:gap-8',
        )}
      >
        {isAdmin && <SettingsNav view={view} unsaved={unsaved} />}
        {/* In the same place either way, so the sign-in settings aren't rebuilt once the session loads. */}
        <div className={cn('min-w-0', isAdmin && 'mt-6 xl:mt-0')}>
          <div hidden={view !== 'account'} className="grid animate-fade-up gap-6">
            <TwoFactorSection />
          </div>
          {isAdmin && (
            // Kept mounted on the sign-in page too, so changes not saved yet survive a look at it.
            <div hidden={view === 'account'}>
              <UnsavedChangesContext value={reportUnsaved}>
                <PlatformSettingsPanel view={view === 'account' ? 'overview' : view} unsaved={unsaved} />
              </UnsavedChangesContext>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
