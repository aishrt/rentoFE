import { Outlet, ScrollRestoration, useNavigation } from 'react-router';
import { LogoMark } from '@/components/brand/logo';

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

/** Shown while the app first loads: the brand mark breathing softly instead of a spinner. */
export function FullPageLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas" aria-busy="true">
      <LogoMark className="size-12 animate-breathe" />
      <span className="sr-only">Loading Rento Vroom</span>
    </div>
  );
}
