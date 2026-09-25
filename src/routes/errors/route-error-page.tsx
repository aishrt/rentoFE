import { RotateCw } from 'lucide-react';
import { Link, isRouteErrorResponse, useRouteError } from 'react-router';
import { Logo } from '@/components/brand/logo';
import { PageMeta } from '@/components/layout/page-meta';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { NotFoundPage } from './not-found-page';

/** Shown when a page fails to load or throws, e.g. an old code chunk after a new release. */
export function RouteErrorPage() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <main id="main" className="min-h-dvh bg-canvas">
        <NotFoundPage />
      </main>
    );
  }

  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-16">
      <PageMeta title="Something went wrong" noindex />
      <Link to="/" aria-label="Rento Vroom home" className="mb-12 rounded-control">
        <Logo />
      </Link>
      <EmptyState
        title="Something went wrong"
        description="This page didn't load properly. Reloading usually fixes it; if it doesn't, please try again in a few minutes."
        actions={
          <>
            <Button onClick={() => window.location.reload()}>
              <RotateCw aria-hidden="true" />
              Reload page
            </Button>
            <Button variant="secondary" asChild>
              <Link to="/">Go to the homepage</Link>
            </Button>
          </>
        }
      />
    </main>
  );
}
