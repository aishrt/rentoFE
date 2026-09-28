import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import type { SessionUser } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useSession } from './use-session';

interface RequireSignedInProps {
  children: (user: SessionUser) => ReactNode;
  /** Shown while the session loads, shaped like the page it guards. */
  fallback: ReactNode;
}

/**
 * Route guard for pages that need an account: visitors go to log in and come back afterwards. It
 * only hides pages; the API checks the session on every request.
 */
export function RequireSignedIn({ children, fallback }: RequireSignedInProps) {
  const session = useSession();
  const location = useLocation();

  if (session.isPending) return fallback;
  if (session.isError) {
    return (
      <Alert
        variant="danger"
        role="alert"
        action={<Button onClick={() => session.refetch()}>Try again</Button>}
      >
        We can't reach Rento Vroom right now. Check your connection, then try again.
      </Alert>
    );
  }
  if (!session.data) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return children(session.data);
}
