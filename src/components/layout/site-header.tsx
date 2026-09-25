import { Menu } from 'lucide-react';
import { Suspense, lazy, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/features/auth/use-session';
import { cn } from '@/lib/cn';
import { useScrolled } from '@/lib/use-scrolled';
import { Container } from './container';
import { primaryNav } from './site-nav';

// Both menus use Radix, so they load only when needed, keeping it off the homepage's first load (plan §12.5).
const loadMobileMenu = () => import('./mobile-menu');
const MobileMenu = lazy(() => loadMobileMenu().then((module) => ({ default: module.MobileMenu })));
const AccountMenu = lazy(() => import('./account-menu').then((module) => ({ default: module.AccountMenu })));

const accountPlaceholder = <Skeleton className="h-11 w-24 rounded-full" />;

function HeaderAccount() {
  const session = useSession();
  if (session.isPending) return accountPlaceholder;
  if (session.data) {
    return (
      <Suspense fallback={accountPlaceholder}>
        <AccountMenu user={session.data} />
      </Suspense>
    );
  }
  return (
    <Button variant="secondary" asChild>
      <Link to="/login" viewTransition>
        Log in
      </Link>
    </Button>
  );
}

export function SiteHeader() {
  const scrolled = useScrolled();
  const { pathname } = useLocation();
  const session = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuRequested, setMenuRequested] = useState(false);

  return (
    <header
      className={cn(
        // Named for view transitions, so the header holds still while the page below it cross-fades.
        'sticky top-0 z-40 border-b transition-[background-color,border-color] duration-200 [view-transition-name:site-header]',
        scrolled ? 'glass border-line/70' : 'border-transparent bg-canvas',
      )}
    >
      <Container className="flex h-16 items-center justify-between gap-6 lg:h-[4.5rem]">
        <Link to="/" viewTransition aria-label="Rento Vroom home" className="rounded-control">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-8">
            {primaryNav.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  viewTransition={!item.to.includes('#')}
                  aria-current={pathname === item.to ? 'page' : undefined}
                  className="link-underline text-ui font-medium text-ink/80 transition-colors duration-120 hover:text-ink"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <HeaderAccount />
          <IconButton
            label="Open menu"
            className="lg:hidden [&_svg]:size-6"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onPointerEnter={loadMobileMenu}
            onFocus={loadMobileMenu}
            onClick={() => {
              setMenuRequested(true);
              setMenuOpen(true);
            }}
          >
            <Menu aria-hidden="true" />
          </IconButton>
          {menuRequested && (
            <Suspense fallback={null}>
              <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} signedIn={Boolean(session.data)} />
            </Suspense>
          )}
        </div>
      </Container>
    </header>
  );
}
