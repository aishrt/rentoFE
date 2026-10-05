import { Outlet } from 'react-router';
import { SkipLink } from './root-layout';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <SiteHeader />
      {/* Positioned so a page's PageBackdrop can span the full width behind its top. */}
      <main id="main" className="relative isolate flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
