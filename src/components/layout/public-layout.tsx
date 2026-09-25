import { Outlet } from 'react-router';
import { SkipLink } from './root-layout';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <SiteHeader />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
