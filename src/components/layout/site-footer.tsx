import { Link } from 'react-router';
import { Logo } from '@/components/brand/logo';
import { Divider } from '@/components/ui/divider';
import { Container } from './container';
import { footerNav, socialLinks } from './site-nav';

const YEAR = new Date().getFullYear();

export function SiteFooter() {
  return (
    <footer className="bg-ink text-canvas/75">
      <Container className="grid gap-12 py-16 lg:grid-cols-[1.2fr_2fr] lg:py-20">
        <div className="max-w-xs">
          <Link to="/" aria-label="Rento Vroom home" className="inline-block rounded-control">
            <Logo tone="light" />
          </Link>
          <p className="mt-5 text-sm leading-relaxed">
            Rent a car from local owners across New Zealand, or share yours and earn when you're not using it.
          </p>
          {socialLinks.length > 0 && (
            <ul className="mt-6 flex gap-4" aria-label="Rento Vroom on social media">
              {socialLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    rel="noreferrer"
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
          {footerNav.map((group) => (
            <div key={group.title}>
              <h2 className="eyebrow text-gold">{group.title}</h2>
              <ul className="mt-4 grid gap-3">
                {group.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="link-underline text-sm transition-colors duration-120 hover:text-canvas"
                    >
                      {link.label}
                    </Link>
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
        <Link to="/admin/login" className="link-underline self-start hover:text-canvas sm:self-auto">
          Staff log-in
        </Link>
      </Container>
    </footer>
  );
}
