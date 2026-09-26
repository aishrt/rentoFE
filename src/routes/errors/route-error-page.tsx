import { Suspense, lazy } from 'react';
import { Link, isRouteErrorResponse, useRouteError } from 'react-router';
import { Logo } from '@/components/brand/logo';
import { ErrorBoundary } from '@/components/errors/error-boundary';
import { ErrorMessage } from '@/components/errors/error-message';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';

// The animated 404 is a chunk of its own, so these error pages, which every page loads, stay small.
const NotFoundPage = lazy(() =>
  import('./not-found-page').then((module) => ({ default: module.NotFoundPage })),
);

const isNotFound = (error: unknown) => isRouteErrorResponse(error) && error.status === 404;

/** A 404 thrown by a page, shown as the not-found page (or the plain message if that can't load). */
function NotFoundResponse({ error }: { error: unknown }) {
  return (
    <ErrorBoundary fallback={<ErrorMessage error={error} />}>
      <Suspense fallback={null}>
        <NotFoundPage />
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * The outermost route boundary. It stands alone, without the site header, because what failed may be the
 * header or a layout itself, or a page outside the layouts such as log-in.
 */
export function RouteErrorPage() {
  const error = useRouteError();

  if (isNotFound(error)) {
    return (
      <main id="main" className="min-h-dvh bg-canvas">
        <NotFoundResponse error={error} />
      </main>
    );
  }

  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-16">
      <PageMeta title="Something went wrong" noindex />
      <Link to="/" aria-label="Rento Vroom home" className="mb-12 rounded-control">
        <Logo />
      </Link>
      <ErrorMessage error={error} />
    </main>
  );
}

/** For a public page that fails: the message takes the page's place, and the header and footer stay. */
export function PageError() {
  const error = useRouteError();
  if (isNotFound(error)) return <NotFoundResponse error={error} />;

  return (
    <Container className="flex min-h-[70vh] flex-col items-center justify-center py-20">
      <PageMeta title="Something went wrong" noindex />
      <ErrorMessage error={error} />
    </Container>
  );
}
