import { Link } from 'react-router';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

export function NotFoundPage() {
  return (
    <Container className="flex min-h-[70vh] flex-col items-center justify-center py-20">
      <PageMeta title="Page not found" noindex />
      <EmptyState
        visual={<p className="headline gradient-text text-7xl font-medium text-primary">404</p>}
        title="This road doesn't go anywhere"
        description="The page you're looking for has moved, or never existed."
        actions={
          <Button asChild>
            <Link to="/" viewTransition>
              Back to home
            </Link>
          </Button>
        }
      />
    </Container>
  );
}
