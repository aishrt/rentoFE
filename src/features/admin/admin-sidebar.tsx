import { ArrowUpRight } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { Logo } from '@/components/brand/logo';
import { staggerIndex } from '@/components/motion/presets';
import { Divider } from '@/components/ui/divider';
import { useSession } from '@/features/auth/use-session';
import { cn } from '@/lib/cn';
import { adminNav } from './admin-nav';

const tones = {
  dark: {
    root: 'bg-ink text-canvas/70',
    group: 'text-canvas/40',
    link: 'hover:bg-canvas/8 hover:text-canvas',
    active: 'bg-canvas/10 text-canvas',
    bar: 'before:bg-accent',
    eyebrow: 'text-accent',
    soon: 'text-canvas/35',
    chip: 'bg-canvas/8 text-canvas/50',
  },
  light: {
    root: 'bg-surface text-muted',
    group: 'text-muted/70',
    link: 'hover:bg-ink/5 hover:text-ink',
    active: 'bg-primary/8 text-primary',
    bar: 'before:bg-primary',
    eyebrow: 'text-primary',
    soon: 'text-muted/60',
    chip: 'bg-ink/5 text-muted',
  },
} as const;

/** The share of the list that fades out at the bottom while more links are below it (`mask-b-from-90%`). */
const FADE = 0.1;

/**
 * The list scrolls inside the full-height sidebar, as all the sections don't fit a laptop screen. On each page,
 * and again once the admin's own links show (they can push the current one down), it brings the current page's
 * link into view, clear of the fade, and marks the list while more links are below it.
 */
function useNavScroll(pathname: string, isAdmin: boolean) {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    // Only the list scrolls, at once (no smooth scroll): the page stays where it is.
    const link = nav.querySelector('[aria-current="page"]')?.getBoundingClientRect();
    if (link) {
      const box = nav.getBoundingClientRect();
      const clearBottom = box.bottom - box.height * FADE;
      if (link.top < box.top) nav.scrollTop -= box.top - link.top;
      else if (link.bottom > clearBottom) nav.scrollTop += link.bottom - clearBottom;
    }

    // Set on the element rather than in state, so scrolling doesn't re-render the links.
    const markEnd = () =>
      nav.toggleAttribute('data-more-end', nav.scrollTop + nav.clientHeight < nav.scrollHeight - 1);
    markEnd();
    nav.addEventListener('scroll', markEnd, { passive: true });
    // The list's height changes with the window; its groups' with the links the staff member can see.
    const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(markEnd);
    for (const element of [nav, ...nav.children]) resize?.observe(element);
    return () => {
      nav.removeEventListener('scroll', markEnd);
      resize?.disconnect();
    };
  }, [pathname, isAdmin]);

  return navRef;
}

interface AdminSidebarProps {
  tone?: keyof typeof tones;
  /** Called after following a link, so the mobile menu can close. */
  onNavigate?: () => void;
  showLogo?: boolean;
  /** Fade the groups up one after another as they appear, for the slide-in menu. */
  staggered?: boolean;
}

export function AdminSidebar({ tone = 'dark', onNavigate, showLogo = true, staggered }: AdminSidebarProps) {
  const t = tones[tone];
  const isAdmin = useSession().data?.roles.includes('ADMIN') ?? false;
  const navRef = useNavScroll(useLocation().pathname, isAdmin);

  return (
    <div className={cn('flex h-full flex-col', t.root)}>
      {showLogo && (
        <div className="px-6 pt-6 pb-4">
          <Link
            to="/admin"
            onClick={onNavigate}
            aria-label="Staff portal overview"
            className="rounded-control"
          >
            <Logo tone={tone === 'dark' ? 'light' : 'dark'} />
          </Link>
          <p className={cn('eyebrow mt-3', t.eyebrow)}>Staff portal</p>
        </div>
      )}

      <nav
        ref={navRef}
        aria-label="Staff portal"
        className="scrollbar-subtle min-h-0 flex-1 scroll-pb-16 overflow-y-auto px-3 pb-6 data-more-end:mask-b-from-90%"
      >
        {adminNav.map((group, groupIndex) => (
          <div
            key={group.title ?? groupIndex}
            className={cn('mt-4 first:mt-2', staggered && 'stagger-in')}
            style={staggered ? staggerIndex(groupIndex) : undefined}
          >
            {group.title && <p className={cn('eyebrow mb-1.5 px-3', t.group)}>{group.title}</p>}
            <ul className="grid gap-0.5">
              {group.items
                .filter((item) => isAdmin || !item.adminOnly)
                .map((item) => {
                  const Icon = item.icon;
                  const itemClasses =
                    'flex min-h-11 items-center gap-3 rounded-control px-3 text-sm font-medium';

                  if (!item.to) {
                    return (
                      <li key={item.label}>
                        <span aria-disabled="true" className={cn(itemClasses, 'cursor-default', t.soon)}>
                          <Icon aria-hidden="true" className="size-4.5" />
                          <span className="flex-1">{item.label}</span>
                          <span aria-hidden="true" className={cn('rounded-full px-2 py-0.5 text-xs', t.chip)}>
                            Soon
                          </span>
                          <span className="sr-only">(coming soon)</span>
                        </span>
                      </li>
                    );
                  }

                  return (
                    <li key={item.label}>
                      <NavLink
                        to={item.to}
                        // Overview matches only itself; other sections stay highlighted on their own pages.
                        end={item.to === '/admin'}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                          cn(
                            itemClasses,
                            'relative transition-colors duration-120',
                            isActive ? t.active : t.link,
                            // The accent bar grows in from its centre when an item becomes active.
                            isActive &&
                              'before:absolute before:inset-y-2.5 before:left-0 before:w-0.5 before:animate-bar-in before:rounded-full',
                            isActive && t.bar,
                          )
                        }
                      >
                        <Icon aria-hidden="true" className="size-4.5" />
                        {item.label}
                      </NavLink>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mx-3 pb-4">
        <Divider tone={tone} className="mb-2" />
        <Link
          to="/"
          onClick={onNavigate}
          className={cn(
            'flex min-h-11 items-center justify-between rounded-control px-3 text-sm transition-colors duration-120',
            t.link,
          )}
        >
          View website
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </div>
  );
}
