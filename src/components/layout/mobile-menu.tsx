import { Link } from 'react-router';
import { staggerIndex } from '@/components/motion/presets';
import { Button } from '@/components/ui/button';
import { Divider } from '@/components/ui/divider';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { primaryNav } from './site-nav';

interface MobileMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signedIn: boolean;
}

/**
 * The ☰ menu on phones and tablets (plan §12.6). Loaded on first use to keep the homepage light. The links
 * fade up one after another as the sheet slides in.
 */
export function MobileMenu({ open, onOpenChange, signedIn }: MobileMenuProps) {
  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title="Menu" side="right">
        <nav aria-label="Main">
          <ul className="grid gap-1">
            {primaryNav.map((item, index) => (
              <li key={item.to} className="stagger-in" style={staggerIndex(index)}>
                <Link
                  to={item.to}
                  onClick={close}
                  className="flex min-h-12 items-center rounded-control px-3 text-lg font-medium text-ink transition-colors duration-120 hover:bg-ink/5"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {!signedIn && (
          <div className="stagger-in" style={staggerIndex(primaryNav.length)}>
            <Divider className="my-6" />
            <div className="grid gap-3">
              <Button asChild size="lg" block>
                <Link to="/login" onClick={close}>
                  Log in
                </Link>
              </Button>
              <Button asChild size="lg" block variant="secondary">
                <Link to="/signup" onClick={close}>
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
