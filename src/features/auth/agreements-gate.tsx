import { lazy, Suspense } from 'react';
import { useSession } from './use-session';

// Almost nobody sees it, so its code loads only when needed, keeping it out of every page's first load.
const AgreementsDialog = lazy(async () => ({
  default: (await import('./agreements-dialog')).AgreementsDialog,
}));

/**
 * When a new version of a legal document is published, a signed-in user accepts it before carrying on
 * (plan §6.1).
 */
export function AgreementsGate() {
  const { data: user } = useSession();
  const pending = user?.pendingAgreements ?? [];
  if (pending.length === 0) return null;
  return (
    <Suspense fallback={null}>
      <AgreementsDialog pending={pending} />
    </Suspense>
  );
}
