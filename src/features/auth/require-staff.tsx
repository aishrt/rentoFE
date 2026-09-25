import { LogOut, ShieldAlert, WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import type { SessionUser } from '@/api/types';
import { Logo } from '@/components/brand/logo';
import { PageMeta } from '@/components/layout/page-meta';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';
import { isStaff } from './roles';
import { useLogout, useSession } from './use-session';

interface RequireStaffProps {
  /** Rendered with the signed-in staff member once access is confirmed. */
  children: (user: SessionUser) => ReactNode;
  /** Shown while the session loads, shaped like the page it guards. */
  fallback: ReactNode;
}

/**
 * Route guard for the staff portal. It only hides pages: the API checks the role on every
 * admin request and is the real security boundary (plan §6.2).
 */
export function RequireStaff({ children, fallback }: RequireStaffProps) {
  const session = useSession();
  const location = useLocation();

  if (session.isPending) return fallback;

  if (session.isError) {
    return (
      <GuardMessage
        icon={<WifiOff aria-hidden="true" />}
        title="We can't reach Rento Vroom right now"
        body="Check your connection, then try again."
        action={
          <Button onClick={() => session.refetch()} loading={session.isFetching}>
            Try again
          </Button>
        }
      />
    );
  }

  if (!session.data) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/admin/login?next=${next}`} replace />;
  }

  if (!isStaff(session.data)) return <StaffOnly />;

  return children(session.data);
}

function StaffOnly() {
  const logout = useLogout();
  const navigate = useNavigate();

  return (
    <GuardMessage
      icon={<ShieldAlert aria-hidden="true" />}
      title="Staff access only"
      body="You're logged in with an account that can't open the staff portal. Log out, then log in with a staff account."
      action={
        <>
          <Button
            loading={logout.isPending}
            onClick={() =>
              logout.mutate(undefined, { onSettled: () => navigate('/admin/login', { replace: true }) })
            }
          >
            <LogOut aria-hidden="true" />
            Log out
          </Button>
          <Button variant="secondary" asChild>
            <Link to="/">Go to the homepage</Link>
          </Button>
        </>
      }
    />
  );
}

function GuardMessage({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action: ReactNode;
}) {
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-16">
      <PageMeta title={title} noindex />
      <Logo className="mb-12" />
      <EmptyState
        visual={<IconBadge size="xl">{icon}</IconBadge>}
        title={title}
        description={body}
        actions={action}
      />
    </main>
  );
}
