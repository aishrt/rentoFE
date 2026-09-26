import { Logo } from '@/components/brand/logo';
import { PageMeta } from '@/components/layout/page-meta';
import { ErrorMessage } from './error-message';

/**
 * The last line of defence, for an error outside every page (the providers or the router itself). It sits
 * outside the router, so its links are plain anchors that load the site afresh.
 */
export function AppCrashScreen({ error }: { error: unknown }) {
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-16">
      <PageMeta title="Something went wrong" noindex />
      <a href="/" aria-label="Rento Vroom home" className="mb-12 rounded-control">
        <Logo />
      </a>
      <ErrorMessage error={error} homeLink={<a href="/">Go to the homepage</a>} />
    </main>
  );
}
