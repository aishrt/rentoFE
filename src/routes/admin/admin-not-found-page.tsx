import { Link } from 'react-router';
import { PageMeta } from '@/components/layout/page-meta';
import { Button } from '@/components/ui/button';

export function AdminNotFoundPage() {
  return (
    <div className="mx-auto flex max-w-lg animate-fade-up flex-col items-center py-16 text-center">
      <PageMeta title="Page not found · Staff portal" noindex />
      <p className="eyebrow text-gold-text">Not found</p>
      <h1 className="headline mt-3 text-title-3 font-medium">This part of the portal doesn't exist yet</h1>
      <p className="mt-3 text-muted">Sections appear in the menu as they go live.</p>
      <Button asChild className="mt-8">
        <Link to="/admin">Back to overview</Link>
      </Button>
    </div>
  );
}
