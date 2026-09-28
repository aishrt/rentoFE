import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { AuthLayout } from '@/components/layout/auth-layout';
import { PageMeta } from '@/components/layout/page-meta';
import { SignupForm } from '@/features/auth/signup-form';
import { useSession } from '@/features/auth/use-session';
import { safeRedirect } from '@/lib/safe-redirect';
import { seoPage } from '@/seo/pages';

export function SignupPage() {
  const [searchParams] = useSearchParams();
  const next = safeRedirect(searchParams.get('next'));
  const navigate = useNavigate();
  const session = useSession();
  // Set as this page starts creating the account (before the request is sent), so the new session
  // doesn't count as "already signed in" and the visitor goes on to the check-your-inbox page.
  const [signingUp, setSigningUp] = useState(false);

  if (session.data && !signingUp) return <Navigate to={next} replace />;

  const verifyPage = next === '/' ? '/verify-email' : `/verify-email?next=${encodeURIComponent(next)}`;

  return (
    <AuthLayout>
      <PageMeta page={seoPage('/signup')} />
      <h1 className="headline text-title-3 font-medium">Create your account</h1>
      <p className="mt-2 mb-8 text-muted">
        Book cars from local owners across New Zealand, or list your own.
      </p>

      <SignupForm
        onSubmitting={() => setSigningUp(true)}
        onSuccess={() => navigate(verifyPage, { replace: true, viewTransition: true })}
      />

      <p className="mt-8 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="link-underline font-medium text-primary">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
