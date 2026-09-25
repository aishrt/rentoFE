import { Link } from 'react-router';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <Container className="flex min-h-[70vh] max-w-xl animate-fade-up flex-col items-center justify-center py-20 text-center">
      <PageMeta title="Page not found" noindex />
      <p className="headline text-7xl font-medium text-gold-text">404</p>
      <h1 className="headline mt-4 text-3xl font-medium sm:text-4xl">This road doesn't go anywhere</h1>
      <p className="mt-3 text-muted">The page you're looking for has moved, or never existed.</p>
      <Button asChild className="mt-10">
        <Link to="/" viewTransition>
          Back to home
        </Link>
      </Button>
    </Container>
  );
}
