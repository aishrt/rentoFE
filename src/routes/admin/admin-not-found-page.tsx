import { Link } from 'react-router';
import { PageMeta } from '@/components/layout/page-meta';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

export function AdminNotFoundPage() {
  return (
    <div className="flex justify-center py-16">
      <PageMeta title="Page not found · Staff portal" noindex />
      <EmptyState
        className="max-w-lg"
        eyebrow="Not found"
        title="This part of the portal doesn't exist yet"
        description="Sections appear in the menu as they go live."
        actions={
          <Button asChild>
            <Link to="/admin">Back to overview</Link>
          </Button>
        }
      />
    </div>
  );
}
