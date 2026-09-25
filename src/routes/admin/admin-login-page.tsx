import { LockKeyhole } from 'lucide-react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { AuthLayout } from '@/components/layout/auth-layout';
import { PageMeta } from '@/components/layout/page-meta';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { LoginForm } from '@/features/auth/login-form';
import { isStaff } from '@/features/auth/roles';
import { useSession } from '@/features/auth/use-session';
import { safeRedirect } from '@/lib/safe-redirect';

export function AdminLoginPage() {
  const [searchParams] = useSearchParams();
  const next = safeRedirect(searchParams.get('next'), '/admin');
  const destination = next.startsWith('/admin') ? next : '/admin';
  const navigate = useNavigate();
  const session = useSession();

  if (isStaff(session.data)) return <Navigate to={destination} replace />;

  return (
    <AuthLayout variant="staff">
      <PageMeta title="Staff log-in" noindex />
      <Badge variant="primary" className="mb-5">
        <LockKeyhole aria-hidden="true" />
        Staff portal
      </Badge>
      <h1 className="headline text-title-3 font-medium">Staff log-in</h1>
      <p className="mt-2 mb-8 text-muted">For Rento Vroom administrators and the support team.</p>

      {session.data && (
        <Alert className="mb-6" title={`You're logged in as ${session.data.email}`}>
          That account can't open the staff portal. Log in with a staff account to continue.
        </Alert>
      )}

      <LoginForm
        portal="admin"
        submitLabel="Log in to the staff portal"
        onSuccess={() => navigate(destination, { replace: true, viewTransition: true })}
      />
    </AuthLayout>
  );
}
