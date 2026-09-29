import { PageMeta } from '@/components/layout/page-meta';
import { TwoFactorSection } from '@/features/admin/two-factor-section';
import { useSession } from '@/features/auth/use-session';

/**
 * Staff portal settings. For now the staff member's own sign-in security; platform settings (fees,
 * cancellation policies and the rest, plan §12.6) join it later.
 */
export function AdminSettingsPage() {
  const session = useSession();

  return (
    <div className="mx-auto max-w-3xl">
      <PageMeta title="Settings · Staff portal" noindex />

      <header className="animate-fade-up">
        <p className="eyebrow text-primary">Your account</p>
        <h1 className="headline mt-2 text-title-3 font-medium">Settings</h1>
        <p className="mt-2 text-muted">
          How you sign in to the staff portal{session.data ? ` as ${session.data.email}` : ''}.
        </p>
      </header>

      <div className="mt-8 grid gap-6">
        <TwoFactorSection />
      </div>
    </div>
  );
}
