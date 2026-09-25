import { Outlet, ScrollRestoration, useNavigation } from 'react-router';

/** A thin gold bar while the next page's code loads. */
function NavigationProgress() {
  const navigation = useNavigation();
  if (navigation.state === 'idle') return null;
  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left animate-progress bg-gold"
    />
  );
}

export function RootLayout() {
  return (
    <>
      <NavigationProgress />
      <ScrollRestoration />
      <Outlet />
    </>
  );
}

export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-control focus:bg-primary focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:text-white"
    >
      Skip to main content
    </a>
  );
}

export function FullPageLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas" aria-busy="true">
      <span
        className="size-10 animate-spin rounded-full border-2 border-primary/15 border-t-primary"
        aria-hidden="true"
      />
      <span className="sr-only">Loading Rento Vroom</span>
    </div>
  );
}
