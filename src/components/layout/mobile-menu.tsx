import { Link } from 'react-router';
import type { SessionUser } from '@/api/types';
import { staggerIndex } from '@/components/motion/presets';
import { Button } from '@/components/ui/button';
import { Divider } from '@/components/ui/divider';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useUnreadMessages } from '@/features/messages/unread-count';
import { UnreadBadge } from '@/features/messages/unread-badge';
import { primaryNav, type NavLinkItem } from './site-nav';

interface MobileMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: SessionUser | null;
}

const linkClasses =
  'flex min-h-12 items-center rounded-control px-3 text-lg font-medium text-ink transition-colors duration-120 hover:bg-ink/5';

/**
 * The ☰ menu on phones and tablets (plan §12.6). Loaded on first use to keep the homepage light. The links
 * fade up one after another as the sheet slides in. Signed in, it adds the Guest dashboard's places, with the
 * unread count beside Messages, and, for anyone who has applied to host, Hosting in place of Become a host.
 */
export function MobileMenu({ open, onOpenChange, user }: MobileMenuProps) {
  const close = () => onOpenChange(false);
  const unread = useUnreadMessages(Boolean(user)).data ?? 0;
  const hosting = Boolean(user?.hostStatus);
  const main = hosting ? primaryNav.filter((item) => item.to !== '/become-a-host') : primaryNav;
  const account: NavLinkItem[] = user
    ? [
        { label: 'Trips', to: '/trips' },
        { label: 'Messages', to: '/messages' },
        { label: 'Saved cars', to: '/saved' },
        ...(hosting ? [{ label: 'Hosting', to: '/host' }] : []),
        { label: 'Notifications', to: '/notifications' },
        { label: 'Reviews', to: '/account/reviews' },
        { label: 'Account', to: '/account' },
      ]
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title="Menu" side="right">
        <nav aria-label="Main">
          <ul className="grid gap-1">
            {main.map((item, index) => (
              <li key={item.to} className="stagger-in" style={staggerIndex(index)}>
                <Link
                  to={item.to}
                  viewTransition={!item.to.includes('#')}
                  onClick={close}
                  className={linkClasses}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {user ? (
          <nav aria-label="Your account" className="stagger-in" style={staggerIndex(main.length)}>
            <Divider className="my-6" />
            <ul className="grid gap-1">
              {account.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} viewTransition onClick={close} className={linkClasses}>
                    {item.label}
                    {item.to === '/messages' && <UnreadBadge count={unread} className="ml-auto" />}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : (
          <div className="stagger-in" style={staggerIndex(main.length)}>
            <Divider className="my-6" />
            <div className="grid gap-3">
              <Button asChild size="lg" block>
                <Link to="/login" viewTransition onClick={close}>
                  Log in
                </Link>
              </Button>
              <Button asChild size="lg" block variant="secondary">
                <Link to="/signup" viewTransition onClick={close}>
                  Sign up
                </Link>
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
