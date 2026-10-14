import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { AppProviders } from '@/app/providers';
import { createRouter } from '@/app/router';
import { AppCrashScreen } from '@/components/errors/app-crash-screen';
import { ErrorBoundary } from '@/components/errors/error-boundary';
import { startMonitoring } from '@/lib/monitoring';
import '@/styles/globals.css';

void startMonitoring();
const router = createRouter();

/** Fades out index.html's boot splash once the router has the first page's code, or has failed to get it. */
function hideBootSplash() {
  const splash = document.getElementById('boot-splash');
  if (!splash) return;
  splash.classList.add('boot-splash-done');
  setTimeout(() => splash.remove(), 400);
}

if (router.state.initialized) {
  hideBootSplash();
} else {
  const unsubscribe = router.subscribe(({ initialized }) => {
    if (!initialized) return;
    unsubscribe();
    hideBootSplash();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Pages and layouts have route boundaries (router.tsx); this catches anything outside them. */}
    <ErrorBoundary fallback={({ error }) => <AppCrashScreen error={error} />}>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </ErrorBoundary>
  </StrictMode>,
);
