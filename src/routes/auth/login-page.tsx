import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { AuthLayout } from '@/components/layout/auth-layout';
import { PageMeta } from '@/components/layout/page-meta';
import { LoginForm } from '@/features/auth/login-form';
import { useSession } from '@/features/auth/use-session';
import { safeRedirect } from '@/lib/safe-redirect';

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const next = safeRedirect(searchParams.get('next'));
  const navigate = useNavigate();
  const session = useSession();

  if (session.data) return <Navigate to={next} replace />;

  return (
    <AuthLayout>
      <PageMeta
        title="Log in"
        description="Log in to Rento Vroom to manage your trips and bookings."
        noindex
      />
      <h1 className="headline text-title-3 font-medium">Welcome back</h1>
      <p className="mt-2 mb-8 text-muted">Log in to manage your trips, bookings and saved cars.</p>

      <LoginForm onSuccess={() => navigate(next, { replace: true, viewTransition: true })} />

      <p className="mt-8 text-center text-sm text-muted">
        New to Rento Vroom?{' '}
        <Link to="/signup" className="link-underline font-medium text-primary">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
