import { Lock } from 'lucide-react';
import { Link } from 'react-router';
import { PageMeta } from '@/components/layout/page-meta';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';

/**
 * In place of an administrator's page when a support team member opens it, by a link or its address
 * (plan §6.2: no fee settings, content or staff management for support). The API refuses them its data
 * anyway, so this says why rather than showing a page of errors.
 */
export function AdminOnlyNotice({ title }: { title: string }) {
  return (
    <div className="flex justify-center py-16">
      <PageMeta title={`${title} · Staff portal`} noindex />
      <EmptyState
        visual={
          <IconBadge size="xl" tone="muted">
            <Lock />
          </IconBadge>
        }
        eyebrow={title}
        title="This page is for the administrator"
        description="Rento Vroom’s administrator looks after it. Ask them if you need something here changed or checked."
        actions={
          <Button asChild>
            <Link to="/admin">Back to overview</Link>
          </Button>
        }
      />
    </div>
  );
}
