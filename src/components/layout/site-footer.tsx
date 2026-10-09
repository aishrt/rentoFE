import { Link } from 'react-router';
import type { SiteFooter as FooterContent } from '@/api/types';
import { Logo } from '@/components/brand/logo';
import { Divider } from '@/components/ui/divider';
import { useSiteFooter } from '@/features/content/site-content';
import { Container } from './container';
import { footerNav, socialLinks } from './site-nav';

const YEAR = new Date().getFullYear();

/** The footer's links at launch, shown until an admin's own load, or if they can't (plan §12.6). */
const ORIGINAL: FooterContent = {
  groups: footerNav.map(({ title, links }) => ({
    title,
    links: links.map(({ label, to }) => ({ label, href: to })),
  })),
  socialLinks,
};

const linkClasses = 'link-underline text-sm transition-colors duration-120 hover:text-canvas';

/** A page on this website opens in place; another website in a new tab. */
function FooterLink({ label, href }: { label: string; href: string }) {
  if (href.startsWith('/')) {
    return (
      <Link to={href} viewTransition={!href.includes('#')} className={linkClasses}>
        {label}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClasses}>
      {label}
    </a>
  );
}

export function SiteFooter() {
  const { groups, socialLinks: social } = useSiteFooter().data ?? ORIGINAL;
  return (
    <footer className="bg-ink text-canvas/75 print:hidden">
      <Container className="grid gap-12 py-16 lg:grid-cols-[1.2fr_2fr] lg:py-20">
        <div className="max-w-xs">
          <Link to="/" viewTransition aria-label="Rento Vroom home" className="inline-block rounded-control">
            <Logo tone="light" />
          </Link>
          <p className="mt-5 text-sm leading-relaxed">
            Rent a car from local owners across New Zealand, or share yours and earn when you're not using it.
          </p>
          {social.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-4" aria-label="Rento Vroom on social media">
              {social.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="link-underline text-sm hover:text-canvas"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {/* A group with no links is left out. */}
          {groups
            .filter((group) => group.links.length > 0)
            .map((group, index) => (
              <div key={`${index}-${group.title}`}>
                <h2 className="eyebrow text-accent">{group.title}</h2>
                <ul className="mt-4 grid gap-3">
                  {group.links.map((link) => (
                    <li key={`${link.label}-${link.href}`}>
                      <FooterLink {...link} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </nav>
      </Container>

      <Divider tone="dark" />
      <Container className="flex flex-col gap-3 py-6 text-xs sm:flex-row sm:items-center sm:justify-between">
        <p>© {YEAR} Rento Vroom. All prices in NZD.</p>
        <Link
          to="/admin/login"
          viewTransition
          className="link-underline self-start hover:text-canvas sm:self-auto"
        >
          Staff log-in
        </Link>
      </Container>
    </footer>
  );
}
