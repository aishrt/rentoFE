import { ArrowLeft, Search } from 'lucide-react';
import { Link } from 'react-router';
import { RoadTripScene } from '@/components/brand/road-trip-scene';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { primaryNav } from '@/components/layout/site-nav';
import { staggerIndex } from '@/components/motion/presets';
import { Button } from '@/components/ui/button';

/** The 404 page: a night drive past a glowing 404, then the way back to the road. */
export function NotFoundPage() {
  return (
    <Container className="py-10 sm:py-14 lg:py-16">
      <PageMeta title="Page not found" noindex />

      <div className="mx-auto max-w-4xl">
        <RoadTripScene className="h-56 animate-fade-up rounded-sheet shadow-lift sm:h-72 lg:h-80" />

        <div className="mx-auto mt-10 flex max-w-xl flex-col items-center text-center sm:mt-12">
          <p className="eyebrow stagger-in text-primary" style={staggerIndex(1)}>
            Error 404 · Page not found
          </p>
          <h1 className="headline stagger-in mt-3 text-title-2 font-medium" style={staggerIndex(2)}>
            Looks like you took a wrong turn
          </h1>
          <p className="stagger-in mt-4 text-lg text-muted" style={staggerIndex(3)}>
            The page you're looking for has moved, or never existed. Let's get you back on the road.
          </p>

          <div className="stagger-in mt-8 flex flex-wrap justify-center gap-3" style={staggerIndex(4)}>
            <Button asChild size="lg">
              <Link to="/" viewTransition>
                <ArrowLeft aria-hidden="true" className="nudge-left" />
                Back to home
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/#search">
                <Search aria-hidden="true" />
                Find a car
              </Link>
            </Button>
          </div>

          <nav aria-label="Popular pages" className="stagger-in mt-10" style={staggerIndex(5)}>
            <p className="text-sm text-muted">Or head to</p>
            <ul className="mt-2 flex flex-wrap justify-center gap-x-6 gap-y-2">
              {primaryNav.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="link-underline text-sm font-medium text-ink/80 transition-colors duration-120 hover:text-ink"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </Container>
  );
}
