import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { AppProviders } from '@/app/providers';
import { createRouter } from '@/app/router';
import { AppCrashScreen } from '@/components/errors/app-crash-screen';
import { ErrorBoundary } from '@/components/errors/error-boundary';
import '@/styles/globals.css';

const router = createRouter();

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
