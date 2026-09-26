import { RotateCw, TriangleAlert, WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';
import { errorMessage, isChunkLoadError } from '@/lib/errors';

interface ErrorMessageProps {
  error: unknown;
  /**
   * The way out besides reloading, as a link element; it gets secondary button styles. Defaults to the
   * homepage. Outside the router, pass a plain <a>.
   */
  homeLink?: ReactNode;
}

/**
 * What a visitor sees when a page fails: a plain explanation, a reload button and a way home. A page whose
 * code didn't download gets its own message, since that is a connection problem that reloading fixes.
 * Development builds also show the error itself.
 */
export function ErrorMessage({ error, homeLink }: ErrorMessageProps) {
  const connection = isChunkLoadError(error);

  return (
    <EmptyState
      visual={<IconBadge size="xl">{connection ? <WifiOff /> : <TriangleAlert />}</IconBadge>}
      title={connection ? "We couldn't load this page" : 'Something went wrong'}
      description={
        connection
          ? "Your connection may have dropped while the page was loading. Check you're online, then reload."
          : "This page didn't load properly. Reloading usually fixes it; if it doesn't, please try again in a few minutes."
      }
      actions={
        <>
          <Button onClick={() => window.location.reload()}>
            <RotateCw aria-hidden="true" />
            Reload page
          </Button>
          <Button variant="secondary" asChild>
            {homeLink ?? <Link to="/">Go to the homepage</Link>}
          </Button>
        </>
      }
    >
      {import.meta.env.DEV && (
        <details className="mt-8 w-full text-left text-sm">
          <summary className="cursor-pointer text-muted">Details for developers</summary>
          <pre className="mt-2 overflow-x-auto rounded-control bg-ink/5 p-3 text-xs whitespace-pre-wrap text-ink/80">
            {errorMessage(error)}
          </pre>
        </details>
      )}
    </EmptyState>
  );
}
