import { Outlet, ScrollRestoration, useNavigation } from 'react-router';
import { Toaster } from '@/components/ui/toast';

/** A thin blue bar while the next page's code loads. */
function NavigationProgress() {
  const navigation = useNavigation();
  if (navigation.state === 'idle') return null;
  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      className="fixed inset-x-0 top-0 z-60 h-0.5 origin-left animate-progress bg-primary"
    />
  );
}

export function RootLayout() {
  return (
    <>
      <NavigationProgress />
      <ScrollRestoration />
      <Outlet />
      <Toaster />
    </>
  );
}

export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-70 focus:rounded-control focus:bg-primary focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:text-white"
    >
      Skip to main content
    </a>
  );
}

/**
 * Shown while the app first loads. index.html's boot splash (the logo's car driving on the spot) covers it
 * until the router is ready, so this only holds the page's background.
 */
export function FullPageLoader() {
  return <div className="min-h-dvh bg-canvas" aria-busy="true" />;
}
